'use client';

import React, { useEffect, useRef, useState } from 'react';
import type mapboxgl from 'mapbox-gl';
import { Search, X } from 'lucide-react';

interface LocationPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLocationSelect: (lat: number, lng: number, placeName?: string) => void;
  initialLat?: number;
  initialLng?: number;
}

interface MapboxGeocodingFeature {
  center: [number, number];
  place_name: string;
}

interface SelectedLocation {
  lat: number;
  lng: number;
  placeName?: string;
}

const DEFAULT_CENTER: [number, number] = [-122.4194, 37.7749];
const MAPBOX_CSS_ID = 'mapbox-gl-stylesheet';

function getInitialLocation(initialLat?: number, initialLng?: number): SelectedLocation | null {
  if (typeof initialLat !== 'number' || typeof initialLng !== 'number') {
    return null;
  }

  return { lat: initialLat, lng: initialLng };
}

export default function LocationPickerModal({
  isOpen,
  onClose,
  onLocationSelect,
  initialLat,
  initialLng,
}: LocationPickerModalProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markerRef = useRef<mapboxgl.Marker | null>(null);
  const mapboxRef = useRef<typeof mapboxgl | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<MapboxGeocodingFeature[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<SelectedLocation | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    setSearchQuery('');
    setSearchResults([]);
    setSelectedLocation(getInitialLocation(initialLat, initialLng));
  }, [initialLat, initialLng, isOpen]);

  useEffect(() => {
    if (document.getElementById(MAPBOX_CSS_ID)) return;

    const link = document.createElement('link');
    link.id = MAPBOX_CSS_ID;
    link.rel = 'stylesheet';
    link.href = 'https://api.mapbox.com/mapbox-gl-js/v3.0.1/mapbox-gl.css';
    document.head.appendChild(link);
  }, []);

  useEffect(() => {
    if (!isOpen || !mapContainerRef.current) return;

    let isCancelled = false;

    const setupMap = async () => {
      const { default: mapboxglModule } = await import('mapbox-gl');
      if (isCancelled || !mapContainerRef.current) return;

      const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;
      if (!mapboxToken) {
        console.error('Mapbox token not found');
        return;
      }

      mapboxRef.current = mapboxglModule;
      mapboxglModule.accessToken = mapboxToken;

      const startingLocation = getInitialLocation(initialLat, initialLng);
      const center: [number, number] = startingLocation
        ? [startingLocation.lng, startingLocation.lat]
        : DEFAULT_CENTER;

      const map = new mapboxglModule.Map({
        container: mapContainerRef.current,
        style: 'mapbox://styles/mapbox/streets-v12',
        center,
        zoom: startingLocation ? 12 : 3,
      });

      mapRef.current = map;
      map.addControl(new mapboxglModule.NavigationControl());

      const placeMarker = (lat: number, lng: number, placeName?: string) => {
        markerRef.current?.remove();

        const marker = new mapboxglModule.Marker({ color: '#2563eb', draggable: true })
          .setLngLat([lng, lat])
          .addTo(map);

        marker.on('dragend', () => {
          const lngLat = marker.getLngLat();
          setSelectedLocation({ lat: lngLat.lat, lng: lngLat.lng, placeName });
        });

        markerRef.current = marker;
        setSelectedLocation({ lat, lng, placeName });
      };

      if (startingLocation) {
        placeMarker(startingLocation.lat, startingLocation.lng);
      }

      map.on('click', (event) => {
        placeMarker(event.lngLat.lat, event.lngLat.lng);
      });
    };

    void setupMap();

    return () => {
      isCancelled = true;
      markerRef.current?.remove();
      markerRef.current = null;
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [initialLat, initialLng, isOpen]);

  const handleSearch = async () => {
    const query = searchQuery.trim();
    if (!query) return;

    setIsSearching(true);

    try {
      const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;
      if (!mapboxToken) {
        throw new Error('Mapbox token not configured');
      }

      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${mapboxToken}&limit=5`
      );

      if (!response.ok) {
        throw new Error('Geocoding failed');
      }

      const data = (await response.json()) as { features?: MapboxGeocodingFeature[] };
      setSearchResults(data.features || []);
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const selectSearchResult = (result: MapboxGeocodingFeature) => {
    const [lng, lat] = result.center;
    const map = mapRef.current;
    const mapboxglModule = mapboxRef.current;

    setSelectedLocation({ lat, lng, placeName: result.place_name });
    setSearchResults([]);

    if (!map || !mapboxglModule) return;

    map.setCenter([lng, lat]);
    map.setZoom(15);

    markerRef.current?.remove();

    const marker = new mapboxglModule.Marker({ color: '#2563eb', draggable: true })
      .setLngLat([lng, lat])
      .addTo(map);

    marker.on('dragend', () => {
      const lngLat = marker.getLngLat();
      setSelectedLocation({ lat: lngLat.lat, lng: lngLat.lng, placeName: result.place_name });
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
              className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSearching ? (
                <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                <Search size={18} />
              )}
              Search
            </button>
          </div>

          {searchResults.length > 0 && (
            <div className="mt-3 space-y-1">
              {searchResults.map((result) => (
                <button
                  key={`${result.place_name}-${result.center.join(',')}`}
                  type="button"
                  onClick={() => selectSearchResult(result)}
                  className="w-full rounded-xl border border-stone-200 p-3 text-left transition-colors hover:border-blue-300 hover:bg-stone-50"
                >
                  <p className="text-sm font-medium text-stone-900">{result.place_name}</p>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="relative flex-1 bg-stone-100">
          <div ref={mapContainerRef} className="h-full w-full" />

          <div className="absolute left-4 top-4 max-w-xs rounded-xl bg-white/90 p-3 shadow-lg backdrop-blur">
            <p className="text-sm text-stone-700">
              Click the map or search above to set the photo location.
            </p>
          </div>

          {selectedLocation && (
            <div className="absolute bottom-4 left-4 rounded-xl bg-white/90 p-4 shadow-lg backdrop-blur">
              <p className="font-medium text-stone-900">Selected Location</p>
              <p className="text-sm text-stone-600">
                {selectedLocation.placeName || `${selectedLocation.lat.toFixed(6)}, ${selectedLocation.lng.toFixed(6)}`}
              </p>
            </div>
          )}
        </div>

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
            className="rounded-xl bg-blue-600 px-6 py-2 font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Confirm Location
          </button>
        </div>
      </div>
    </div>
  );
}
