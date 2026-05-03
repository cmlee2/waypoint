/**
 * Nominatim (OpenStreetMap) reverse geocoding utilities
 * Converts GPS coordinates to place names and types
 */

import { createRateLimitedFetch } from '@/lib/rate-limit-monitor';

export interface PlaceInfo {
  name: string;
  type: string;
  category: string;
  displayName: string;
  address: {
    road?: string;
    city?: string;
    county?: string;
    state?: string;
    country?: string;
    postcode?: string;
  };
}

// Rate limit: 1 request per second (Nominatim requirement)
const rateLimitedFetch = createRateLimitedFetch('nominatim', 1000);

// In-memory cache for reverse geocoding results
const reverseGeocodeCache = new Map<string, PlaceInfo>();
const CACHE_MAX_SIZE = 50;

/**
 * Generates a cache key from coordinates
 */
function getCacheKey(lat: number, lng: number): string {
  // Round to 5 decimal places (~1 meter precision) for cache key
  const roundedLat = Math.round(lat * 100000) / 100000;
  const roundedLng = Math.round(lng * 100000) / 100000;
  return `${roundedLat},${roundedLng}`;
}

/**
 * Adds a result to the cache
 */
function addToCache(key: string, result: PlaceInfo): void {
  // Remove oldest entry if cache is full
  if (reverseGeocodeCache.size >= CACHE_MAX_SIZE) {
    const firstKey = reverseGeocodeCache.keys().next().value;
    reverseGeocodeCache.delete(firstKey);
  }
  reverseGeocodeCache.set(key, result);
}

/**
 * Performs reverse geocoding using Nominatim API
 * Converts GPS coordinates to place information
 */
export async function reverseGeocode(
  lat: number,
  lng: number
): Promise<PlaceInfo | null> {
  try {
    // Check cache first
    const cacheKey = getCacheKey(lat, lng);
    const cachedResult = reverseGeocodeCache.get(cacheKey);
    if (cachedResult) {
      console.log('📦 Using cached reverse geocoding result for:', cacheKey);
      return cachedResult;
    }

    console.log('🔍 Performing reverse geocoding for:', { lat, lng });

    // Use rate-limited fetch
    const response = await rateLimitedFetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
      {
        headers: {
          'User-Agent': 'WaypointTravel/1.0', // Identify your application
        },
      }
    );

    if (!response.ok) {
      console.error('❌ Nominatim reverse geocoding failed:', response.status, response.statusText);
      return null;
    }

    const data = await response.json();

    if (!data || data.error) {
      console.error('❌ Nominatim returned error:', data?.error);
      return null;
    }

    // Parse the response
    const placeInfo: PlaceInfo = {
      name: data.name || data.display_name.split(',')[0] || 'Unknown Place',
      type: data.type || 'unknown',
      category: data.category || 'unknown',
      displayName: data.display_name || '',
      address: {
        road: data.address?.road,
        city: data.address?.city || data.address?.town || data.address?.village,
        county: data.address?.county,
        state: data.address?.state,
        country: data.address?.country,
        postcode: data.address?.postcode,
      },
    };

    console.log('✅ Reverse geocoding successful:', {
      name: placeInfo.name,
      type: placeInfo.type,
      category: placeInfo.category,
    });

    // Add to cache
    addToCache(cacheKey, placeInfo);

    return placeInfo;
  } catch (error) {
    console.error('❌ Reverse geocoding error:', error);
    return null;
  }
}

/**
 * Performs batch reverse geocoding for multiple coordinates
 * Respects rate limits by processing sequentially
 */
export async function batchReverseGeocode(
  coordinates: Array<{ lat: number; lng: number }>
): Promise<Array<PlaceInfo | null>> {
  const results: Array<PlaceInfo | null> = [];

  for (const coord of coordinates) {
    const result = await reverseGeocode(coord.lat, coord.lng);
    results.push(result);
  }

  return results;
}

/**
 * Clears the reverse geocoding cache
 */
export function clearReverseGeocodeCache(): void {
  reverseGeocodeCache.clear();
  console.log('🗑️ Reverse geocoding cache cleared');
}

/**
 * Gets cache statistics
 */
export function getReverseGeocodeCacheStats(): {
  size: number;
  maxSize: number;
} {
  return {
    size: reverseGeocodeCache.size,
    maxSize: CACHE_MAX_SIZE,
  };
}