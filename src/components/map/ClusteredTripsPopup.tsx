'use client';

import React, { useState } from 'react';
import { MapMarker } from '@/types/map';
import { MapPin, ChevronLeft, ChevronRight, Calendar, Eye } from 'lucide-react';

interface ClusteredTripsPopupProps {
  markers: MapMarker[];
  locationName: string;
  onTripClick?: (tripId: string) => void;
}

export default function ClusteredTripsPopup({
  markers,
  locationName,
  onTripClick
}: ClusteredTripsPopupProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const currentMarker = markers[currentIndex];

  console.log('🗺️ ClusteredTripsPopup rendering:', {
    markersCount: markers.length,
    locationName,
    currentIndex,
    currentMarker: currentMarker?.tripName
  });

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % markers.length);
  };

  const handlePrevious = () => {
    setCurrentIndex((prev) => (prev - 1 + markers.length) % markers.length);
  };

  const handleSeeDetails = () => {
    onTripClick?.(currentMarker.id);
  };

  return (
    <div className="p-4 min-w-[320px] max-w-[380px] bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl shadow-xl border-2 border-amber-200">
      {/* Location Header */}
      <div className="mb-4 pb-3 border-b-2 border-amber-200">
        <div className="flex items-center gap-2 mb-2">
          <MapPin size={20} className="text-amber-600" />
          <h2 className="font-bold text-amber-900 text-lg">
            {locationName || 'Multiple Locations'}
          </h2>
        </div>
        <p className="text-xs text-amber-600 italic">
          {markers.length} {markers.length === 1 ? 'trip' : 'trips'} in this area
        </p>
      </div>

      {/* Trip Navigation */}
      {markers.length > 1 && (
        <div className="flex items-center justify-between mb-4">
          <button
            type="button"
            onClick={handlePrevious}
            className="p-2 rounded-full bg-amber-100 hover:bg-amber-200 text-amber-700 transition-colors"
            disabled={markers.length <= 1}
          >
            <ChevronLeft size={20} />
          </button>

          <div className="flex-1 mx-4">
            <div className="flex justify-center gap-2">
              {markers.map((_, index) => (
                <div
                  key={index}
                  className={`w-2 h-2 rounded-full transition-colors ${
                    index === currentIndex
                      ? 'bg-amber-600'
                      : 'bg-amber-200'
                  }`}
                />
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={handleNext}
            className="p-2 rounded-full bg-amber-100 hover:bg-amber-200 text-amber-700 transition-colors"
            disabled={markers.length <= 1}
          >
            <ChevronRight size={20} />
          </button>
        </div>
      )}

      {/* Current Trip Details */}
      <div className="space-y-3">
        {/* Photo Grid for Current Trip */}
        {currentMarker.photos && currentMarker.photos.length > 0 && (
          <div className="aspect-square rounded-lg overflow-hidden border-2 border-amber-200 shadow-inner">
            <div className="grid grid-cols-2 grid-rows-2 gap-1 w-full h-full">
              {currentMarker.photos.slice(0, 4).map((photo, index) => {
                const isLastPhoto = index === 3 && (currentMarker.photoCount || 0) > 4;
                const remainingPhotos = (currentMarker.photoCount || 0) - 3;

                return (
                  <div
                    key={photo.id}
                    className="relative overflow-hidden rounded-lg"
                  >
                    <img
                      src={photo.storage_url}
                      alt={photo.caption || 'Photo'}
                      className="w-full h-full object-cover"
                    />
                    {isLastPhoto && remainingPhotos > 0 && (
                      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center">
                        <div className="text-center">
                          <Eye size={16} className="text-white mx-auto mb-1" />
                          <span className="text-white font-bold text-xs">+{remainingPhotos}</span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Trip Info */}
        <div>
          <h3 className="font-bold text-amber-900 text-lg leading-tight">
            {currentMarker.tripName || currentMarker.label || 'Trip'}
          </h3>
          <div className="flex items-center gap-2 mt-2 text-sm">
            <span className="text-amber-700 font-medium flex items-center gap-1">
              <Calendar size={14} />
              {currentMarker.photoCount || 0} {currentMarker.photoCount === 1 ? 'memory' : 'memories'}
            </span>
            {currentMarker.isPublic && !currentMarker.isMine && (
              <span className="bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider text-[10px] border border-amber-200">
                Shared
              </span>
            )}
          </div>
        </div>

        {currentMarker.placeName && (
          <p className="text-xs text-amber-600 italic flex items-center gap-1">
            <MapPin size={12} />
            {currentMarker.placeName}
          </p>
        )}

        {/* See Details Button */}
        <button
          type="button"
          onClick={handleSeeDetails}
          className="w-full mt-4 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white px-4 py-2.5 rounded-xl font-medium transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2"
        >
          <Eye size={16} />
          See Details
        </button>
      </div>
    </div>
  );
}