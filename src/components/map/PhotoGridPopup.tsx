'use client';

import React from 'react';
import { MapMarker } from '@/types/map';
import { MapPin, Calendar, Eye } from 'lucide-react';

interface PhotoGridPopupProps {
  marker: MapMarker;
  onSeeDetails?: () => void;
  onPhotoClick?: (photoId: string) => void;
}

export default function PhotoGridPopup({ marker, onSeeDetails, onPhotoClick }: PhotoGridPopupProps) {
  const photos = marker.photos || [];
  const photoCount = marker.photoCount || 0;

  console.log('🖼️ PhotoGridPopup rendering:', {
    markerId: marker.id,
    tripName: marker.tripName,
    photoCount,
    photosLength: photos.length,
    hasSeeDetails: !!onSeeDetails
  });

  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getDateRange = (startDate?: string, endDate?: string) => {
    if (!startDate && !endDate) return '';
    if (startDate && endDate && startDate === endDate) {
      return formatDate(startDate);
    }
    if (startDate && endDate) {
      return `${formatDate(startDate)} - ${formatDate(endDate)}`;
    }
    return formatDate(startDate || endDate);
  };

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
    if (photos.length === 0 && marker.imageUrl) {
      return (
        <div className="w-full h-full overflow-hidden rounded-lg">
          <img
            src={marker.imageUrl}
            alt={marker.label || 'Photo'}
            className="w-full h-full object-cover"
          />
        </div>
      );
    }

    if (photos.length === 0) {
      return (
        <div className="aspect-square bg-gradient-to-br from-stone-100 to-stone-200 rounded-lg flex items-center justify-center border border-stone-200">
          <MapPin size={32} className="text-stone-400" />
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
              className={`relative ${getGridClass(index, Math.min(photoCount, 4))} overflow-hidden rounded-lg cursor-pointer group`}
              onClick={() => onPhotoClick?.(photo.id)}
            >
              <img
                src={photo.storage_url}
                alt={photo.caption || 'Photo'}
                className="w-full h-full object-cover transition-transform group-hover:scale-105"
              />
              {isLastPhoto && remainingPhotos > 0 && (
                <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center">
                  <div className="text-center">
                    <Eye size={20} className="text-white mx-auto mb-1" />
                    <span className="text-white font-bold text-sm">+{remainingPhotos}</span>
                  </div>
                </div>
              )}
              {/* Hover overlay for individual photos */}
              {!isLastPhoto && (
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                  <Eye size={16} className="text-white drop-shadow-lg" />
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="p-4 min-w-[280px] max-w-[320px] bg-white rounded-xl shadow-xl border border-stone-100">
      {/* Photo Grid */}
      <div 
        className="aspect-square mb-4 rounded-lg overflow-hidden border border-stone-100 shadow-sm cursor-pointer group/grid"
        onClick={() => !onPhotoClick && onSeeDetails?.()}
      >
        {renderPhotoGrid()}
      </div>

      {/* Info Container */}
      <div className="space-y-3">
        <div>
          <h3 className="font-bold text-stone-900 text-lg leading-tight">
            {marker.label || marker.tripName || 'Memory'}
          </h3>

          <div className="flex flex-col gap-1.5 mt-1">
            {/* Date */}
            {getDateRange(marker.startDate, marker.endDate) && (
              <div className="flex items-center gap-2 text-sm text-stone-50 font-medium">
                <Calendar size={14} className="text-stone-400" />
                <span className="text-stone-500">{getDateRange(marker.startDate, marker.endDate)}</span>
              </div>
            )}

            {/* Location */}
            {marker.placeName && (
              <div className="flex items-start gap-2 text-sm text-stone-600">
                <MapPin size={14} className="text-red-500 mt-0.5 flex-shrink-0" />
                <span className="leading-snug">{marker.placeName}</span>
              </div>
            )}
          </div>
        </div>

        {/* Action Button */}
        {onSeeDetails && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onSeeDetails();
            }}
            className="w-full py-2.5 px-4 bg-stone-900 text-white text-xs font-bold uppercase tracking-widest rounded-xl hover:bg-stone-800 transition-all flex items-center justify-center gap-2 shadow-md hover:shadow-lg active:scale-95"
          >
            <Eye size={14} />
            View Full Trip
          </button>
        )}

        {/* Photo Count (if > 1 and not showing button) */}
        {photoCount > 1 && !onSeeDetails && (
          <div className="mt-1 pt-2 border-t border-stone-50">
            <span className="text-xs font-bold text-stone-400 uppercase tracking-widest">
              {photoCount} Memories at this spot
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
