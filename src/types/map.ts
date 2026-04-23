export interface MapMarker {
  id: string;
  lat: number;
  lng: number;
  label?: string;
  imageUrl?: string;
}

export interface TripMapProps {
  center: { lat: number; lng: number };
  zoom: number;
  markers: MapMarker[];
  onMarkerClick?: (id: string) => void;
  className?: string;
}
