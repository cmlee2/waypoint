'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { TripMapProps } from '@/types/map';
import { truncatePlaceName } from '@/utils/location/formatAddress';
import PhotoGridPopup from './PhotoGridPopup';
import ClusteredTripsPopup from './ClusteredTripsPopup';
import 'leaflet/dist/leaflet.css';
import 'react-leaflet-markercluster/styles';
import ReactDOM from 'react-dom/client';
import { useMap } from 'react-leaflet';
import { twMerge } from 'tailwind-merge';
import { clsx, type ClassValue } from 'clsx';
import { Layers, Map as MapIcon, Sun, Moon, TreePine } from 'lucide-react';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

type TripMarker = TripMapProps['markers'][number];

const MAP_STYLES = {
  light: {
    name: 'Light',
    url: "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
    icon: Sun
  },
  dark: {
    name: 'Dark',
    url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
    icon: Moon
  },
  streets: {
    name: 'Streets',
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    icon: MapIcon
  },
  outdoor: {
    name: 'Outdoor',
    url: "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png",
    attribution: 'Map data: &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, <a href="http://viewfinderpanoramas.org">SRTM</a> | Map style: &copy; <a href="https://opentopomap.org">OpenTopoMap</a> (<a href="https://creativecommons.org/licenses/by-sa/3.0/">CC-BY-SA</a>)',
    icon: TreePine
  }
};

type MapStyleKey = keyof typeof MAP_STYLES;

function MapEventListener({ onMapInstance }: { onMapInstance: (map: any) => void }) {
  const map = useMap();
  useEffect(() => {
    if (map) {
      onMapInstance(map);
    }
  }, [map, onMapInstance]);
  return null;
}

