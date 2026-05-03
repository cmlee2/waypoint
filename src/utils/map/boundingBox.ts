/**
 * Bounding box calculation utilities for map centering
 */

export interface BoundingBox {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
}

export interface MapMarker {
  id: string;
  lat: number;
  lng: number;
  label?: string;
  placeName?: string;
  imageUrl?: string;
  tripName?: string;
  photoCount?: number;
  isPublic?: boolean;
  isMine?: boolean;
}

const DEFAULT_BOUNDING_BOX: BoundingBox = {
  minLat: -90,
  maxLat: 90,
  minLng: -180,
  maxLng: 180,
};

/**
 * Calculates the bounding box from a set of map markers
 */
export function calculateBoundingBox(markers: MapMarker[]): BoundingBox {
  if (markers.length === 0) {
    return DEFAULT_BOUNDING_BOX;
  }

  if (markers.length === 1) {
    const marker = markers[0];
    // Add a small buffer around single marker
    const buffer = 0.01; // ~1km
    return {
      minLat: marker.lat - buffer,
      maxLat: marker.lat + buffer,
      minLng: marker.lng - buffer,
      maxLng: marker.lng + buffer,
    };
  }

  const lats = markers.map(m => m.lat);
  const lngs = markers.map(m => m.lng);

  return {
    minLat: Math.min(...lats),
    maxLat: Math.max(...lats),
    minLng: Math.min(...lngs),
    maxLng: Math.max(...lngs),
  };
}

/**
 * Calculates the center point of a bounding box
 */
export function getBoundingBoxCenter(boundingBox: BoundingBox): { lat: number; lng: number } {
  return {
    lat: (boundingBox.minLat + boundingBox.maxLat) / 2,
    lng: (boundingBox.minLng + boundingBox.maxLng) / 2,
  };
}

/**
 * Calculates the size (width and height) of a bounding box in degrees
 */
export function getBoundingBoxSize(boundingBox: BoundingBox): { latDiff: number; lngDiff: number } {
  return {
    latDiff: boundingBox.maxLat - boundingBox.minLat,
    lngDiff: boundingBox.maxLng - boundingBox.minLng,
  };
}

/**
 * Adds padding to a bounding box
 */
export function addPaddingToBoundingBox(
  boundingBox: BoundingBox,
  paddingFactor: number = 0.1 // 10% padding by default
): BoundingBox {
  const { latDiff, lngDiff } = getBoundingBoxSize(boundingBox);

  return {
    minLat: boundingBox.minLat - (latDiff * paddingFactor),
    maxLat: boundingBox.maxLat + (latDiff * paddingFactor),
    minLng: boundingBox.minLng - (lngDiff * paddingFactor),
    maxLng: boundingBox.maxLng + (lngDiff * paddingFactor),
  };
}

/**
 * Checks if all markers are at the same location
 */
export function areAllMarkersAtSameLocation(markers: MapMarker[]): boolean {
  if (markers.length <= 1) return true;

  const firstMarker = markers[0];
  return markers.every(marker =>
    marker.lat === firstMarker.lat && marker.lng === firstMarker.lng
  );
}