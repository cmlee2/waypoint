'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import exifr from 'exifr';
import { Camera, X, MapPin, Calendar, Loader2, Image as ImageIcon } from 'lucide-react';
import LeafletLocationPickerModal from './LeafletLocationPickerModal';
import GooglePhotosPicker from '@/components/GooglePhotosPicker';
import { compressImage, formatFileSize } from '@/utils/imageCompression';
import { GooglePhoto, createGooglePhotosClient } from '@/utils/google/photos';

interface PhotoPreview {
  file: File;
  preview: string;
  lat?: number;
  lng?: number;
  locationName?: string;
  takenAt?: Date;
  caption: string;
  status: 'pending' | 'processing' | 'uploading' | 'success' | 'error';
}

interface PhotoUploaderProps {
  onChange: (photos: PhotoPreview[]) => void;
  autoOpen?: boolean;
  onSubmit?: () => void;
  submitDisabled?: boolean;
  isSubmitting?: boolean;
  submitLabel?: string;
}

export default function PhotoUploader({
  onChange,
  autoOpen = false,
  onSubmit,
  submitDisabled = false,
  isSubmitting = false,
  submitLabel = 'Save Memories to Trip',
}: PhotoUploaderProps) {
  const [photos, setPhotos] = useState<PhotoPreview[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [hasAutoOpened, setHasAutoOpened] = useState(false);
  const [locationPickerIndex, setLocationPickerIndex] = useState<number | null>(null);
  const [googlePhotosOpen, setGooglePhotosOpen] = useState(false);
  const [googleAccessToken, setGoogleAccessToken] = useState<string | null>(null);
  const [isImportingFromGoogle, setIsImportingFromGoogle] = useState(false);
  const [hasCheckedForToken, setHasCheckedForToken] = useState(false);

  // Extract Google token from URL on mount (only once)
  useEffect(() => {
    if (hasCheckedForToken) return;

    const params = new URLSearchParams(window.location.search);
    const token = params.get('google_token');
    if (token) {
      console.log('Google Photos token found in URL:', token.substring(0, 20) + '...');
      setGoogleAccessToken(token);
      setGooglePhotosOpen(true);

      // Clean up URL
      const url = new URL(window.location.href);
      url.searchParams.delete('google_token');
      window.history.replaceState({}, '', url.toString());
    }

    setHasCheckedForToken(true);
  }, [hasCheckedForToken]);

  const extractMetadata = useCallback(async (file: File) => {
    console.log(`📸 Extracting metadata from ${file.name} (${formatFileSize(file.size)})...`);

    try {
      // Try multiple extraction methods with different configurations
      const metadata = await exifr.parse(file, {
        // Try to get ALL tags, not just specific ones
        pick: [
          'latitude', 'longitude', 'GPSLatitude', 'GPSLongitude',
          'GPSLatitudeRef', 'GPSLongitudeRef',
          'DateTimeOriginal', 'DateTimeDigitized', 'CreateDate', 'ModifyDate'
        ],
        translateValues: false,
        sanitize: false,
        // Try to read all EXIF data
        tiff: true,
        ifd0: {},
        ifd1: true,
        exif: true,
        gps: true,
        interop: true
      });

      console.log(`✅ EXIF data for ${file.name}:`, {
        hasLatitude: typeof metadata?.latitude === 'number',
        hasLongitude: typeof metadata?.longitude === 'number',
        hasGPSLatitude: typeof metadata?.GPSLatitude === 'number',
        hasGPSLongitude: typeof metadata?.GPSLongitude === 'number',
        latitude: metadata?.latitude,
        longitude: metadata?.longitude,
        GPSLatitude: metadata?.GPSLatitude,
        GPSLongitude: metadata?.GPSLongitude,
        GPSLatitudeRef: metadata?.GPSLatitudeRef,
        GPSLongitudeRef: metadata?.GPSLongitudeRef,
        hasDateTimeOriginal: !!metadata?.DateTimeOriginal,
        dateTimeOriginal: metadata?.DateTimeOriginal,
        rawMetadata: metadata
      });

      // Try multiple ways to get GPS coordinates
      let lat: number | undefined;
      let lng: number | undefined;

      // Method 1: Direct latitude/longitude
      if (typeof metadata?.latitude === 'number' && typeof metadata?.longitude === 'number') {
        lat = metadata.latitude;
        lng = metadata.longitude;
      }
      // Method 2: GPSLatitude/GPSLongitude (common in many cameras)
      else if (typeof metadata?.GPSLatitude === 'number' && typeof metadata?.GPSLongitude === 'number') {
        lat = metadata.GPSLatitude;
        lng = metadata.GPSLongitude;
      }
      // Method 3: Try to parse GPS coordinates from raw data
      else if (metadata?.GPSLatitude && metadata?.GPSLongitude) {
        try {
          // Some cameras store GPS as arrays or objects
          const gpsLat = metadata.GPSLatitude;
          const gpsLng = metadata.GPSLongitude;
          const latRef = metadata.GPSLatitudeRef || 'N';
          const lngRef = metadata.GPSLongitudeRef || 'E';

          // Handle different GPS coordinate formats
          if (Array.isArray(gpsLat) && Array.isArray(gpsLng)) {
            // Convert from degrees/minutes/seconds format
            lat = gpsLat[0] + gpsLat[1]/60 + gpsLat[2]/3600;
            lng = gpsLng[0] + gpsLng[1]/60 + gpsLng[2]/3600;

            // Apply direction references
            if (latRef === 'S') lat = -lat;
            if (lngRef === 'W') lng = -lng;
          } else if (typeof gpsLat === 'number' && typeof gpsLng === 'number') {
            lat = gpsLat;
            lng = gpsLng;

            // Apply direction references
            if (latRef === 'S') lat = -lat;
            if (lngRef === 'W') lng = -lng;
          }
        } catch (e) {
          console.warn('Failed to parse GPS coordinates:', e);
        }
      }

      const takenAt =
        metadata?.DateTimeOriginal ??
        metadata?.DateTimeDigitized ??
        metadata?.CreateDate ??
        metadata?.ModifyDate ??
        (file.lastModified ? new Date(file.lastModified) : undefined);

      const result = {
        lat,
        lng,
        takenAt: takenAt instanceof Date && !Number.isNaN(takenAt.getTime()) ? takenAt : undefined,
      };

      console.log(`📍 GPS result for ${file.name}:`, {
        hasGPS: result.lat !== undefined && result.lng !== undefined,
        lat: result.lat,
        lng: result.lng,
        extractionMethod: result.lat ? 'GPS data found' : 'No GPS data'
      });

      return result;
    } catch (error) {
      console.error(`❌ Failed to extract metadata from ${file.name}:`, error);
      return {
        lat: undefined,
        lng: undefined,
        takenAt: file.lastModified ? new Date(file.lastModified) : undefined,
      };
    }
  }, []);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    setIsProcessing(true);

    try {
      const remainingSlots = Math.max(0, 15 - photos.length);
      const filesToProcess = acceptedFiles.slice(0, remainingSlots);

      const newPhotos: PhotoPreview[] = await Promise.all(
        filesToProcess.map(async (file) => {
          try {
            console.log(`🔄 Processing ${file.name}...`);

            const { lat, lng, takenAt } = await extractMetadata(file);

            // Compress image first to prevent 413 errors
            const compressed = await compressImage(file, {
              maxWidth: 1600,
              maxHeight: 1600,
              quality: 0.8,
              format: 'image/jpeg'
            });

            console.log(`✅ Compressed ${file.name}: ${formatFileSize(file.size)} → ${formatFileSize(compressed.size)}`);
            console.log(`📍 GPS preserved: ${lat !== undefined && lng !== undefined ? 'YES' : 'NO'}`);

            return {
              file: compressed.file,
              preview: URL.createObjectURL(compressed.file),
              lat,
              lng,
              takenAt,
              caption: '',
              status: 'pending'
            };
          } catch (err) {
            console.warn('Could not process photo:', file.name, err);

            let fallbackTakenAt: Date | undefined;
            let fallbackLat: number | undefined;
            let fallbackLng: number | undefined;

            try {
              const metadata = await extractMetadata(file);
              fallbackTakenAt = metadata.takenAt;
              fallbackLat = metadata.lat;
              fallbackLng = metadata.lng;
            } catch (metadataError) {
              console.warn('Could not extract EXIF data for fallback file:', file.name, metadataError);
            }

            // Fallback: use original file if compression fails
            return {
              file,
              preview: URL.createObjectURL(file),
              lat: fallbackLat,
              lng: fallbackLng,
              takenAt: fallbackTakenAt ?? (file.lastModified ? new Date(file.lastModified) : undefined),
              caption: '',
              status: 'pending'
            };
          }
        })
      );

      const updatedPhotos = [...photos, ...newPhotos];
      setPhotos(updatedPhotos);
      onChange(updatedPhotos);
    } catch (error) {
      console.error("Photo processing failed:", error);
      alert("Some photos could not be processed. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  }, [extractMetadata, photos, onChange]);

  const removePhoto = (index: number) => {
    setPhotos((prev) => {
      const newPhotos = [...prev];
      URL.revokeObjectURL(newPhotos[index].preview);
      newPhotos.splice(index, 1);
      onChange(newPhotos);
      return newPhotos;
    });
    setLocationPickerIndex((current) => {
      if (current === null) return current;
      if (current === index) return null;
      return current > index ? current - 1 : current;
    });
  };

  const updateCaption = (index: number, caption: string) => {
    setPhotos((prev) => {
      const newPhotos = [...prev];
      newPhotos[index].caption = caption;
      onChange(newPhotos);
      return newPhotos;
    });
  };

  const updateLocation = (index: number, lat: number, lng: number, locationName?: string) => {
    setPhotos((prev) => {
      const newPhotos = [...prev];
      newPhotos[index].lat = lat;
      newPhotos[index].lng = lng;
      newPhotos[index].locationName = locationName;
      onChange(newPhotos);
      return newPhotos;
    });
  };

  const handleGooglePhotosImport = async (selectedPhotos: GooglePhoto[]) => {
    setIsImportingFromGoogle(true);

    try {
      const { client, rateLimiter } = createGooglePhotosClient(googleAccessToken || '');

      const newPhotos: PhotoPreview[] = await Promise.all(
        selectedPhotos.map(async (googlePhoto) => {
          try {
            const uploadData = await rateLimiter.execute(() =>
              client.convertToUploadFormat(googlePhoto)
            );

            // Convert Blob to File
            const file = new File([uploadData.file], uploadData.filename, {
              type: uploadData.file.type || 'image/jpeg',
            });

            return {
              file,
              preview: URL.createObjectURL(file),
              lat: uploadData.lat,
              lng: uploadData.lng,
              takenAt: uploadData.takenAt,
              caption: '',
              status: 'pending' as const,
            };
          } catch (error) {
            console.error('Failed to process Google Photo:', googlePhoto.id, error);
            throw error;
          }
        })
      );

      const updatedPhotos = [...photos, ...newPhotos];
      setPhotos(updatedPhotos);
      onChange(updatedPhotos);
    } catch (error) {
      console.error('Google Photos import failed:', error);
      alert('Failed to import photos from Google Photos. Please try again.');
    } finally {
      setIsImportingFromGoogle(false);
    }
  };

  const handleGoogleAuth = () => {
    // Use current page redirect instead of popup to avoid Cross-Origin-Opener-Policy issues
    const returnUrl = window.location.pathname + window.location.search;
    const authUrl = `/api/google/oauth?action=authorize&returnUrl=${encodeURIComponent(returnUrl)}`;

    // Redirect to OAuth flow instead of using popup
    window.location.href = authUrl;
  };

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop,
    accept: { 'image/*': [] },
    maxFiles: 15,
  });

  useEffect(() => {
    if (!autoOpen || hasAutoOpened) return;

    setHasAutoOpened(true);
    open();
  }, [autoOpen, hasAutoOpened, open]);

  const hasCoordinates = (photo: PhotoPreview) =>
    Number.isFinite(photo.lat) && Number.isFinite(photo.lng);

  const getGPSStatus = (photo: PhotoPreview) => {
    if (hasCoordinates(photo)) {
      return {
        hasGPS: true,
        message: `GPS: ${photo.lat?.toFixed(4)}, ${photo.lng?.toFixed(4)}`
      };
    } else {
      return {
        hasGPS: false,
        message: 'No GPS data found in photo'
      };
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-8 p-6">
      {/* Dropzone */}
      <div
        {...getRootProps()}
        className={`
          border-2 border-dashed rounded-3xl p-12 transition-all cursor-pointer
          flex flex-col items-center justify-center text-center space-y-4
          ${isDragActive ? 'border-stone-400 bg-stone-100' : 'border-stone-200 bg-white hover:border-stone-300'}
        `}
      >
        <input {...getInputProps()} />
        <div className="w-16 h-16 bg-stone-100 rounded-full flex items-center justify-center text-stone-400">
          <Camera size={32} />
        </div>
        <div>
          <p className="text-xl font-medium text-stone-900">Drop your trip photos here</p>
          <p className="text-stone-500 mt-1">We'll automatically plot them on your map</p>
        </div>
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            open();
          }}
          className="rounded-full border border-stone-300 bg-white px-5 py-2 text-sm font-medium text-stone-700 transition-colors hover:border-stone-400 hover:bg-stone-50"
        >
          Browse Photos
        </button>
        <p className="text-xs text-stone-400 uppercase tracking-widest font-bold">Max 15 photos per trip</p>
      </div>

      {/* Google Photos Import - DISABLED FOR NOW */}
      <div className="flex items-center justify-center gap-4">
        <div className="h-px flex-1 bg-stone-200" />
        <span className="text-sm text-stone-400">or</span>
        <div className="h-px flex-1 bg-stone-200" />
      </div>

      <button
        type="button"
        onClick={handleGoogleAuth}
        disabled={isImportingFromGoogle}
        className="w-full rounded-2xl border-2 border-stone-200 bg-white p-6 transition-all hover:border-stone-300 hover:bg-stone-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
      >
        {isImportingFromGoogle ? (
          <>
            <Loader2 size={24} className="animate-spin text-stone-400" />
            <span className="text-stone-600">Importing from Google Photos...</span>
          </>
        ) : (
          <>
            <ImageIcon size={24} className="text-stone-400" />
            <span className="text-stone-700 font-medium">Import from Google Photos</span>
          </>
        )}
      </button>

      {/* Photo List */}
      {photos.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {photos.map((photo, index) => (
            <div key={index} className="bg-white rounded-2xl border border-stone-200 overflow-hidden flex shadow-sm group">
              {/* Image Preview */}
              <div className="w-1/3 relative aspect-square bg-stone-100">
                <img
                  src={photo.preview}
                  alt="Preview"
                  className="w-full h-full object-cover"
                />
                <button
                  type="button"
                  onClick={() => removePhoto(index)}
                  className="absolute top-2 left-2 p-1 bg-white/90 rounded-full text-stone-900 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X size={14} />
                </button>
              </div>

              {/* Details & Caption */}
              <div className="flex-1 p-4 flex flex-col justify-between space-y-3">
                <div className="space-y-2">
                  {/* Location Editing */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-4 text-xs font-medium text-stone-400 uppercase tracking-wider">
                        <span className="flex items-center gap-1">
                          <MapPin size={12} className={hasCoordinates(photo) ? 'text-green-500' : 'text-stone-300'} />
                          {hasCoordinates(photo) ? (
                            <span className="text-stone-600">
                              {photo.locationName || `${photo.lat?.toFixed(4)}, ${photo.lng?.toFixed(4)}`}
                            </span>
                          ) : (
                            <span className="text-amber-600" title="No GPS data found in photo - you may need to export from Photos app with location info preserved">
                              No GPS Data
                            </span>
                          )}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setLocationPickerIndex(index)}
                        className="text-xs text-blue-600 hover:text-blue-700"
                      >
                        {hasCoordinates(photo) ? 'Edit' : 'Add Location'}
                      </button>
                    </div>
                  </div>

                  {/* Date display */}
                  <div className="flex items-center gap-1 text-xs font-medium text-stone-400 uppercase tracking-wider">
                    <Calendar size={12} className={photo.takenAt ? 'text-blue-500' : 'text-stone-300'} />
                    {photo.takenAt ? photo.takenAt.toLocaleDateString() : 'No Date'}
                  </div>

                  {/* Caption */}
                  <textarea
                    placeholder="Add a caption..."
                    value={photo.caption}
                    onChange={(e) => updateCaption(index, e.target.value)}
                    className="w-full text-sm border-none focus:ring-0 p-0 resize-none text-stone-700 placeholder:text-stone-300 h-12"
                    disabled={isProcessing}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Actions */}
      {photos.length > 0 && !isProcessing && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="button"
            onClick={open}
            className="rounded-full border border-stone-300 bg-white px-6 py-3 text-sm font-medium text-stone-700 transition-colors hover:border-stone-400 hover:bg-stone-50"
          >
            Add More Photos
          </button>
          <button
            type="button"
            onClick={onSubmit}
            disabled={isSubmitting || submitDisabled || !onSubmit}
            className="bg-stone-900 text-white px-8 py-3 rounded-full font-medium hover:bg-stone-800 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isSubmitting && <Loader2 size={18} className="animate-spin" />}
            {submitLabel}
          </button>
        </div>
      )}

      {/* Processing State */}
      {photos.length > 0 && isProcessing && (
        <div className="flex items-center justify-center py-4">
          <p className="text-stone-500 text-sm">
            <Loader2 size={14} className="inline mr-2 animate-spin" />
            Processing photos...
          </p>
        </div>
      )}

      <LeafletLocationPickerModal
        isOpen={locationPickerIndex !== null}
        onClose={() => setLocationPickerIndex(null)}
        initialLat={locationPickerIndex !== null ? photos[locationPickerIndex]?.lat : undefined}
        initialLng={locationPickerIndex !== null ? photos[locationPickerIndex]?.lng : undefined}
        onLocationSelect={(lat, lng, placeName) => {
          if (locationPickerIndex === null) return;
          updateLocation(locationPickerIndex, lat, lng, placeName);
          setLocationPickerIndex(null);
        }}
      />

      {/* Google Photos Picker */}
      <GooglePhotosPicker
        isOpen={googlePhotosOpen}
        onClose={() => setGooglePhotosOpen(false)}
        onPhotosSelected={handleGooglePhotosImport}
        accessToken={googleAccessToken || ''}
        maxPhotos={15 - photos.length}
      />
    </div>
  );
}
