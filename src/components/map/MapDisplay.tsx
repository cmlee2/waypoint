'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import { TripMapProps } from '@/types/map';

const MapboxEngine = dynamic(() => import('./MapboxEngine'), { ssr: false });
const LeafletEngine = dynamic(() => import('./LeafletEngine'), { ssr: false });

interface MapDisplayProps extends TripMapProps {
  provider: 'mapbox' | 'leaflet';
}

/**
 * MapDisplay - The main map entry point that chooses the engine.
 * Accepts identical props for both providers.
 */
export default function MapDisplay({ provider, ...props }: MapDisplayProps) {
  if (provider === 'mapbox') {
    return <MapboxEngine {...props} />;
  }
  
  return <LeafletEngine {...props} />;
}
