'use client';

import React, { useState } from 'react';
import MapDisplay from '@/components/map/MapDisplay';
import { MapMarker } from '@/types/map';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { calculateSmartCentering } from '@/utils/map/smartCentering';

interface Trip {
  id: string;
  name: string;
  user_id: string;
  isMine: boolean;
  coverPhoto?: string;
  photoCount: number;
}

interface DashboardClientProps {
  trips: Trip[];
  markers: MapMarker[];
  initialCenter: { lat: number; lng: number };
  initialZoom: number;
  isAuthenticated: boolean;
}

export default function DashboardClient({
  trips,
  markers,
  initialCenter,
  initialZoom,
  isAuthenticated,
}: DashboardClientProps) {
  const router = useRouter();
  const [hoveredTripId, setHoveredTripId] = useState<string | null>(null);
  const [showSidebar, setShowSidebar] = useState(isAuthenticated);
  const [mapKey, setMapKey] = useState(0); // Force map remount on sidebar toggle
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null);
  const [mapCenter, setMapCenter] = useState(initialCenter);
  const [mapZoom, setMapZoom] = useState(initialZoom);

  const handleMarkerClick = (id: string) => {
    // Find the trip and its photos
    const trip = trips.find(t => t.id === id);
    if (!trip) return;

    // Get all photos for this trip
    const tripMarkers = markers.filter(m => m.id === id);

    if (tripMarkers.length > 0) {
      // Calculate optimal center and zoom for this trip
      const centeringResult = calculateSmartCentering(tripMarkers, {
        minZoom: 10,
        maxZoom: 15,
        paddingFactor: 0.1
      });

      // Update map to focus on this trip
      setMapCenter(centeringResult.center);
      setMapZoom(centeringResult.zoom);
      setSelectedTripId(id);
    } else {
      // Fallback to navigation if no markers
      router.push(`/trips/${id}`);
    }
  };

  const handleBackToAllTrips = () => {
    setSelectedTripId(null);
    setMapCenter(initialCenter);
    setMapZoom(initialZoom);
  };

  const handleSidebarToggle = () => {
    setShowSidebar((current) => !current);
    setMapKey(prev => prev + 1); // Force map to remount and recalculate size
  };

  return (
    <div className="flex-1 flex flex-col md:flex-row h-full bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50">
      {/* Sidebar: Trip List */}
      {isAuthenticated && showSidebar && (
        <aside className="w-full md:w-80 lg:w-96 bg-gradient-to-b from-amber-50 to-orange-50 border-r-2 border-amber-200 overflow-y-auto flex flex-col z-10 shadow-xl md:shadow-none">
          <div className="p-4 flex-1 space-y-4">
            {trips.length === 0 ? (
              <div className="text-center p-8 bg-white/60 backdrop-blur-sm rounded-2xl border-2 border-dashed border-amber-300 shadow-sm">
                <p className="text-amber-700 mb-4 font-medium">Your map is empty.</p>
                <Link
                  href="/trips/new"
                  className="inline-block px-6 py-2.5 bg-gradient-to-r from-amber-600 to-orange-600 text-white font-semibold rounded-full text-sm hover:from-amber-700 hover:to-orange-700 transition-all shadow-md hover:shadow-lg"
                >
                  Add First Trip
                </Link>
              </div>
            ) : (
              trips.map((trip) => {
                return (
                  <div
                    key={trip.id}
                    onClick={() => router.push(`/trips/${trip.id}`)}
                    onMouseEnter={() => setHoveredTripId(trip.id)}
                    onMouseLeave={() => setHoveredTripId(null)}
                    className={`
                      group p-4 rounded-2xl transition-all cursor-pointer flex gap-4 items-center border-2
                      ${hoveredTripId === trip.id ? 'bg-white shadow-lg border-amber-300 transform scale-[1.02]' : 'bg-white/70 backdrop-blur-sm border-transparent hover:border-amber-200 hover:shadow-md'}
                    `}
                  >
                    <div className="w-20 h-20 rounded-xl bg-gradient-to-br from-amber-100 to-orange-100 overflow-hidden flex-shrink-0 border-2 border-amber-200 shadow-sm">
                      {trip.coverPhoto ? (
                        <img src={trip.coverPhoto} alt={trip.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-amber-400 text-xs font-bold uppercase tracking-wider">
                          Map
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-amber-900 truncate text-lg">{trip.name}</h3>
                      <p className="text-xs text-amber-700 mt-1.5 flex items-center gap-2">
                        {!trip.isMine && <span className="bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider text-[10px] border border-amber-200">Shared</span>}
                        <span className="font-medium">{trip.photoCount} memories</span>
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </aside>
      )}

      {/* Main Content: Map */}
      <main className="flex-1 relative bg-gradient-to-br from-amber-100 to-orange-100 h-[50vh] md:h-auto">
        {isAuthenticated && (
          <button
            type="button"
            onClick={handleSidebarToggle}
            className="absolute top-4 left-4 z-[1000] rounded-full bg-gradient-to-r from-amber-50 to-orange-50 px-5 py-2.5 text-sm font-semibold text-amber-900 shadow-xl ring-2 ring-amber-200 transition hover:from-amber-100 hover:to-orange-100 hover:shadow-2xl border border-amber-300"
          >
            {showSidebar ? 'Hide Trips' : 'Show Trips'}
          </button>
        )}

        {/* Back to all trips button */}
        {selectedTripId && (
          <button
            type="button"
            onClick={handleBackToAllTrips}
            className="absolute top-4 right-4 z-[1000] rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-amber-900 shadow-xl ring-2 ring-amber-200 transition hover:bg-amber-50 hover:shadow-2xl border border-amber-300 flex items-center gap-2"
          >
            <ArrowLeft size={16} />
            Back to All Trips
          </button>
        )}

        <MapDisplay
          key={mapKey}
          provider="leaflet"
          center={mapCenter}
          zoom={mapZoom}
          markers={selectedTripId ? markers.filter(m => m.id === selectedTripId) : markers}
          onMarkerClick={handleMarkerClick}
          className="w-full h-full"
        />
      </main>
    </div>
  );
}
