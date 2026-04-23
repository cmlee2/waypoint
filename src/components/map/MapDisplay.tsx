'use client';

import React from 'react';
import MapboxEngine from './MapboxEngine';
import LeafletEngine from './LeafletEngine';
import { TripMapProps } from '@/types/map';

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
