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
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" fill="#8B4513" stroke="#5D3A1A" stroke-width="1"/>
              <circle cx="12" cy="9" r="1.5" fill="#FEF3E2"/>
            </svg>
          </div>
          ${truncatedName ? `<div class="mt-1 px-3 py-1.5 bg-amber-50/90 backdrop-blur-sm rounded-lg shadow-md border border-amber-200 text-xs font-semibold text-amber-900 whitespace-nowrap max-w-[150px] overflow-hidden text-ellipsis">${truncatedName}</div>` : ''}
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
                click: () => onMarkerClick?.(marker.id),
                mouseover: (e) => {
                  e.target.openPopup();
                },
                mouseout: (e) => {
                  e.target.closePopup();
                }
              }}
            >
              <Popup className="travel-popup">
                <div className="p-3 min-w-[220px] bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl">
                  {marker.imageUrl && (
                    <div className="relative mb-3">
                      <img
                        src={marker.imageUrl}
                        alt={marker.tripName || marker.label || 'Trip'}
                        className="w-full h-28 object-cover rounded-lg shadow-md border-2 border-amber-200"
                      />
                      <div className="absolute inset-0 rounded-lg shadow-inner border border-white/20"></div>
                    </div>
                  )}
                  <div className="space-y-2">
                    <h3 className="font-bold text-amber-900 text-lg leading-tight">
                      {marker.tripName || marker.label || 'Trip'}
                    </h3>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-amber-700 font-medium">
                        {marker.photoCount || 0} memories
                      </span>
                      {marker.isPublic && !marker.isMine && (
                        <span className="bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider text-[10px] border border-amber-200">
                          Shared
                        </span>
                      )}
                    </div>
                    {marker.placeName && (
                      <p className="text-xs text-amber-600 italic flex items-center gap-1">
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                        </svg>
                        {marker.placeName}
                      </p>
                    )}
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}
        </MarkerClusterGroup>
      </MapContainer>
    </div>
  );
}
