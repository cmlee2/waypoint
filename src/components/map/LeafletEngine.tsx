'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { TripMapProps } from '@/types/map';
import { truncatePlaceName } from '@/utils/location/formatAddress';
import PhotoGridPopup from './PhotoGridPopup';
import ClusteredTripsPopup from './ClusteredTripsPopup';
import 'leaflet/dist/leaflet.css';
import 'react-leaflet-markercluster/styles';
import ReactDOM from 'react-dom/client';

// CartoDB Positron - Minimalist light style
const TILE_LAYER_URL = "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png";
const ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>';

export default function LeafletEngine({ 
  center, 
  zoom, 
  markers, 
  onMarkerClick,
  selectedMarkerId,
  showSeeDetails = true,
  className 
}: TripMapProps) {
  const [L, setL] = useState<any>(null);
  const [mapInstance, setMapInstance] = useState<any>(null);
  const [MapComponents, setMapComponents] = useState<any>(null);
  
  const clusterGroupRef = useRef<any>(null);
  const markersRef = useRef<Map<string, any>>(new Map());

  // Consolidated loading
  useEffect(() => {
    const loadLeaflet = async () => {
      try {
        const [Leaflet, ReactLeaflet, MarkerCluster] = await Promise.all([
          import('leaflet'),
          import('react-leaflet'),
          import('react-leaflet-markercluster')
        ]);

        setL(Leaflet.default);
        setMapComponents({
          MapContainer: ReactLeaflet.MapContainer,
          TileLayer: ReactLeaflet.TileLayer,
          Marker: ReactLeaflet.Marker,
          Popup: ReactLeaflet.Popup,
          ZoomControl: ReactLeaflet.ZoomControl,
          MarkerClusterGroup: MarkerCluster.default
        });
      } catch (error) {
        console.error('❌ Failed to load Leaflet components:', error);
      }
    };

    loadLeaflet();
  }, []);

  // Sync external selection
  useEffect(() => {
    if (mapInstance && selectedMarkerId && clusterGroupRef.current) {
      const marker = markersRef.current.get(selectedMarkerId);
      if (marker) {
        const visibleParent = clusterGroupRef.current.getVisibleParent(marker);
        if (visibleParent && visibleParent !== marker) {
          clusterGroupRef.current.zoomToShowLayer(marker, () => {
            setTimeout(() => {
              if (mapInstance) mapInstance.panTo(marker.getLatLng());
              marker.openPopup();
            }, 100);
          });
        } else {
          mapInstance.panTo(marker.getLatLng());
          marker.openPopup();
        }
      }
    }
  }, [selectedMarkerId, mapInstance]);

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
    if (!clusterGroup || clusterGroupRef.current === clusterGroup) return;
    clusterGroupRef.current = clusterGroup;
    
    if (L && mapInstance) {
      const handleClusterClick = (e: any) => {
        const cluster = e.layer || e.source || e.target;
        if (cluster && typeof cluster.getAllChildMarkers === 'function') {
          const childMarkers = cluster.getAllChildMarkers();
          if (childMarkers.length > 1) {
            const clusterMarkersData = childMarkers.map((childMarker: any) => {
              const childLat = childMarker.getLatLng().lat;
              const childLng = childMarker.getLatLng().lng;
              return markers.find(m => Math.abs(m.lat - childLat) < 0.0001 && Math.abs(m.lng - childLng) < 0.0001);
            }).filter(Boolean);

            if (clusterMarkersData.length > 0) {
              const uniqueTripNames = new Set(clusterMarkersData.map((m: any) => m.tripName || m.id));
              const isSingleTrip = uniqueTripNames.size === 1;
              const locationName = getLocationNameFromCluster(clusterMarkersData);

              const popup = L.popup({
                className: 'travel-popup',
                autoClose: false,
                closeOnClick: false,
                minWidth: 280,
                maxWidth: 320,
                offset: [0, -20]
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
                    const combinedMarker = {
                      ...clusterMarkersData[0],
                      photoCount: clusterMarkersData.length,
                      photos: clusterMarkersData.flatMap((m: any) => m.photos || []),
                      placeName: locationName,
                      startDate: clusterMarkersData.map((m: any) => m.startDate).filter(Boolean).sort()[0],
                      endDate: clusterMarkersData.map((m: any) => m.endDate).filter(Boolean).sort().reverse()[0]
                    };
                    root.render(
                      <PhotoGridPopup 
                        marker={combinedMarker} 
                        onSeeDetails={showSeeDetails ? () => onMarkerClick?.(clusterMarkersData[0].id) : undefined}
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
        }
      };

      clusterGroup.on('clusterclick', handleClusterClick);
    }
  }, [L, mapInstance, markers, onMarkerClick, showSeeDetails, getLocationNameFromCluster]);

  if (!L || !MapComponents) return (
    <div className={`${className} bg-stone-50 rounded-xl flex items-center justify-center min-h-[400px] border-2 border-stone-200`}>
      <div className="text-stone-400 font-medium animate-pulse flex flex-col items-center gap-2">
        <div className="w-6 h-6 border-2 border-stone-300 border-t-stone-500 rounded-full animate-spin"></div>
        Loading Atlas...
      </div>
    </div>
  );

  const { MapContainer, TileLayer, Marker, Popup, ZoomControl, MarkerClusterGroup } = MapComponents;

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

  return (
    <div className={`${className} overflow-hidden rounded-xl border-2 border-stone-200 shadow-sm relative z-0 min-h-[400px]`}>
      <MapContainer
        center={[center.lat, center.lng]}
        zoom={zoom}
        zoomControl={false}
        className="w-full h-full"
        ref={setMapInstance}
      >
        <TileLayer url={TILE_LAYER_URL} attribution={ATTRIBUTION} />
        <ZoomControl position="topright" />
        
        <MarkerClusterGroup
          ref={handleClusterReady}
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
              ref={(ref: any) => {
                if (ref) markersRef.current.set(marker.id, ref);
              }}
              eventHandlers={{
                click: () => onMarkerClick?.(marker.id),
              }}
            >
              <Popup className="travel-popup" autoClose={false} closeOnClick={false}>
                <PhotoGridPopup 
                  marker={marker} 
                  onSeeDetails={showSeeDetails ? () => onMarkerClick?.(marker.id) : undefined}
                />
              </Popup>
            </Marker>
          ))}
        </MarkerClusterGroup>
      </MapContainer>
    </div>
  );
}
