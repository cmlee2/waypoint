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

type TripMarker = TripMapProps['markers'][number];

// Dynamically import Leaflet components (no SSR)
const MapContainer = dynamic(() => import('react-leaflet').then(mod => mod.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import('react-leaflet').then(mod => mod.TileLayer), { ssr: false });
const Marker = dynamic(
  () => import('react-leaflet').then(mod => mod.Marker),
  { ssr: false }
) as React.ComponentType<any>;
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
}>;

const MarkerClusterGroup = dynamic(
  async () => {
    const mod = await import('react-leaflet-markercluster');
    const ClusterGroup = mod.default as React.ComponentType<MarkerClusterGroupProps>;

    return function MarkerClusterGroupWrapper({
      children,
      onClusterReady,
      ...props
    }: MarkerClusterGroupProps & { onClusterReady?: (clusterGroup: any) => void }) {
      const clusterRef = useRef<any>(null);

      useEffect(() => {
        if (clusterRef.current) {
          onClusterReady?.(clusterRef.current);
        }
      }, [onClusterReady]);

      const ClusterGroupAny = ClusterGroup as any;
      return <ClusterGroupAny ref={clusterRef} {...props}>{children}</ClusterGroupAny>;
    };
  },
  { ssr: false }
);

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
  const clusterGroupRef = useRef<any>(null);

  useEffect(() => {
    import('leaflet').then(mod => {
      setL(mod.default);
    });
  }, []);

  // Handle map resize when container changes
  useEffect(() => {
    if (mapInstance) {
      // Invalidate size after a short delay to ensure container has final dimensions
      const timer = setTimeout(() => {
        mapInstance.invalidateSize();
        console.log('🗺️ Map size invalidated for proper centering');
      }, 100);

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
    const placeNames = clusterMarkers.map(m => m.placeName).filter(Boolean);
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

  const handleClusterReady = useCallback((clusterGroup: any) => {
    clusterGroupRef.current = clusterGroup;

    if (L && mapInstance) {
      const handleClusterClick = (e: any) => {
        console.log('📍 Cluster click event:', e.type, e.layer?.constructor?.name);

        // Only process if this is actually a cluster click
        if (!e.layer || typeof e.layer.getAllChildMarkers !== 'function') {
          console.log('📍 Not a cluster event, ignoring');
          return;
        }

        // Close any existing popups first
        mapInstance.closePopup();

        const cluster = e.layer || e.source || e.target;
        const childMarkers = cluster.getAllChildMarkers();

        console.log('📍 Processing cluster with', childMarkers.length, 'markers');

        if (childMarkers.length > 1) {
          const clusterMarkersData = childMarkers.map((childMarker: any) => {
            const childLat = childMarker.getLatLng().lat;
            const childLng = childMarker.getLatLng().lng;
            return markers.find(m => Math.abs(m.lat - childLat) < 0.0001 && Math.abs(m.lng - childLng) < 0.0001);
          }).filter(Boolean);

          if (clusterMarkersData.length > 0) {
            const uniqueTripIds = new Set(clusterMarkersData.map((m: any) => m.tripName || m.id));
            const isSingleTrip = uniqueTripIds.size === 1;
            const locationName = getLocationNameFromCluster(clusterMarkersData);

            const popup = L.popup({
              className: 'travel-popup',
              autoClose: false,
              closeOnClick: false,
              minWidth: 280,
              maxWidth: 380,
              closeButton: true
            });

            const popupContent = document.createElement('div');
            const containerId = `cluster-popup-${cluster._leaflet_id}`;
            popupContent.innerHTML = `<div id="${containerId}"></div>`;
            popup.setLatLng(e.latlng).setContent(popupContent).openOn(mapInstance);

            setTimeout(() => {
              const container = document.getElementById(containerId);
              if (container) {
                const root = ReactDOM.createRoot(container);
                if (isSingleTrip) {
                  // Collect all photos from the cluster markers
                  const allPhotos = clusterMarkersData.flatMap((marker: TripMarker) => marker.photos || []);

                  console.log('📍 Cluster photo data:', {
                    clusterMarkersCount: clusterMarkersData.length,
                    totalPhotos: allPhotos.length,
                    samplePhoto: allPhotos[0]
                  });

                  // Take top 4 photos for the grid
                  const topPhotos = allPhotos.slice(0, 4);

                  const combinedMarker = {
                    ...clusterMarkersData[0],
                    id: `cluster-${cluster._leaflet_id}`, // Unique ID for cluster popup
                    tripName: clusterMarkersData[0].tripName || 'Trip',
                    photoCount: allPhotos.length,
                    photos: topPhotos,
                    placeName: locationName,
                    startDate: clusterMarkersData
                      .map((marker: TripMarker) => marker.startDate)
                      .filter(Boolean)
                      .sort()[0],
                    endDate: clusterMarkersData
                      .map((marker: TripMarker) => marker.endDate)
                      .filter(Boolean)
                      .sort()
                      .reverse()[0]
                  };
                  root.render(
                    <PhotoGridPopup
                      marker={combinedMarker}
                      onPhotoClick={(photoId) => {
                        onMarkerClick?.(photoId);
                        popup.close();
                      }}
                    />
                  );
                } else {
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
              }
            }, 10);
          }
        }
      };

      clusterGroup.on('clusterclick', handleClusterClick);
    }
  }, [L, mapInstance, markers, onMarkerClick, onMapReady, getLocationNameFromCluster]);

  if (!L) return (
    <div className={`${className} bg-stone-50 rounded-xl flex items-center justify-center min-h-[400px] border-2 border-stone-200`}>
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
    <div className={`${className} overflow-hidden rounded-xl border-2 border-stone-200 shadow-sm relative z-0 min-h-[400px]`}>
      <MapContainer
        center={[center.lat, center.lng]}
        zoom={zoom}
        zoomControl={false}
        className="w-full h-full"
        ref={(map) => {
          if (map && !mapInstance) {
            setMapInstance(map);
            console.log('🗺️ Map instance created');
            // Call onMapReady callback when map is ready
            onMapReady?.();
          }
        }}
      >
        <TileLayer url={TILE_LAYER_URL} attribution={ATTRIBUTION} />
        <ZoomControl position="topright" />

        <MarkerClusterGroup
          onClusterReady={handleClusterReady}
          showCoverageOnHover={false}
          zoomToBoundsOnClick={false}
          spiderfyOnMaxZoom={true}
          maxClusterRadius={40}
          iconCreateFunction={(cluster: any) => {
            const count = cluster.getChildCount();
            const childMarkers = cluster.getAllChildMarkers();
            const clusterMarkersData = childMarkers.map((childMarker: any) => {
              const childLat = childMarker.getLatLng().lat;
              const childLng = childMarker.getLatLng().lng;
              return markers.find(m => Math.abs(m.lat - childLat) < 0.0001 && Math.abs(m.lng - childLng) < 0.0001);
            }).filter(Boolean);
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
                  e.target.openPopup();
                  onMarkerClick?.(marker.id);
                },
              }}
            >
              <Popup className="travel-popup" autoClose={false}>
                <PhotoGridPopup
                  marker={marker}
                  onPhotoClick={(photoId) => onMarkerClick?.(photoId)}
                />
              </Popup>
            </Marker>
          ))}
        </MarkerClusterGroup>
      </MapContainer>
    </div>
  );
}
