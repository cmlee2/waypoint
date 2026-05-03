'use client';

import React, { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { TripMapProps } from '@/types/map';
import { truncatePlaceName } from '@/utils/location/formatAddress';
import PhotoGridPopup from './PhotoGridPopup';
import 'leaflet/dist/leaflet.css';
import 'react-leaflet-markercluster/styles';

// Dynamically import Leaflet components (no SSR)
const MapContainer = dynamic(() => import('react-leaflet').then(mod => mod.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import('react-leaflet').then(mod => mod.TileLayer), { ssr: false });
const Marker = dynamic(() => import('react-leaflet').then(mod => mod.Marker), { ssr: false });
const Popup = dynamic(() => import('react-leaflet').then(mod => mod.Popup), { ssr: false });
const ZoomControl = dynamic(() => import('react-leaflet').then(mod => mod.ZoomControl), { ssr: false });
const MarkerClusterGroup = dynamic(
  async () => {
    const mod = await import('react-leaflet-markercluster');
    const ClusterGroup = mod.default as React.ComponentType<React.PropsWithChildren<object>>;

    return function MarkerClusterGroupWrapper({
      children,
    }: React.PropsWithChildren<object>) {
      return <ClusterGroup>{children}</ClusterGroup>;
    };
  },
  { ssr: false }
);

// CartoDB Positron - Minimalist light style
const TILE_LAYER_URL = "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png";
const ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>';

export default function LeafletEngine({
  center,
  zoom,
  markers,
  onMarkerClick,
  className
}: TripMapProps) {
  const [L, setL] = useState<any>(null);
  const [mapInstance, setMapInstance] = useState<any>(null);

  useEffect(() => {
    // Import Leaflet directly for its L object (for icon creation)
    import('leaflet').then(mod => {
      setL(mod.default);
    });
  }, []);

  // Handle map resize when container changes
  useEffect(() => {
    if (mapInstance) {
      setTimeout(() => {
        mapInstance.invalidateSize();
      }, 100);
    }
  }, [mapInstance]);

  if (!L) return <div className={`${className} bg-stone-50 rounded-xl`} />;

  // Create a custom travel-themed marker icon
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
    <div className={`${className} overflow-hidden rounded-xl border-2 border-amber-200 shadow-lg relative z-0 bg-gradient-to-br from-amber-50 to-orange-50`}>
      <MapContainer
        center={[center.lat, center.lng]}
        zoom={zoom}
        zoomControl={false}
        className="w-full h-full"
        ref={(map) => {
          if (map && !mapInstance) {
            setMapInstance(map);
          }
        }}
      >
        <TileLayer
          url={TILE_LAYER_URL}
          attribution={ATTRIBUTION}
        />
        <ZoomControl position="topright" />

        <MarkerClusterGroup>
          {markers.map((marker) => (
            <Marker
              key={marker.id}
              position={[marker.lat, marker.lng]}
              icon={createMarkerIcon(marker.placeName)}
              eventHandlers={{
                click: (e) => {
                  onMarkerClick?.(marker.id);
                  // Open popup on click
                  e.target.openPopup();
                }
              }}
            >
              <Popup className="travel-popup">
                <PhotoGridPopup
                  marker={marker}
                  onSeeDetails={() => {
                    onMarkerClick?.(marker.id);
                  }}
                />
              </Popup>
            </Marker>
          ))}
        </MarkerClusterGroup>
      </MapContainer>
    </div>
  );
}