// Dynamically import Leaflet components (no SSR)
const MapContainer = dynamic(() => import('react-leaflet').then(mod => mod.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import('react-leaflet').then(mod => mod.TileLayer), { ssr: false });
const Marker = dynamic(() => import('react-leaflet').then(mod => mod.Marker), { ssr: false });
const Popup = dynamic(() => import('react-leaflet').then(mod => mod.Popup), { ssr: false });
const ZoomControl = dynamic(() => import('react-leaflet').then(mod => mod.ZoomControl), { ssr: false });

type MarkerClusterGroupProps = React.PropsWithChildren<{
  showCoverageOnHover?: boolean;
  zoomToBoundsOnClick?: boolean;
  spiderfyOnMaxZoom?: boolean;
  maxClusterRadius?: number;
  disableClusteringAtZoom?: number;
  iconCreateFunction?: (cluster: any) => any;
  onClusterReady?: (clusterGroup: any) => void;
  eventHandlers?: Record<string, (e: any) => void>;
}>;

const MarkerClusterGroup = dynamic<MarkerClusterGroupProps>(
  async () => {
    const mod = await import('react-leaflet-markercluster');
    const ClusterGroup = mod.default as React.ComponentType<any>;

    return function MarkerClusterGroupWrapper(props: MarkerClusterGroupProps) {
      return <ClusterGroup {...props} />;
    };
  },
  { ssr: false }
) as React.ComponentType<MarkerClusterGroupProps>;

// CartoDB Positron - Minimalist light style
const TILE_LAYER_URL = "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png";
const ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>';

export default function LeafletEngine({
  center,
  zoom,
  markers,
  onMarkerClick,
  onMapReady,
  className
}: TripMapProps) {
  const [L, setL] = useState<any>(null);
  const [mapInstance, setMapInstance] = useState<any>(null);
  const [mapStyle, setMapStyle] = useState<MapStyleKey>('light');

  // Sync website theme with map style
  useEffect(() => {
    if (mapStyle === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [mapStyle]);

  useEffect(() => {
    import('leaflet').then(mod => {
      setL(mod.default);
    });
  }, []);

  // Handle map center/zoom updates
  useEffect(() => {
    if (mapInstance && center && zoom) {
      console.log('🗺️ Updating map view to:', center, 'zoom:', zoom);
      mapInstance.setView([center.lat, center.lng], zoom);
    }
  }, [mapInstance, center.lat, center.lng, zoom]);

  // Handle map resize when container changes
  useEffect(() => {
    if (mapInstance) {
      // Invalidate size after a short delay to ensure container has final dimensions
      const timer = setTimeout(() => {
        const container = mapInstance.getContainer();
        const { offsetWidth, offsetHeight } = container;
        console.log('🗺️ Map container size:', offsetWidth, 'x', offsetHeight);

        mapInstance.invalidateSize();
        console.log('🗺️ Map size invalidated for proper centering');
      }, 200);

      return () => clearTimeout(timer);
    }
  }, [mapInstance]);

  // Add resize observer to handle container size changes
  useEffect(() => {
    if (mapInstance && mapInstance._container) {
      const resizeObserver = new ResizeObserver(() => {
        mapInstance.invalidateSize();
      });

      resizeObserver.observe(mapInstance._container);

      return () => {
        resizeObserver.disconnect();
      };
    }
  }, [mapInstance]);

  const getLocationNameFromCluster = useCallback((clusterMarkers: any[]): string => {
    if (clusterMarkers.length === 0) return 'Trip Spot';
    const placeNames = clusterMarkers
      .map((m) => m.placeName)
      .filter((placeName): placeName is string => Boolean(placeName));
    if (placeNames.length > 0) {
      const nameCounts = placeNames.reduce<Record<string, number>>((acc, name) => {
        acc[name] = (acc[name] || 0) + 1;
        return acc;
      }, {});
      const mostCommon = Object.entries<number>(nameCounts).sort((a, b) => b[1] - a[1])[0];
      return mostCommon ? mostCommon[0] : 'Multiple Locations';
    }
    return 'Trip Area';
  }, []);

  if (!L) return (
    <div className={cn(
      "bg-stone-50 rounded-xl flex items-center justify-center min-h-[400px] border-2 border-stone-200",
      className
    )}>
      <div className="text-stone-400 font-medium animate-pulse">Initializing Map...</div>
    </div>
  );

  const createMarkerIcon = (placeName?: string) => {
    const truncatedName = truncatePlaceName(placeName || '', 25);
    return L.divIcon({
      className: 'custom-div-icon',
      html: `
        <div class="flex flex-col items-center travel-marker">
          <div class="relative">
            <svg class="w-8 h-8 drop-shadow-lg" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" fill="#DC2626" stroke="#991B1B" stroke-width="1"/>
              <circle cx="12" cy="9" r="1.5" fill="#FEF2F2"/>
            </svg>
          </div>
          ${truncatedName ? `<div class="mt-1 px-3 py-1.5 bg-white/95 backdrop-blur-sm rounded-lg shadow-md border border-stone-100 text-xs font-semibold text-red-900 whitespace-nowrap max-w-[150px] overflow-hidden text-ellipsis">${truncatedName}</div>` : ''}
        </div>
      `,
      iconSize: [32, 32],
      iconAnchor: [16, 32]
    });
  };

  return (
    <div className={cn(
      "overflow-hidden relative z-0 w-full h-full group",
      className
    )}>
      {/* Map Style Switcher */}
      <div className="absolute top-4 right-14 z-[1000] flex flex-col gap-2">
        <div className="bg-white/90 backdrop-blur-md rounded-xl shadow-lg border border-stone-200 p-1 flex flex-col gap-1 overflow-hidden transition-all duration-300 hover:shadow-xl">
          {(Object.entries(MAP_STYLES) as [MapStyleKey, typeof MAP_STYLES.light][]).map(([key, style]) => {
            const Icon = style.icon;
            const isActive = mapStyle === key;
            return (
              <button
                key={key}
                onClick={() => setMapStyle(key)}
                className={cn(
                  "p-2 rounded-lg transition-all flex items-center gap-2 text-xs font-semibold group/btn",
                  isActive 
                    ? "bg-stone-900 text-white shadow-inner" 
                    : "text-stone-600 hover:bg-stone-100 hover:text-stone-900"
                )}
                title={style.name}
              >
                <Icon className={cn("w-4 h-4", isActive ? "text-amber-400" : "text-stone-400 group-hover/btn:text-stone-600")} />
                <span className={cn("hidden lg:block", isActive ? "opacity-100" : "opacity-60")}>{style.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      <MapContainer
        center={[center.lat, center.lng]}
        zoom={zoom}
        zoomControl={false}
        className="w-full h-full"
      >
        <MapEventListener onMapInstance={(map) => {
          if (!mapInstance) {
            console.log('🗺️ Map instance ready');
            setMapInstance(map);
            onMapReady?.();
          }
        }} />
        <TileLayer url={MAP_STYLES[mapStyle].url} attribution={MAP_STYLES[mapStyle].attribution} />
        <ZoomControl position="topright" />


        <MarkerClusterGroup
          showCoverageOnHover={false}
          zoomToBoundsOnClick={false}
          spiderfyOnMaxZoom={true}
          maxClusterRadius={40}
          disableClusteringAtZoom={15}
          eventHandlers={{
            clusterclick: (e: any) => {
              const cluster = e.layer;
              const childMarkers = cluster.getAllChildMarkers();
              
              if (childMarkers.length > 1) {
                const clusterMarkersData = childMarkers
                  .map((childMarker: any) => {
                    const childLat = childMarker.getLatLng().lat;
                    const childLng = childMarker.getLatLng().lng;
                    return markers.find(m => Math.abs(m.lat - childLat) < 0.0001 && Math.abs(m.lng - childLng) < 0.0001);
                  })
                  .filter((marker: TripMarker | undefined): marker is TripMarker => Boolean(marker));

                if (clusterMarkersData.length > 0) {
                  const locationName = getLocationNameFromCluster(clusterMarkersData);
                  const popup = L.popup({
                    className: 'travel-popup',
                    minWidth: 280,
                    maxWidth: 380,
                  });

                  const containerId = `cluster-popup-${cluster._leaflet_id}`;
                  const popupContent = document.createElement('div');
                  popupContent.innerHTML = `<div id="${containerId}"></div>`;
                  
                  popup.setLatLng(e.latlng).setContent(popupContent).openOn(mapInstance);

                  setTimeout(() => {
                    const container = document.getElementById(containerId);
                    if (container) {
                      const root = ReactDOM.createRoot(container);
                      root.render(
                        <ClusteredTripsPopup
                          markers={clusterMarkersData}
                          locationName={locationName}
                          onTripClick={(id) => {
                            onMarkerClick?.(id);
                            popup.close();
                          }}
                        />
                      );
                    }
                  }, 10);
                }
              }
            }
          }}
          iconCreateFunction={(cluster: any) => {
            const count = cluster.getChildCount();
            const childMarkers = cluster.getAllChildMarkers();
            const clusterMarkersData = childMarkers
              .map((childMarker: any) => {
                const childLat = childMarker.getLatLng().lat;
                const childLng = childMarker.getLatLng().lng;
                return markers.find((m) => Math.abs(m.lat - childLat) < 0.0001 && Math.abs(m.lng - childLng) < 0.0001);
              })
              .filter((marker: TripMarker | undefined): marker is TripMarker => Boolean(marker));
            const locationName = getLocationNameFromCluster(clusterMarkersData);

            return L.divIcon({
              className: 'custom-div-icon',
              html: `
                <div class="flex flex-col items-center travel-marker">
                  <div class="relative">
                    <svg class="w-10 h-10 drop-shadow-lg" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" fill="#DC2626" stroke="#991B1B" stroke-width="1"/>
                      <circle cx="12" cy="9" r="1.5" fill="#FEF2F2"/>
                    </svg>
                    <div class="absolute -top-1 -right-1 bg-amber-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center border-2 border-white">
                      ${count}
                    </div>
                  </div>
                  <div class="mt-1 px-3 py-1.5 bg-red-50/90 backdrop-blur-sm rounded-lg shadow-md border border-red-200 text-xs font-semibold text-red-900 whitespace-nowrap max-w-[150px] overflow-hidden text-ellipsis">
                    ${locationName}
                  </div>
                </div>
              `,
              iconSize: [40, 40],
              iconAnchor: [20, 40]
            });
          }}
        >
          {markers.map((marker) => (
            <Marker
              key={marker.id}
              position={[marker.lat, marker.lng]}
              icon={createMarkerIcon(marker.placeName)}
              eventHandlers={{
                click: (e: any) => {
                  console.log('📍 Individual marker clicked:', marker.id, marker.label);
                  // Check if this is actually a cluster event (shouldn't happen, but let's be safe)
                  if (e.source && typeof e.source.getAllChildMarkers === 'function') {
                    console.log('⚠️ WARNING: Cluster event triggered on individual marker!');
                    return; // Don't process cluster events here
                  }
                  e.target.openPopup();
                },
              }}
            >
              <Popup className="travel-popup" autoClose={false}>
                <PhotoGridPopup
                  marker={marker}
                  onSeeDetails={() => onMarkerClick?.(marker.id)}
                  onPhotoClick={onMarkerClick ? (photoId) => onMarkerClick(photoId) : undefined}
                />
              </Popup>
            </Marker>
          ))}
        </MarkerClusterGroup>
      </MapContainer>
    </div>
  );
}
