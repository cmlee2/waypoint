'use client';

import React from 'react';
import { MapMarker } from '@/types/map';
import { MapPin, Calendar } from 'lucide-react';

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

  console.log('🗺️ ClusteredTripsPopup rendering:', {
    markersCount: markers.length,
    locationName,
    markersData: markers.map(m => ({
      id: m.id,
      tripName: m.tripName,
      placeName: m.placeName,
      photoCount: m.photoCount,
      hasPhotos: !!m.photos,
      photosLength: m.photos?.length
    }))
  });

  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
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

  const isIndividualMemories = markers.every(m => !m.tripName || m.tripName === 'Trip');
  const unitLabel = isIndividualMemories ? (markers.length === 1 ? 'memory' : 'memories') : (markers.length === 1 ? 'trip' : 'trips');
  const buttonText = isIndividualMemories ? 'View in Timeline' : 'See Details';

  return (
    <div className="p-4 min-w-[320px] max-w-[380px] bg-white rounded-xl shadow-xl border border-stone-100">
      {/* Location Header */}
      <div className="mb-4 pb-3 border-b border-stone-100">
        <div className="flex items-center gap-2 mb-1">
          <MapPin size={20} className="text-red-500" />
          <h2 className="font-bold text-stone-900 text-lg">
            {locationName || 'Multiple Locations'}
          </h2>
        </div>
        <p className="text-xs text-stone-400 font-medium uppercase tracking-widest">
          {markers.length} {unitLabel} in this area
        </p>
      </div>

      {/* Trip List */}
      <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1 custom-scrollbar">
        {markers.map((marker) => (
          <div
            key={marker.id}
            className="p-3 bg-stone-50 rounded-lg border border-stone-100 hover:border-stone-200 hover:shadow-sm transition-all cursor-pointer"
            onClick={() => onTripClick?.(marker.id)}
          >
            {/* Photo Preview */}
            {marker.photos && marker.photos.length > 0 && (
              <div className="aspect-video mb-2 rounded-lg overflow-hidden bg-stone-100">
                <img
                  src={marker.photos[0].storage_url}
                  alt={marker.photos[0].caption || marker.label || 'Memory'}
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            {/* Trip Name */}
            <h3 className="font-bold text-stone-900 text-base mb-1.5">
              {marker.tripName || marker.label || 'Memory'}
            </h3>

            <div className="space-y-1.5 mb-3">
              {/* Date Range */}
              {getDateRange(marker.startDate, marker.endDate) && (
                <div className="flex items-center gap-2 text-xs text-stone-500 font-medium">
                  <Calendar size={12} className="text-stone-400" />
                  <span>{getDateRange(marker.startDate, marker.endDate)}</span>
                </div>
              )}

              {/* Photo Count */}
              <div className="flex items-center gap-2 text-xs text-stone-600">
                <span className="font-semibold">
                  {marker.photoCount || 0} {marker.photoCount === 1 ? 'memory' : 'memories'}
                </span>
                {marker.isPublic && !marker.isMine && (
                  <span className="bg-stone-200 text-stone-700 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider text-[9px]">
                    Shared
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}