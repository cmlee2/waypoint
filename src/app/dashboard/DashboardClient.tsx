'use client';

import React, { useState, useEffect } from 'react';
import MapDisplay from '@/components/map/MapDisplay';
import { MapMarker } from '@/types/map';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Plus } from 'lucide-react';

interface Trip {
  id: string;
  name: string;
  user_id: string;
  isMine: boolean;
  coverPhoto?: string;
  photoCount: number;
  startDate?: string;
  endDate?: string;
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
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleMarkerClick = (id: string) => {
    console.log('📍 handleMarkerClick called for trip:', id);
    // Navigate to trip detail page
    router.push(`/trips/${id}`);
  };

  const handleSidebarToggle = () => {
    setShowSidebar((current) => !current);
    setMapKey(prev => prev + 1); // Force map to remount and recalculate size
  };

  return (
    <div className="w-full h-[calc(100vh-4rem)] flex flex-col md:flex-row bg-white overflow-hidden">
      {/* Sidebar: Trip List */}
      {isAuthenticated && showSidebar && (
        <aside className="w-full md:w-80 lg:w-96 bg-white border-r border-stone-200 overflow-y-auto flex flex-col z-10 shadow-xl md:shadow-none min-h-0 shrink-0">
          <div className="p-4 flex-1 space-y-4 bg-stone-50/30">
            {trips.length === 0 ? (
              <div className="text-center p-8 bg-white rounded-2xl border-2 border-dashed border-stone-200 shadow-sm">
                <p className="text-stone-500 mb-4 font-medium">Your map is empty.</p>
                <Link
                  href="/trips/new"
                  className="inline-block px-6 py-2.5 bg-stone-900 text-white font-semibold rounded-full text-sm hover:bg-stone-800 transition-all shadow-md hover:shadow-lg"
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
                      ${hoveredTripId === trip.id ? 'bg-white shadow-lg border-stone-300 transform scale-[1.02]' : 'bg-white border-stone-100 hover:border-stone-200 hover:shadow-md'}
                    `}
                  >
                    <div className="w-20 h-20 rounded-xl bg-stone-100 overflow-hidden flex-shrink-0 border border-stone-200 shadow-sm">
                      {trip.coverPhoto ? (
                        <img src={trip.coverPhoto} alt={trip.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-stone-400 text-xs font-bold uppercase tracking-wider">
                          Map
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-stone-900 truncate text-lg">{trip.name}</h3>
                      <p className="text-xs text-stone-500 mt-1.5 flex items-center gap-2">
                        {!trip.isMine && <span className="bg-stone-100 text-stone-800 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider text-[10px] border border-stone-200">Shared</span>}
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
      <main className="flex-1 relative bg-white h-[50vh] md:h-full overflow-hidden min-h-0">
        {isAuthenticated && (
          <button
            type="button"
            onClick={handleSidebarToggle}
            className="absolute top-4 left-4 z-[1000] rounded-full bg-white/90 backdrop-blur-sm px-5 py-2.5 text-sm font-bold text-stone-900 shadow-xl border border-stone-200 hover:bg-white transition-all active:scale-95"
          >
            {showSidebar ? 'Hide Trips' : 'Show Trips'}
          </button>
        )}

        {mounted && (
          <MapDisplay
            key={mapKey}
            provider="leaflet"
            center={initialCenter}
            zoom={initialZoom}
            markers={markers}
            onMarkerClick={handleMarkerClick}
            className="absolute inset-0 w-full h-full"
          />
        )}
        <div className="absolute inset-0 pointer-events-none shadow-[inset_0_0_100px_rgba(0,0,0,0.05)]" />
      </main>
    </div>
  );
}
