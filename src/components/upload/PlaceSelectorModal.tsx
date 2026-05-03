'use client';

import React, { useState } from 'react';
import { X, MapPin, Loader2, Check } from 'lucide-react';

export interface PlaceOption {
  name: string;
  type: string;
  displayName: string;
  address?: string;
}

interface PlaceSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  places: PlaceOption[];
  onSelect: (place: PlaceOption) => void;
  isLoading?: boolean;
}

export default function PlaceSelectorModal({
  isOpen,
  onClose,
  places,
  onSelect,
  isLoading = false,
}: PlaceSelectorModalProps) {
  const [selectedPlace, setSelectedPlace] = useState<PlaceOption | null>(null);

  if (!isOpen) return null;

  const handleSelect = () => {
    if (selectedPlace) {
      onSelect(selectedPlace);
      onClose();
      setSelectedPlace(null);
    }
  };

  const getPlaceIcon = (type: string) => {
    // Return appropriate icon based on place type
    return <MapPin size={20} className="text-stone-600" />;
  };

  const formatPlaceType = (type: string): string => {
    // Convert place type to readable format
    return type
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-6">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-stone-200">
          <div>
            <h2 className="text-xl font-bold text-stone-900">Select Location</h2>
            <p className="text-sm text-stone-500 mt-1">
              Choose the correct location for this photo
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

        {/* Content */}
        <div className="p-6 max-h-[60vh] overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <Loader2 size={32} className="animate-spin text-stone-400 mx-auto mb-2" />
                <p className="text-sm text-stone-500">Finding locations...</p>
              </div>
            </div>
          ) : places.length === 0 ? (
            <div className="text-center py-12">
              <MapPin size={48} className="text-stone-300 mx-auto mb-2" />
              <p className="text-sm text-stone-500">No locations found</p>
            </div>
          ) : (
            <div className="space-y-3">
              {places.map((place, index) => {
                const isSelected = selectedPlace?.name === place.name;

                return (
                  <button
                    key={index}
                    type="button"
                    onClick={() => setSelectedPlace(place)}
                    className={`
                      w-full text-left p-4 rounded-xl border-2 transition-all
                      ${isSelected
                        ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                        : 'border-stone-200 hover:border-stone-300 hover:bg-stone-50'
                      }
                    `}
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 mt-1">
                        {getPlaceIcon(place.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-stone-900 truncate">
                            {place.name}
                          </h3>
                          {isSelected && (
                            <Check size={16} className="text-blue-600 flex-shrink-0" />
                          )}
                        </div>
                        <p className="text-xs text-stone-500 mt-1">
                          {formatPlaceType(place.type)}
                        </p>
                        {place.address && (
                          <p className="text-sm text-stone-600 mt-2 line-clamp-2">
                            {place.address}
                          </p>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-stone-200 bg-stone-50">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-stone-300 bg-white px-6 py-2 font-medium text-stone-700 transition-colors hover:bg-stone-100"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSelect}
            disabled={!selectedPlace || isLoading}
            className="rounded-xl bg-blue-600 px-6 py-2 font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Select Location
          </button>
        </div>
      </div>
    </div>
  );
}