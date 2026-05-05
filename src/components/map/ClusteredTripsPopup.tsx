'use client';

import React from 'react';
import { MapMarker } from '@/types/map';
import { MapPin, Calendar, Eye } from 'lucide-react';

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

      {/* Trip List */}
      <div className="space-y-3 max-h-[400px] overflow-y-auto">
        {markers.map((marker, index) => (
          <div
            key={marker.id}
            className="p-3 bg-white/80 backdrop-blur-sm rounded-lg border border-amber-200 hover:border-amber-300 hover:shadow-md transition-all"
          >
            {/* Trip Name */}
            <h3 className="font-bold text-amber-900 text-base mb-2">
              {marker.tripName || marker.label || 'Trip'}
            </h3>

            {/* Date Range */}
            {getDateRange(marker.startDate, marker.endDate) && (
              <div className="flex items-center gap-2 mb-2 text-xs text-amber-700">
                <Calendar size={12} />
                <span>{getDateRange(marker.startDate, marker.endDate)}</span>
              </div>
            )}

            {/* Photo Count */}
            <div className="flex items-center gap-2 mb-3 text-xs text-amber-600">
              <span className="font-medium">
                {marker.photoCount || 0} {marker.photoCount === 1 ? 'memory' : 'memories'}
              </span>
              {marker.isPublic && !marker.isMine && (
                <span className="bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider text-[10px] border border-amber-200">
                  Shared
                </span>
              )}
            </div>

            {/* See Details Button */}
            <button
              type="button"
              onClick={() => {
                console.log('📍 Trip See Details clicked:', marker.id);
                onTripClick?.(marker.id);
              }}
              className="w-full bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white px-3 py-2 rounded-lg text-sm font-medium transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2"
            >
              <Eye size={14} />
              See Details
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}