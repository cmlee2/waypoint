/**
 * Zoom level calculation utilities for map centering
 */

import { BoundingBox } from './boundingBox';

/**
 * Calculates the appropriate zoom level based on bounding box size
 * Returns a zoom level that fits the bounding box comfortably in the viewport
 */
export function calculateZoomLevel(boundingBox: BoundingBox): number {
  const latDiff = boundingBox.maxLat - boundingBox.minLat;
  const lngDiff = boundingBox.maxLng - boundingBox.minLng;

  const maxDiff = Math.max(latDiff, lngDiff);

  // Zoom level thresholds (in degrees)
  // These are approximate values for typical map projections
  if (maxDiff < 0.01) {
    return 15; // Very small area (city block, ~1km)
  } else if (maxDiff < 0.05) {
    return 14; // Small area (neighborhood, ~5km)
  } else if (maxDiff < 0.1) {
    return 12; // Small area (neighborhood, ~10km)
  } else if (maxDiff < 0.5) {
    return 11; // Medium area (small city, ~50km)
  } else if (maxDiff < 1) {
    return 10; // Medium area (city, ~100km)
  } else if (maxDiff < 2) {
    return 9;  // Large area (region, ~200km)
  } else if (maxDiff < 5) {
    return 7;  // Large area (region, ~500km)
  } else if (maxDiff < 10) {
    return 6;  // Very large area (country, ~1000km)
  } else if (maxDiff < 20) {
    return 5;  // Very large area (large country, ~2000km)
  } else if (maxDiff < 50) {
    return 4;  // Continent
  } else {
    return 3;  // World view
  }
}

/**
 * Calculates zoom level with minimum and maximum constraints
 */
export function calculateConstrainedZoomLevel(
  boundingBox: BoundingBox,
  minZoom: number = 3,
  maxZoom: number = 15
): number {
  const zoom = calculateZoomLevel(boundingBox);
  return Math.max(minZoom, Math.min(maxZoom, zoom));
}

/**
 * Calculates zoom level for a single marker
 * Returns a zoom level that shows the local area around the marker
 */
export function calculateSingleMarkerZoom(): number {
  return 12; // City-level zoom for single marker
}

/**
 * Calculates default zoom level when no markers are present
 */
export function calculateDefaultZoom(): number {
  return 2; // World view when no markers
}