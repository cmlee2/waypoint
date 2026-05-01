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
}

export interface TripMapProps {
  center: { lat: number; lng: number };
  zoom: number;
  markers: MapMarker[];
  onMarkerClick?: (id: string) => void;
  className?: string;
}
