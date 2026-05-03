'use client';

import React from 'react';
import { MapMarker } from '@/types/map';
import { MapPin, Calendar, Eye } from 'lucide-react';

interface PhotoGridPopupProps {
  marker: MapMarker;
  onSeeDetails?: () => void;
}

export default function PhotoGridPopup({ marker, onSeeDetails }: PhotoGridPopupProps) {
  const photos = marker.photos || [];
  const photoCount = marker.photoCount || 0;

  // Determine grid layout based on photo count
  const getGridClass = (index: number, totalPhotos: number) => {
    if (totalPhotos === 1) {
      return 'col-span-2 row-span-2';
    } else if (totalPhotos === 2) {
      return 'col-span-1 row-span-2';
    } else if (totalPhotos === 3) {
      if (index === 0) return 'col-span-1 row-span-2';
      return 'col-span-1 row-span-1';
    } else {
      // 4+ photos
      return 'col-span-1 row-span-1';
    }
  };

  const renderPhotoGrid = () => {
    if (photos.length === 0) {
      return (
        <div className="aspect-square bg-gradient-to-br from-amber-100 to-orange-100 rounded-lg flex items-center justify-center border-2 border-amber-200">
          <MapPin size={32} className="text-amber-400" />
        </div>
      );
    }

    return (
      <div className="grid grid-cols-2 grid-rows-2 gap-1 w-full h-full">
        {photos.slice(0, 4).map((photo, index) => {
          const isLastPhoto = index === 3 && photoCount > 4;
          const remainingPhotos = photoCount - 3;

          return (
            <div
              key={photo.id}
              className={`relative ${getGridClass(index, Math.min(photoCount, 4))} overflow-hidden rounded-lg`}
            >
              <img
                src={photo.storage_url}
                alt={photo.caption || 'Photo'}
                className="w-full h-full object-cover"
              />
              {isLastPhoto && remainingPhotos > 0 && (
                <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center">
                  <div className="text-center">
                    <Eye size={20} className="text-white mx-auto mb-1" />
                    <span className="text-white font-bold text-sm">+{remainingPhotos}</span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="p-4 min-w-[280px] max-w-[320px] bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl shadow-xl border-2 border-amber-200">
      {/* Photo Grid */}
      <div className="aspect-square mb-4 rounded-lg overflow-hidden border-2 border-amber-200 shadow-inner">
        {renderPhotoGrid()}
      </div>

      {/* Trip Info */}
      <div className="space-y-3">
        <div>
          <h3 className="font-bold text-amber-900 text-lg leading-tight">
            {marker.tripName || marker.label || 'Trip'}
          </h3>
          <div className="flex items-center gap-2 mt-2 text-sm">
            <span className="text-amber-700 font-medium flex items-center gap-1">
              <Calendar size={14} />
              {photoCount} {photoCount === 1 ? 'memory' : 'memories'}
            </span>
            {marker.isPublic && !marker.isMine && (
              <span className="bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider text-[10px] border border-amber-200">
                Shared
              </span>
            )}
          </div>
        </div>

        {marker.placeName && (
          <p className="text-xs text-amber-600 italic flex items-center gap-1">
            <MapPin size={12} />
            {marker.placeName}
          </p>
        )}

        {/* See Details Button */}
        {onSeeDetails && (
          <button
            type="button"
            onClick={onSeeDetails}
            className="w-full mt-4 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white px-4 py-2.5 rounded-xl font-medium transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2"
          >
            <Eye size={16} />
            See Details
          </button>
        )}
      </div>
    </div>
  );
}