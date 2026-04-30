'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Search, X, MapPin } from 'lucide-react';
import { formatAddressForSearch, truncatePlaceName } from '@/utils/location/formatAddress';

// Leaflet types
declare global {
  interface Window {
    L?: any;
  }
}

interface LocationPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLocationSelect: (lat: number, lng: number, placeName?: string) => void;
  initialLat?: number;
  initialLng?: number;
}

interface NominatimResult {
  lat: string;
  lon: string;
  display_name: string;
}

interface SelectedLocation {
  lat: number;
  lng: number;
  placeName?: string;
}

const DEFAULT_CENTER: [number, number] = [-122.4194, 37.7749]; // San Francisco

function getInitialLocation(initialLat?: number, initialLng?: number): SelectedLocation | null {
  if (typeof initialLat !== 'number' || typeof initialLng !== 'number') {
    return null;
  }
  return { lat: initialLat, lng: initialLng };
}

/**
 * Extract just the place name from Nominatim's full address
 * Nominatim format: "Place Name, Street, City, State, Country"
 * We want just the first part, truncated if needed
 */
function extractPlaceName(displayName: string): string {
  if (!displayName) return '';

  // Split by comma and take the first part (the place name)
  const parts = displayName.split(',').map(part => part.trim());
  const placeName = parts[0] || displayName;

  // Truncate if too long (max 50 characters)
  return placeName.length > 50 ? placeName.substring(0, 47) + '...' : placeName;
}

