'use client';

import React, { useMemo } from 'react';
import Map, { Marker, NavigationControl } from 'react-map-gl/mapbox';
import 'mapbox-gl/dist/mapbox-gl.css';
import { TripMapProps } from '@/types/map';

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;

// Minimalist Light style
const MAP_STYLE = "mapbox://styles/mapbox/light-v11";

export default function MapboxEngine({ 
  center, 
  zoom, 
  markers, 
  onMarkerClick,
  className 
}: TripMapProps) {
  
  const initialViewState = useMemo(() => ({
    latitude: center.lat,
    longitude: center.lng,
    zoom: zoom
  }), [center.lat, center.lng, zoom]);

  if (!MAPBOX_TOKEN) {
    return (
      <div className={`${className} bg-stone-100 flex items-center justify-center text-stone-500 border-2 border-dashed border-stone-300 rounded-xl`}>
        Mapbox Token Missing
      </div>
    );
  }

  return (
    <div className={`${className} overflow-hidden rounded-xl border-2 border-stone-200 shadow-sm`}>
      <Map
        initialViewState={initialViewState}
        mapboxAccessToken={MAPBOX_TOKEN}
        mapStyle={MAP_STYLE}
        reuseMaps
      >
        <NavigationControl position="top-right" />
        
        {markers.map((marker) => (
          <Marker 
            key={marker.id}
            latitude={marker.lat}
            longitude={marker.lng}
            anchor="bottom"
            onClick={(e) => {
              e.originalEvent.stopPropagation();
              onMarkerClick?.(marker.id);
            }}
          >
            <div className="cursor-pointer group">
              {/* Minimalist Marker */}
              <div className="w-6 h-6 bg-stone-800 rounded-full border-2 border-white shadow-md group-hover:scale-125 transition-transform duration-200 flex items-center justify-center">
                <div className="w-2 h-2 bg-white rounded-full" />
              </div>
            </div>
          </Marker>
        ))}
      </Map>
    </div>
  );
}
