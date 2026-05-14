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
        <div className="w-full h-full overflow-hidden">
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
        <div className="aspect-square bg-gradient-to-br from-stone-100 to-stone-200 flex items-center justify-center border border-stone-200">
          <MapPin size={32} className="text-stone-400" />
        </div>
      );
    }

    return (
      <div className="grid grid-cols-2 grid-rows-2 gap-0.5 w-full h-full bg-stone-200">
        {photos.slice(0, 4).map((photo, index) => {
          const isLastPhoto = index === 3 && photoCount > 4;
          const remainingPhotos = photoCount - 3;

          return (
            <div
              key={photo.id}
              className={`relative ${getGridClass(index, Math.min(photoCount, 4))} overflow-hidden cursor-pointer group`}
              onClick={() => onPhotoClick?.(photo.id)}
            >
              <img
                src={photo.storage_url}
                alt={photo.caption || 'Photo'}
                className="w-full h-full object-cover transition-transform group-hover:scale-105"
              />
              {isLastPhoto && remainingPhotos > 0 && (
                <div className="absolute inset-0 bg-black/60 backdrop-blur-[1px] flex items-center justify-center">
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
    <div className="bg-white p-3 pb-8 shadow-[0_20px_50px_rgba(0,0,0,0.2)] border border-stone-200 min-w-[280px] max-w-[300px] flex flex-col transform rotate-[1deg] hover:rotate-0 transition-transform duration-300">
      {/* Polaroid Image Area */}
      <div 
        className="aspect-square mb-6 bg-stone-100 overflow-hidden shadow-inner cursor-pointer group/grid relative border border-stone-100"
        onClick={() => !onPhotoClick && onSeeDetails?.()}
      >
        {renderPhotoGrid()}
        
        {/* Subtle photo gloss effect */}
        <div className="absolute inset-0 pointer-events-none bg-gradient-to-tr from-white/5 to-transparent opacity-30" />
      </div>

      {/* Polaroid Caption Area */}
      <div className="px-1 flex flex-col items-center">
        <h3 className="handwritten text-3xl text-stone-800 leading-tight mb-2 text-center">
          {marker.label || marker.tripName || 'Memory'}
        </h3>
        
        <div className="flex flex-col gap-1.5 items-center w-full">
          {/* Metadata Row */}
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 opacity-60">
            {/* Date */}
            {getDateRange(marker.startDate, marker.endDate) && (
              <div className="flex items-center gap-1.5 text-[10px] text-stone-500 font-medium uppercase tracking-widest">
                <Calendar size={10} className="text-stone-400" />
                <span>{getDateRange(marker.startDate, marker.endDate)}</span>
              </div>
            )}

            {/* Location */}
            {marker.placeName && (
              <div className="flex items-center gap-1.5 text-[11px] text-stone-600 font-medium italic">
                <MapPin size={10} className="text-red-400" />
                <span className="truncate max-w-[180px]">{marker.placeName}</span>
              </div>
            )}
          </div>

          {/* Photo Count (if > 1 and not showing full button) */}
          {photoCount > 1 && !onSeeDetails && (
            <div className="mt-1">
              <span className="text-[9px] font-bold text-stone-300 uppercase tracking-[0.2em]">
                {photoCount} Memories
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Action Button - Placed at the very bottom, slightly outside the "polaroid" feel or as a small tag */}
      {onSeeDetails && (
        <div className="mt-6 pt-4 border-t border-stone-50">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onSeeDetails();
            }}
            className="w-full py-2.5 px-4 bg-stone-900 text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-lg hover:bg-stone-800 transition-all flex items-center justify-center gap-2 shadow-lg hover:shadow-xl active:scale-95"
          >
            <Eye size={12} />
            View Full Trip
          </button>
        </div>
      )}
    </div>
  );
}
