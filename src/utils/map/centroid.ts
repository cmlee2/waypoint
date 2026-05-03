/**
 * Centroid calculation utilities for map centering
 */

import { MapMarker } from './boundingBox';

export interface CenterPoint {
  lat: number;
  lng: number;
}

const DEFAULT_CENTER: CenterPoint = {
  lat: 20,
  lng: 0,
};

/**
 * Calculates the geographic centroid of a set of map markers
 * Uses simple arithmetic mean of all coordinates
 */
export function calculateCentroid(markers: MapMarker[]): CenterPoint {
  if (markers.length === 0) {
    return DEFAULT_CENTER;
  }

  if (markers.length === 1) {
    return {
      lat: markers[0].lat,
      lng: markers[0].lng,
    };
  }

  const lats = markers.map(m => m.lat);
  const lngs = markers.map(m => m.lng);

  return {
    lat: lats.reduce((sum, lat) => sum + lat, 0) / lats.length,
    lng: lngs.reduce((sum, lng) => sum + lng, 0) / lngs.length,
  };
}

/**
 * Calculates a weighted centroid based on photo count
 * Markers with more photos have more influence on the center
 */
export function calculateWeightedCentroid(markers: MapMarker[]): CenterPoint {
  if (markers.length === 0) {
    return DEFAULT_CENTER;
  }

  if (markers.length === 1) {
    return {
      lat: markers[0].lat,
      lng: markers[0].lng,
    };
  }

  let totalWeight = 0;
  let weightedLatSum = 0;
  let weightedLngSum = 0;

  for (const marker of markers) {
    const weight = marker.photoCount || 1;
    totalWeight += weight;
    weightedLatSum += marker.lat * weight;
    weightedLngSum += marker.lng * weight;
  }

  return {
    lat: weightedLatSum / totalWeight,
    lng: weightedLngSum / totalWeight,
  };
}

/**
 * Calculates the median centroid (more robust to outliers)
 */
export function calculateMedianCentroid(markers: MapMarker[]): CenterPoint {
  if (markers.length === 0) {
    return DEFAULT_CENTER;
  }

  if (markers.length === 1) {
    return {
      lat: markers[0].lat,
      lng: markers[0].lng,
    };
  }

  const lats = markers.map(m => m.lat).sort((a, b) => a - b);
  const lngs = markers.map(m => m.lng).sort((a, b) => a - b);

  const mid = Math.floor(lats.length / 2);

  return {
    lat: lats.length % 2 === 0
      ? (lats[mid - 1] + lats[mid]) / 2
      : lats[mid],
    lng: lngs.length % 2 === 0
      ? (lngs[mid - 1] + lngs[mid]) / 2
      : lngs[mid],
  };
}