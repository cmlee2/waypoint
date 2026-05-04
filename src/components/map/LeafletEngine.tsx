'use client';

import React, { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { TripMapProps } from '@/types/map';
import { truncatePlaceName } from '@/utils/location/formatAddress';
import PhotoGridPopup from './PhotoGridPopup';
import ClusteredTripsPopup from './ClusteredTripsPopup';
import 'leaflet/dist/leaflet.css';
import 'react-leaflet-markercluster/styles';

// Import ReactDOM for client-side rendering
import ReactDOM from 'react-dom/client';

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
  eventHandlers?: {
    click?: (event: any) => void;
  };
}>;

const MarkerClusterGroup = dynamic(
  async () => {
    const mod = await import('react-leaflet-markercluster');
    const ClusterGroup = mod.default as React.ComponentType<MarkerClusterGroupProps>;

    return function MarkerClusterGroupWrapper({
      children,
      ...props
    }: MarkerClusterGroupProps) {
      return <ClusterGroup {...props}>{children}</ClusterGroup>;
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
  className
}: TripMapProps) {
  const [L, setL] = useState<any>(null);
  const [mapInstance, setMapInstance] = useState<any>(null);
  const [clusteredMarkers, setClusteredMarkers] = useState<Map<string, any>>(new Map());

  useEffect(() => {
    // Import Leaflet directly for its L object (for icon creation)
    import('leaflet').then(mod => {
      setL(mod.default);
    });
  }, []);

  // Handle map resize when container changes
  useEffect(() => {
    if (mapInstance) {
      setTimeout(() => {
        mapInstance.invalidateSize();
      }, 100);
    }
  }, [mapInstance]);

  if (!L) return <div className={`${className} bg-stone-50 rounded-xl`} />;

  // Create a custom travel-themed marker icon
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
          ${truncatedName ? `<div class="mt-1 px-3 py-1.5 bg-red-50/90 backdrop-blur-sm rounded-lg shadow-md border border-red-200 text-xs font-semibold text-red-900 whitespace-nowrap max-w-[150px] overflow-hidden text-ellipsis">${truncatedName}</div>` : ''}
        </div>
      `,
      iconSize: [32, 32],
      iconAnchor: [16, 32]
    });
  };

  // Get location name from cluster markers
  const getLocationNameFromCluster = (clusterMarkers: any[]): string => {
    if (clusterMarkers.length === 0) return 'Unknown Location';

    // Try to get a common location name from the markers
    const placeNames = clusterMarkers
      .map(m => m.options?.placeName)
      .filter(Boolean);

    if (placeNames.length > 0) {
      // Return the most common place name
      const nameCounts = placeNames.reduce<Record<string, number>>((acc, name) => {
        acc[name] = (acc[name] || 0) + 1;
        return acc;
      }, {});

      const mostCommon = Object.entries<number>(nameCounts).sort((a, b) => b[1] - a[1])[0];
      return mostCommon ? mostCommon[0] : 'Multiple Locations';
    }

    // Fallback to generic location name
    return 'Trip Area';
  };

  return (
    <div className={`${className} overflow-hidden rounded-xl border-2 border-amber-200 shadow-lg relative z-0 bg-gradient-to-br from-amber-50 to-orange-50`}>
      <MapContainer
        center={[center.lat, center.lng]}
        zoom={zoom}
        zoomControl={false}
        className="w-full h-full"
        ref={(map) => {
          if (map && !mapInstance) {
            setMapInstance(map);
            console.log('🗺️ Map instance created');
          }
        }}
      >
        <TileLayer
          url={TILE_LAYER_URL}
          attribution={ATTRIBUTION}
        />
        <ZoomControl position="topright" />

        <MarkerClusterGroup
          showCoverageOnHover={false}
          zoomToBoundsOnClick={false}
          spiderfyOnMaxZoom={true}
          maxClusterRadius={80}
          disableClusteringAtZoom={15}
          iconCreateFunction={(cluster: any) => {
            const childMarkers = cluster.getAllChildMarkers();
            const count = childMarkers.length;

            // Get location name from cluster
            const locationName = getLocationNameFromCluster(childMarkers);

            // Create cluster icon
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
          eventHandlers={{
            click: (e: any) => {
              const cluster = e.layer;
              const childMarkers = cluster.getAllChildMarkers();
              console.log('📍 Cluster clicked:', childMarkers.length, 'markers');

              if (childMarkers.length > 1) {
                // Get marker data from child markers
                const clusterMarkersData = childMarkers.map((childMarker: any) => {
                  const markerData = markers.find(m => m.id === childMarker.options?.id);
                  return markerData;
                }).filter(Boolean);

                if (clusterMarkersData.length > 0) {
                  // Get location name
                  const locationName = getLocationNameFromCluster(childMarkers);

                  // Create popup with clustered trips
                  const popup = L.popup({
                    className: 'travel-popup',
                    autoClose: false,
                    closeOnClick: false,
                    closeButton: true,
                    minWidth: 320,
                    maxWidth: 380,
                    keepInView: true
                  });

                  // Add popup lifecycle debugging
                  popup.on('add', () => {
                    console.log('📍 Cluster popup added to map');
                  });

                  popup.on('remove', () => {
                    console.log('📍 Cluster popup removed from map');
                  });

                  popup.on('close', () => {
                    console.log('📍 Cluster popup closed');
                  });

                  // Create popup content
                  const popupContent = document.createElement('div');
                  popupContent.innerHTML = `
                    <div id="clustered-trips-popup-${cluster._leaflet_id}"></div>
                  `;

                  popup.setLatLng(e.latlng).setContent(popupContent).openOn(mapInstance);

                  console.log('📍 Cluster popup opened:', {
                    locationName,
                    markersCount: clusterMarkersData.length,
                    popupId: cluster._leaflet_id
                  });

                  // Render React component into popup
                  setTimeout(() => {
                    const container = document.getElementById(`clustered-trips-popup-${cluster._leaflet_id}`);
                    console.log('📍 Cluster popup container:', container);
                    if (container) {
                      const root = ReactDOM.createRoot(container);
                      root.render(
                        <ClusteredTripsPopup
                          markers={clusterMarkersData}
                          locationName={locationName}
                          onTripClick={(tripId) => {
                            console.log('📍 Cluster trip clicked:', tripId);
                            onMarkerClick?.(tripId);
                            popup.close();
                          }}
                        />
                      );
                    } else {
                      console.error('❌ Cluster popup container not found');
                    }
                  }, 10);
                }
              }
            }
          }}
        >
          {markers.map((marker) => (
            <Marker
              key={marker.id}
              position={[marker.lat, marker.lng]}
              icon={createMarkerIcon(marker.placeName)}
              // Store marker data in options for cluster retrieval
              options={{
                id: marker.id,
                tripName: marker.tripName,
                placeName: marker.placeName,
                photoCount: marker.photoCount,
                photos: marker.photos
              }}
              eventHandlers={{
                click: (e: any) => {
                  console.log('📍 Marker clicked:', marker.id, marker.tripName);
                  // Prevent all event propagation
                  L.DomEvent.stopPropagation(e);
                  L.DomEvent.preventDefault(e);
                  L.DomEvent.stop(e);
                  e.originalEvent.stopPropagation();
                  e.originalEvent.preventDefault();
                  e.originalEvent.stopImmediatePropagation();

                  // Open popup immediately
                  e.target.openPopup();

                  // Force popup to stay open
                  setTimeout(() => {
                    const popup = e.target.getPopup();
                    if (popup) {
                      popup.options.autoClose = false;
                      popup.options.closeOnClick = false;
                      console.log('📍 Popup configured to stay open for:', marker.id);
                    }
                  }, 0);

                  // Call the click handler
                  onMarkerClick?.(marker.id);
                },
                popupopen: (e: any) => {
                  console.log('📍 Popup opened for:', marker.id);
                  e.target.options.autoClose = false;
                },
                popupclose: (e: any) => {
                  console.log('📍 Popup closed for:', marker.id);
                }
              }}
            >
              <Popup
                className="travel-popup"
                autoClose={false}
                closeOnClick={false}
                closeButton={true}
                minWidth={280}
                maxWidth={320}
                keepInView={true}
              >
                <PhotoGridPopup
                  marker={marker}
                  onSeeDetails={() => {
                    onMarkerClick?.(marker.id);
                  }}
                />
              </Popup>
            </Marker>
          ))}
        </MarkerClusterGroup>
      </MapContainer>
    </div>
  );
}
