'use client';

import React from 'react';
import { MapPin, Calendar, X } from 'lucide-react';

interface LocationDetailPopupProps {
  placeName: string;
  address: string;
  coordinates: string;
  date?: string;
  onClose: () => void;
}

export default function LocationDetailPopup({
  placeName,
  address,
  coordinates,
  date,
  onClose,
}: LocationDetailPopupProps) {
  return (
    <div className="bg-white rounded-xl shadow-xl p-4 min-w-[280px] max-w-[320px]">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h3 className="font-bold text-stone-900 text-lg leading-tight">{placeName}</h3>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="ml-2 p-1 rounded-full hover:bg-stone-100 transition-colors flex-shrink-0"
        >
          <X size={16} className="text-stone-400" />
        </button>
      </div>

      {/* Address */}
      <div className="space-y-2 mb-3">
        <div className="flex items-start gap-2">
          <MapPin size={16} className="text-blue-600 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-stone-600 leading-snug">{address}</p>
        </div>

        {/* Coordinates */}
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-stone-200 flex items-center justify-center flex-shrink-0">
            <div className="w-2 h-2 rounded-full bg-stone-400" />
          </div>
          <p className="text-xs text-stone-500 font-mono">{coordinates}</p>
        </div>

        {/* Date */}
        {date && (
          <div className="flex items-center gap-2">
            <Calendar size={14} className="text-stone-400 flex-shrink-0" />
            <p className="text-xs text-stone-500">{date}</p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="pt-2 border-t border-stone-100">
        <p className="text-xs text-stone-400 italic">Click anywhere to close</p>
      </div>
    </div>
  );
}
