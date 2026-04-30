export interface AddressDetails {
  placeName: string;
  street?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  fullAddress: string;
}

/**
 * Parses Nominatim's display_name into structured address components
 * Nominatim format: "Place Name, Street, City, State, Country, Postal Code"
 */
export function parseNominatimAddress(displayName: string): AddressDetails {
  if (!displayName) {
    return {
      placeName: '',
      fullAddress: '',
    };
  }

  const parts = displayName.split(',').map((part) => part.trim());
  const result: AddressDetails = {
    placeName: parts[0] || '',
    fullAddress: displayName,
  };

  // Try to extract structured components
  // This is a simplified parser - Nominatim provides structured data in the address object
  // but we're working with display_name for simplicity
  if (parts.length > 1) {
    result.street = parts[1];
  }
  if (parts.length > 2) {
    result.city = parts[2];
  }
  if (parts.length > 3) {
    result.state = parts[3];
  }
  if (parts.length > 4) {
    result.country = parts[4];
  }
  if (parts.length > 5) {
    result.postalCode = parts[5];
  }

  return result;
}

/**
 * Formats an address for display in search results
 * Shows: "Place Name | City, Country"
 */
export function formatAddressForSearch(displayName: string): string {
  const details = parseNominatimAddress(displayName);

  if (!details.placeName) {
    return displayName;
  }

  // Build city, country part
  const locationParts = [];
  if (details.city) {
    locationParts.push(details.city);
  }
  if (details.country && details.country !== details.city) {
    locationParts.push(details.country);
  }

  const locationString = locationParts.length > 0 ? locationParts.join(', ') : '';

  return locationString
    ? `${details.placeName} | ${locationString}`
    : details.placeName;
}

/**
 * Truncates a place name to a maximum length
 * Used for map marker labels
 */
export function truncatePlaceName(name: string, maxLength: number = 25): string {
  if (!name) return '';
  return name.length > maxLength ? name.substring(0, maxLength - 3) + '...' : name;
}

/**
 * Formats coordinates for display
 */
export function formatCoordinates(lat: number, lng: number): string {
  return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
}

/**
 * Formats a full address for display in popups
 * Shows: place name, full address, coordinates
 */
export function formatAddressForPopup(
  displayName: string,
  lat: number,
  lng: number,
  date?: Date
): {
  placeName: string;
  address: string;
  coordinates: string;
  date?: string;
} {
  const details = parseNominatimAddress(displayName);

  return {
    placeName: details.placeName,
    address: details.fullAddress,
    coordinates: formatCoordinates(lat, lng),
    date: date ? date.toLocaleDateString() : undefined,
  };
}