export default function LeafletLocationPickerModal({
  isOpen,
  onClose,
  onLocationSelect,
  initialLat,
  initialLng,
}: LocationPickerModalProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<NominatimResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<SelectedLocation | null>(null);

  // Load Leaflet CSS
  useEffect(() => {
    if (document.getElementById('leaflet-css')) return;

    const link = document.createElement('link');
    link.id = 'leaflet-css';
    link.rel = 'stylesheet';
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    document.head.appendChild(link);
  }, []);

  // Initialize map
  useEffect(() => {
    if (!isOpen || !mapContainerRef.current) return;

    let isCancelled = false;

    const setupMap = async () => {
      // Load Leaflet JS
      if (!window.L) {
        const script = document.createElement('script');
        script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
        script.async = true;
        await new Promise((resolve) => {
          script.onload = resolve;
          document.head.appendChild(script);
        });
      }

      if (isCancelled || !mapContainerRef.current) return;

      const L = window.L;
      if (!L) return;

      const startingLocation = getInitialLocation(initialLat, initialLng);
      const center: [number, number] = startingLocation
        ? [startingLocation.lat, startingLocation.lng]
        : DEFAULT_CENTER;

      // Create map
      const map = L.map(mapContainerRef.current, {
        center,
        zoom: startingLocation ? 15 : 3,
        zoomControl: true,
      });

      // Add OpenStreetMap tiles (free, no API key needed)
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }).addTo(map);

      mapRef.current = map;

      // Add marker if initial location provided
      const placeMarker = (lat: number, lng: number, placeName?: string) => {
        if (markerRef.current) {
          map.removeLayer(markerRef.current);
        }

        const marker = L.marker([lat, lng], {
          draggable: true,
          icon: L.divIcon({
            className: 'custom-marker',
            html: `<div style="background-color: #2563eb; width: 24px; height: 24px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>`,
            iconSize: [24, 24],
            iconAnchor: [12, 12],
          }),
        }).addTo(map);

        marker.on('dragend', () => {
          const { lat, lng } = marker.getLatLng();
          setSelectedLocation({ lat, lng, placeName });
        });

        markerRef.current = marker;
        setSelectedLocation({ lat, lng, placeName });
      };

      if (startingLocation) {
        placeMarker(startingLocation.lat, startingLocation.lng);
      }

      // Click to place marker
      map.on('click', (event: any) => {
        const { lat, lng } = event.latlng;
        placeMarker(lat, lng);
      });
    };

    void setupMap();

    return () => {
      isCancelled = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
      if (markerRef.current) {
        markerRef.current = null;
      }
    };
  }, [initialLat, initialLng, isOpen]);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (!isOpen) return;
    setSearchQuery('');
    setSearchResults([]);
    setSelectedLocation(getInitialLocation(initialLat, initialLng));
  }, [initialLat, initialLng, isOpen]);

  const handleSearch = async () => {
    const query = searchQuery.trim();
    if (!query) return;

    setIsSearching(true);

    try {
      // Use Nominatim (free OpenStreetMap geocoding)
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&addressdetails=1`,
        {
          headers: {
            'User-Agent': 'Waypoint-App', // Required by Nominatim
          },
        }
      );

      if (!response.ok) {
        throw new Error('Geocoding failed');
      }

      const data = await response.json();
      setSearchResults(data || []);
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const selectSearchResult = (result: NominatimResult) => {
    const lat = parseFloat(result.lat);
    const lng = parseFloat(result.lon);
    const placeName = truncatePlaceName(result.display_name, 50);

    setSelectedLocation({ lat, lng, placeName });
    setSearchResults([]);

    const map = mapRef.current;
    if (!map) return;

    // Update map view
    map.setView([lat, lng], 17); // High zoom for POI detail

    // Update or create marker
    if (markerRef.current) {
      map.removeLayer(markerRef.current);
    }

    const L = window.L;
    if (!L) return;

    const marker = L.marker([lat, lng], {
      draggable: true,
      icon: L.divIcon({
        className: 'custom-marker',
        html: `<div style="background-color: #2563eb; width: 24px; height: 24px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>`,
        iconSize: [24, 24],
        iconAnchor: [12, 12],
      }),
    }).addTo(map);

    marker.on('dragend', () => {
      const { lat, lng } = marker.getLatLng();
      setSelectedLocation({ lat, lng, placeName });
    });

    markerRef.current = marker;
  };

  const handleConfirm = () => {
    if (!selectedLocation) return;

    onLocationSelect(selectedLocation.lat, selectedLocation.lng, selectedLocation.placeName);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-6">
      <div className="flex h-full max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-stone-200 p-6">
          <h2 className="text-2xl font-bold text-stone-900">Pick a Location</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 transition-colors hover:bg-stone-100"
          >
            <X size={20} className="text-stone-500" />
          </button>
        </div>

        {/* Search */}
        <div className="border-b border-stone-200 p-4">
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Search for a place..."
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  void handleSearch();
                }
              }}
              className="flex-1 rounded-xl border border-stone-300 px-4 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="button"
              onClick={() => void handleSearch()}
              disabled={isSearching || !searchQuery.trim()}
              className="rounded-xl bg-blue-600 px-4 py-2 font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isSearching ? (
                <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                <Search size={18} />
              )}
              Search
            </button>
          </div>

          {/* Search Results */}
          {searchResults.length > 0 && (
            <div className="mt-3 space-y-1">
              {searchResults.map((result, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => selectSearchResult(result)}
                  className="w-full rounded-xl border border-stone-200 p-3 text-left transition-colors hover:bg-stone-50 hover:border-blue-300"
                >
                  <div className="flex items-start gap-2">
                    <MapPin size={16} className="mt-0.5 flex-shrink-0 text-blue-600" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-stone-900">{formatAddressForSearch(result.display_name)}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Map */}
        <div className="relative flex-1">
          <div ref={mapContainerRef} className="h-full w-full" />

          {/* Instructions */}
          <div className="absolute left-4 top-4 rounded-xl bg-white/90 p-3 shadow-lg backdrop-blur max-w-xs">
            <p className="text-sm text-stone-700">
              📍 Click on the map to select a location, or search above
            </p>
            <p className="mt-1 text-xs text-stone-500">
              Use +/- buttons to zoom in for exact restaurant locations
            </p>
          </div>

          {/* Selected Location Info */}
          {selectedLocation && (
            <div className="absolute bottom-4 left-4 rounded-xl bg-white/90 p-4 shadow-lg backdrop-blur">
              <p className="font-medium text-stone-900">Selected Location:</p>
              <p className="text-sm text-stone-600">
                {selectedLocation.placeName || `${selectedLocation.lat.toFixed(6)}, ${selectedLocation.lng.toFixed(6)}`}
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-stone-200 p-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-stone-300 px-6 py-2 font-medium transition-colors hover:bg-stone-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!selectedLocation}
            className="rounded-xl bg-blue-600 px-6 py-2 font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Confirm Location
          </button>
        </div>
      </div>
    </div>
  );
}
