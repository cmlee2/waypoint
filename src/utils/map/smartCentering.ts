/**
 * Smart map centering utilities
 * Combines bounding box, centroid, and zoom calculations for optimal map positioning
 */

import { MapMarker, calculateBoundingBox, getBoundingBoxCenter, addPaddingToBoundingBox, areAllMarkersAtSameLocation } from './boundingBox';
import { calculateCentroid, calculateWeightedCentroid } from './centroid';
import { calculateConstrainedZoomLevel, calculateSingleMarkerZoom, calculateDefaultZoom } from './zoomLevel';

export interface SmartCenteringResult {
  center: { lat: number; lng: number };
  zoom: number;
  method: 'default' | 'single' | 'centroid' | 'bounding-box';
}

const DEFAULT_CENTER = { lat: 20, lng: 0 };

/**
 * Calculates optimal center and zoom for a set of markers
 * Uses intelligent algorithms to determine the best view
 */
export function calculateSmartCentering(
  markers: MapMarker[],
  options: {
    minZoom?: number;
    maxZoom?: number;
    useWeightedCentroid?: boolean;
    paddingFactor?: number;
  } = {}
): SmartCenteringResult {
  const {
    minZoom = 3,
    maxZoom = 15,
    useWeightedCentroid = false,
    paddingFactor = 0.1,
  } = options;

  // No markers - use default center and zoom
  if (markers.length === 0) {
    return {
      center: DEFAULT_CENTER,
      zoom: calculateDefaultZoom(),
      method: 'default',
    };
  }

  // Single marker - use single marker zoom
  if (markers.length === 1) {
    return {
      center: {
        lat: markers[0].lat,
        lng: markers[0].lng,
      },
      zoom: calculateSingleMarkerZoom(),
      method: 'single',
    };
  }

  // All markers at same location - use single marker zoom
  if (areAllMarkersAtSameLocation(markers)) {
    return {
      center: {
        lat: markers[0].lat,
        lng: markers[0].lng,
      },
      zoom: calculateSingleMarkerZoom(),
      method: 'single',
    };
  }

  // Calculate bounding box
  const boundingBox = calculateBoundingBox(markers);

  // Add padding for better visualization
  const paddedBoundingBox = addPaddingToBoundingBox(boundingBox, paddingFactor);

  // Calculate center from bounding box
  const center = getBoundingBoxCenter(paddedBoundingBox);

  // Calculate zoom level from bounding box
  const zoom = calculateConstrainedZoomLevel(paddedBoundingBox, minZoom, maxZoom);

  return {
    center,
    zoom,
    method: 'bounding-box',
  };
}

/**
 * Calculates centering using centroid method
 * Useful when you want to center on the "average" location
 */
export function calculateCentroidCentering(
  markers: MapMarker[],
  options: {
    minZoom?: number;
    maxZoom?: number;
    useWeighted?: boolean;
  } = {}
): SmartCenteringResult {
  const {
    minZoom = 3,
    maxZoom = 15,
    useWeighted = false,
  } = options;

  // No markers - use default center and zoom
  if (markers.length === 0) {
    return {
      center: DEFAULT_CENTER,
      zoom: calculateDefaultZoom(),
      method: 'default',
    };
  }

  // Calculate centroid
  const centroid = useWeighted
    ? calculateWeightedCentroid(markers)
    : calculateCentroid(markers);

  // Calculate bounding box for zoom level
  const boundingBox = calculateBoundingBox(markers);
  const zoom = calculateConstrainedZoomLevel(boundingBox, minZoom, maxZoom);

  return {
    center: centroid,
    zoom,
    method: useWeighted ? 'centroid' : 'centroid',
  };
}

/**
 * Fits all markers in the viewport with optimal zoom
 */
export function fitAllMarkers(
  markers: MapMarker[],
  options: {
    minZoom?: number;
    maxZoom?: number;
    paddingFactor?: number;
  } = {}
): SmartCenteringResult {
  return calculateSmartCentering(markers, options);
}