export interface MapMarkerPhoto {
  id: string;
  storage_url: string;
  caption?: string;
  lat?: number;
  lng?: number;
}

export interface MapMarker {
  id: string;
  lat: number;
  lng: number;
  label?: string;
  placeName?: string;
  imageUrl?: string;
  // Fields for hover popups
  tripName?: string;
  photoCount?: number;
  isPublic?: boolean;
  isMine?: boolean;
  // Date fields for trip listing
  startDate?: string;
  endDate?: string;
  // Photo array for grid preview
  photos?: MapMarkerPhoto[];
}

export interface TripMapProps {
  center: { lat: number; lng: number };
  zoom: number;
  markers: MapMarker[];
  onMarkerClick?: (id: string) => void;
  className?: string;
}
