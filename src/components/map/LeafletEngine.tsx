'use client';

import React, { useEffect, useState, useRef } from 'react';
import dynamic from 'next/dynamic';
import { TripMapProps } from '@/types/map';
import { truncatePlaceName } from '@/utils/location/formatAddress';
import PhotoGridPopup from './PhotoGridPopup';
import 'leaflet/dist/leaflet.css';

// Dynamically import Leaflet components (no SSR)
const MapContainer = dynamic(() => import('react-leaflet').then(mod => mod.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import('react-leaflet').then(mod => mod.TileLayer), { ssr: false });
const Marker = dynamic(() => import('react-leaflet').then(mod => mod.Marker), { ssr: false });
const Popup = dynamic(() => import('react-leaflet').then(mod => mod.Popup), { ssr: false });
const ZoomControl = dynamic(() => import('react-leaflet').then(mod => mod.ZoomControl), { ssr: false });

// CartoDB Positron - Minimalist light style
const TILE_LAYER_URL = "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png";
const ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>';

export default function LeafletEngine({
  center,
  zoom,
  markers,
  onMarkerClick,
  selectedMarkerId,
  showSeeDetails = true,
  className
}: TripMapProps) {
  const [L, setL] = useState<any>(null);
  const [map, setMap] = useState<any>(null);
  const markerRefs = useRef<Map<string, any>>(new Map());

  useEffect(() => {
    // Import Leaflet directly for its L object (for icon creation)
    import('leaflet').then(mod => {
      setL(mod.default);
    });
  }, []);

  // Handle external selection (pan to and open popup)
  useEffect(() => {
    if (map && selectedMarkerId) {
      const marker = markerRefs.current.get(selectedMarkerId);
      if (marker) {
        map.panTo(marker.getLatLng());
        marker.openPopup();
      }
    }
  }, [selectedMarkerId, map]);

  if (!L) return (
    <div className={`${className} bg-stone-50 rounded-xl flex items-center justify-center min-h-[400px]`}>
      <div className="text-stone-400 font-medium animate-pulse">Loading Map...</div>
    </div>
  );

  // Create a custom marker icon
  const createMarkerIcon = (placeName?: string) => {
    const truncatedName = truncatePlaceName(placeName || '', 25);
    return L.divIcon({
      className: 'custom-div-icon',
      html: `
        <div class="flex flex-col items-center travel-marker">
          <div class="relative">
            <svg class="w-8 h-8 drop-shadow-lg" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" fill="#DC2626" stroke="#991B1B" stroke-width="1"/>
              <circle cx="12" cy="9" r="1.5" fill="#FEF2F2"/>
            </svg>
          </div>
          ${truncatedName ? `<div class="mt-1 px-3 py-1.5 bg-red-50/90 backdrop-blur-sm rounded-lg shadow-md border border-red-200 text-xs font-semibold text-red-900 whitespace-nowrap max-w-[150px] overflow-hidden text-ellipsis">${truncatedName}</div>` : ''}
        </div>
      `,
      iconSize: [32, 32],
      iconAnchor: [16, 32]
    });
  };

  return (
    <div className={`${className} overflow-hidden rounded-xl border-2 border-stone-200 shadow-sm relative z-0`}>
      <MapContainer
        center={[center.lat, center.lng]}
        zoom={zoom}
        zoomControl={false}
        className="w-full h-full"
        ref={setMap}
      >
        <TileLayer
          url={TILE_LAYER_URL}
          attribution={ATTRIBUTION}
        />
        <ZoomControl position="topright" />

        {markers.map((marker) => (
          <Marker
            key={marker.id}
            position={[marker.lat, marker.lng]}
            icon={createMarkerIcon(marker.placeName)}
            ref={(ref: any) => {
              if (ref) markerRefs.current.set(marker.id, ref);
            }}
            eventHandlers={{
              click: () => onMarkerClick?.(marker.id),
            }}
          >
            <Popup
              className="travel-popup"
              autoClose={false}
              closeOnClick={false}
            >
              <PhotoGridPopup
                marker={marker}
                onSeeDetails={showSeeDetails ? () => onMarkerClick?.(marker.id) : undefined}
              />
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
