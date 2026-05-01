'use client';

import React, { useEffect, useState } from 'react';
import { X, Loader2, Check, Image as ImageIcon } from 'lucide-react';
import { GooglePhoto, createGooglePhotosClient } from '@/utils/google/photos';

interface GooglePhotosPickerProps {
  isOpen: boolean;
  onClose: () => void;
  onPhotosSelected: (photos: GooglePhoto[]) => void;
  accessToken: string;
  maxPhotos?: number;
}

export default function GooglePhotosPicker({
  isOpen,
  onClose,
  onPhotosSelected,
  accessToken,
  maxPhotos = 15,
}: GooglePhotosPickerProps) {
  const [photos, setPhotos] = useState<GooglePhoto[]>([]);
  const [selectedPhotos, setSelectedPhotos] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [nextPageToken, setNextPageToken] = useState<string | undefined>();
  const [error, setError] = useState<string | null>(null);

  const { client, rateLimiter } = createGooglePhotosClient(accessToken);

  // Load photos when modal opens
  useEffect(() => {
    if (!isOpen || !accessToken) return;

    loadPhotos();
  }, [isOpen, accessToken]);

  const loadPhotos = async (pageToken?: string) => {
    if (pageToken) {
      setIsLoadingMore(true);
    } else {
      setIsLoading(true);
      setError(null);
    }

    try {
      // Validate token first
      console.log('Validating Google Photos token...');
      const isTokenValid = await client.validateToken();

      if (!isTokenValid) {
        throw new Error('Invalid or expired Google Photos access token. Please try authorizing again.');
      }

      console.log('Token validated successfully, loading photos...');
      const result = await rateLimiter.execute(() =>
        client.listPhotos(50, pageToken)
      );

      if (pageToken) {
        setPhotos(prev => [...prev, ...result.photos]);
      } else {
        setPhotos(result.photos);
      }

      setNextPageToken(result.nextPageToken);
    } catch (err) {
      console.error('Failed to load photos:', err);
      setError(err instanceof Error ? err.message : 'Failed to load photos');
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  };

  const togglePhotoSelection = (photoId: string) => {
    setSelectedPhotos(prev => {
      const newSet = new Set(prev);

      if (newSet.has(photoId)) {
        newSet.delete(photoId);
      } else if (newSet.size < maxPhotos) {
        newSet.add(photoId);
      }

      return newSet;
    });
  };

  const handleImport = () => {
    const selected = photos.filter(photo => selectedPhotos.has(photo.id));
    onPhotosSelected(selected);
    onClose();
  };

  if (!isOpen) return null;

  const canImport = selectedPhotos.size > 0 && selectedPhotos.size <= maxPhotos;
  const remainingSlots = maxPhotos - selectedPhotos.size;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-6">
      <div className="flex h-full max-h-[90vh] w-full max-w-6xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-stone-200 p-6">
          <div>
            <h2 className="text-2xl font-bold text-stone-900">Import from Google Photos</h2>
            <p className="text-sm text-stone-500 mt-1">
              Select up to {maxPhotos} photos ({selectedPhotos.size} selected)
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 transition-colors hover:bg-stone-100"
          >
            <X size={20} className="text-stone-500" />
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mx-6 mt-4 rounded-xl bg-red-50 border border-red-200 p-4">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Photo Grid */}
        <div className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <Loader2 size={32} className="animate-spin text-stone-400 mx-auto mb-2" />
                <p className="text-sm text-stone-500">Loading your photos...</p>
              </div>
            </div>
          ) : photos.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <ImageIcon size={48} className="text-stone-300 mx-auto mb-2" />
                <p className="text-sm text-stone-500">No photos found</p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {photos.map((photo) => {
                const isSelected = selectedPhotos.has(photo.id);
                const canSelect = !isSelected && selectedPhotos.size < maxPhotos;

                return (
                  <button
                    key={photo.id}
                    type="button"
                    onClick={() => togglePhotoSelection(photo.id)}
                    disabled={!canSelect && !isSelected}
                    className={`
                      relative aspect-square rounded-xl overflow-hidden border-2 transition-all
                      ${isSelected ? 'border-blue-500 ring-2 ring-blue-200' : 'border-stone-200'}
                      ${!canSelect && !isSelected ? 'opacity-50 cursor-not-allowed' : 'hover:border-stone-300'}
                    `}
                  >
                    <img
                      src={client.getPhotoDownloadUrl(photo, 300, 300)}
                      alt={photo.filename}
                      className="w-full h-full object-cover"
                    />

                    {/* Selection Overlay */}
                    {isSelected && (
                      <div className="absolute inset-0 bg-blue-500/20 flex items-center justify-center">
                        <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                          <Check size={16} className="text-white" />
                        </div>
                      </div>
                    )}

                    {/* Filename */}
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2">
                      <p className="text-xs text-white truncate">{photo.filename}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* Load More Button */}
          {nextPageToken && !isLoading && photos.length > 0 && (
            <div className="flex justify-center mt-6">
              <button
                type="button"
                onClick={() => loadPhotos(nextPageToken)}
                disabled={isLoadingMore}
                className="rounded-xl border border-stone-300 bg-white px-6 py-2 font-medium text-stone-700 transition-colors hover:bg-stone-50 disabled:opacity-50 flex items-center gap-2"
              >
                {isLoadingMore ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Loading more...
                  </>
                ) : (
                  'Load More Photos'
                )}
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-stone-200 p-4">
          <div className="text-sm text-stone-500">
            {remainingSlots > 0 ? (
              <span>{remainingSlots} more photo{remainingSlots !== 1 ? 's' : ''} can be selected</span>
            ) : (
              <span className="text-red-600">Maximum {maxPhotos} photos selected</span>
            )}
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-stone-300 px-6 py-2 font-medium transition-colors hover:bg-stone-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleImport}
              disabled={!canImport}
              className="rounded-xl bg-blue-600 px-6 py-2 font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Import {selectedPhotos.size} Photo{selectedPhotos.size !== 1 ? 's' : ''}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
