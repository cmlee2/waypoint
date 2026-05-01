'use client';

import React, { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { TripMapProps } from '@/types/map';
import { truncatePlaceName } from '@/utils/location/formatAddress';
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

  useEffect(() => {
    // Import Leaflet directly for its L object (for icon creation)
    import('leaflet').then(mod => {
      setL(mod.default);
    });
  }, []);

  if (!L) return <div className={`${className} bg-stone-50 rounded-xl`} />;

  // Create a custom marker icon with truncated place name
  const createMarkerIcon = (placeName?: string) => {
    const truncatedName = truncatePlaceName(placeName || '', 25);
    return L.divIcon({
      className: 'custom-div-icon',
      html: `
        <div class="flex flex-col items-center">
          <div class="w-6 h-6 bg-stone-800 rounded-full border-2 border-white shadow-md flex items-center justify-center">
            <div class="w-2 h-2 bg-white rounded-full"></div>
          </div>
          ${truncatedName ? `<div class="mt-1 px-2 py-1 bg-white rounded-md shadow-sm text-xs font-medium text-stone-700 whitespace-nowrap max-w-[150px] overflow-hidden text-ellipsis">${truncatedName}</div>` : ''}
        </div>
      `,
      iconSize: [24, 24],
      iconAnchor: [12, 24]
    });
  };

  return (
    <div className={`${className} overflow-hidden rounded-xl border-2 border-stone-200 shadow-sm relative z-0`}>
      <MapContainer
        center={[center.lat, center.lng]}
        zoom={zoom}
        zoomControl={false}
        className="w-full h-full"
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
                click: () => onMarkerClick?.(marker.id),
              }}
            >
              <Popup>
                <div className="p-2 min-w-[200px]">
                  {marker.imageUrl && (
                    <img
                      src={marker.imageUrl}
                      alt={marker.tripName || marker.label || 'Trip'}
                      className="w-full h-24 object-cover rounded-lg mb-2"
                    />
                  )}
                  <h3 className="font-bold text-stone-900">
                    {marker.tripName || marker.label || 'Trip'}
                  </h3>
                  <p className="text-sm text-stone-600 mt-1">
                    {marker.photoCount || 0} memories
                    {marker.isPublic && !marker.isMine && (
                      <span className="ml-2 bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider text-[10px]">
                        Shared
                      </span>
                    )}
                  </p>
                </div>
              </Popup>
            </Marker>
          ))}
        </MarkerClusterGroup>
      </MapContainer>
    </div>
  );
}
