'use client';

import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import exifr from 'exifr';
import { Camera, X, MapPin, Calendar, Loader2 } from 'lucide-react';

interface PhotoPreview {
  file: File;
  preview: string;
  lat?: number;
  lng?: number;
  takenAt?: Date;
  caption: string;
  status: 'pending' | 'processing' | 'uploading' | 'success' | 'error';
}

export default function PhotoUploader() {
  const [photos, setPhotos] = useState<PhotoPreview[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    setIsProcessing(true);
    
    const newPhotos: PhotoPreview[] = await Promise.all(
      acceptedFiles.map(async (file) => {
        let lat, lng, takenAt;
        
        try {
          // Extract EXIF data
          const exif = await exifr.gps(file);
          const date = await exifr.parse(file, ['DateTimeOriginal']);
          
          lat = exif?.latitude;
          lng = exif?.longitude;
          takenAt = date?.DateTimeOriginal;
        } catch (err) {
          console.warn('Could not extract EXIF data for:', file.name);
        }

        return {
          file,
          preview: URL.createObjectURL(file),
          lat,
          lng,
          takenAt,
          caption: '',
          status: 'pending'
        };
      })
    );

    setPhotos((prev) => [...prev, ...newPhotos]);
    setIsProcessing(false);
  }, []);

  const removePhoto = (index: number) => {
    setPhotos((prev) => {
      const newPhotos = [...prev];
      URL.revokeObjectURL(newPhotos[index].preview);
      newPhotos.splice(index, 1);
      return newPhotos;
    });
  };

  const updateCaption = (index: number, caption: string) => {
    setPhotos((prev) => {
      const newPhotos = [...prev];
      newPhotos[index].caption = caption;
      return newPhotos;
    });
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': [] },
    maxFiles: 15
  });

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
        <p className="text-xs text-stone-400 uppercase tracking-widest font-bold">Max 15 photos per trip</p>
      </div>

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
                  onClick={() => removePhoto(index)}
                  className="absolute top-2 left-2 p-1 bg-white/90 rounded-full text-stone-900 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X size={14} />
                </button>
              </div>

              {/* Details & Caption */}
              <div className="flex-1 p-4 flex flex-col justify-between space-y-3">
                <div className="space-y-2">
                  <div className="flex items-center gap-4 text-xs font-medium text-stone-400 uppercase tracking-wider">
                    <span className="flex items-center gap-1">
                      <MapPin size={12} className={photo.lat ? 'text-green-500' : 'text-stone-300'} />
                      {photo.lat ? 'Geotagged' : 'No Location'}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar size={12} className={photo.takenAt ? 'text-blue-500' : 'text-stone-300'} />
                      {photo.takenAt ? photo.takenAt.toLocaleDateString() : 'No Date'}
                    </span>
                  </div>
                  <textarea
                    placeholder="Add a caption..."
                    value={photo.caption}
                    onChange={(e) => updateCaption(index, e.target.value)}
                    className="w-full text-sm border-none focus:ring-0 p-0 resize-none text-stone-700 placeholder:text-stone-300 h-12"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upload Button */}
      {photos.length > 0 && (
        <div className="flex justify-end">
          <button 
            disabled={isProcessing}
            className="bg-stone-900 text-white px-8 py-3 rounded-full font-medium hover:bg-stone-800 transition-all disabled:opacity-50 flex items-center gap-2"
          >
            {isProcessing && <Loader2 size={18} className="animate-spin" />}
            Save Memories to Trip
          </button>
        </div>
      )}
    </div>
  );
}
