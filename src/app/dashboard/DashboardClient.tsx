'use client';

import React, { useState, useEffect } from 'react';
import MapDisplay from '@/components/map/MapDisplay';
import { MapMarker } from '@/types/map';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Plus, ChevronUp, ChevronDown, Map as MapIcon } from 'lucide-react';

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
  const [showSidebar, setShowSidebar] = useState(false); // Hidden by default
  const [isDrawerExpanded, setIsDrawerExpanded] = useState(false);
  const [mapKey, setMapKey] = useState(0); 
  const [mounted, setMounted] = useState(false);
  const [mapStyle, setMapStyle] = useState<'light' | 'dark' | 'streets' | 'outdoor'>('light');

  // Sync website theme with map style
  useEffect(() => {
    if (mapStyle === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [mapStyle]);

  useEffect(() => {
    setMounted(true);
    // On desktop, show sidebar by default
    if (window.innerWidth >= 768) {
      setShowSidebar(true);
    }
  }, []);

  const handleMarkerClick = (id: string) => {
    router.push(`/trips/${id}`);
  };

  const handleSidebarToggle = () => {
    setShowSidebar((current) => !current);
    setMapKey(prev => prev + 1); 
  };

  const toggleDrawer = () => {
    setIsDrawerExpanded(!isDrawerExpanded);
  };

  return (
    <div className="w-full h-[calc(100vh-4rem)] flex flex-col md:flex-row bg-[var(--background)] overflow-hidden relative transition-colors duration-500">
      {/* Desktop Sidebar: Trip List */}
      {isAuthenticated && (
        <aside className={`
          hidden md:flex w-80 lg:w-96 bg-[var(--background)] border-r border-stone-200 dark:border-stone-700 overflow-y-auto flex-col z-10 min-h-0 shrink-0 transition-all duration-500
          ${showSidebar ? 'translate-x-0 opacity-100' : '-translate-x-full opacity-0 absolute'}
        `}>
          <div className="p-4 flex-1 space-y-4 bg-[var(--background)] transition-colors duration-500">
            <TripList trips={trips} hoveredTripId={hoveredTripId} setHoveredTripId={setHoveredTripId} router={router} />
          </div>
        </aside>
      )}

      {/* Main Content: Map */}
      <main className="flex-1 relative bg-[var(--background)] h-full overflow-hidden min-h-0 transition-colors duration-500">
        {isAuthenticated && (
          <button
            type="button"
            onClick={handleSidebarToggle}
            className="hidden md:flex absolute top-4 left-4 z-[1000] rounded-full bg-white/90 dark:bg-stone-800/90 backdrop-blur-sm px-5 py-2.5 text-sm font-bold text-stone-900 dark:text-stone-100 shadow-xl border border-stone-200 dark:border-stone-700 hover:bg-white dark:hover:bg-stone-800 transition-all active:scale-95 items-center gap-2"
          >
            <MapIcon size={16} />
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

      {/* Mobile Bottom Sheet Drawer */}
      {isAuthenticated && (
        <div 
          className={`
            md:hidden fixed inset-x-0 bottom-0 z-[1001] transition-all duration-500 ease-in-out transform
            ${isDrawerExpanded ? 'h-[85vh]' : 'h-20'}
          `}
        >
          {/* Backdrop when expanded */}
          {isDrawerExpanded && (
            <div 
              className="fixed inset-0 bg-stone-900/40 backdrop-blur-sm -z-10"
              onClick={() => setIsDrawerExpanded(false)}
            />
          )}

          <div className="h-full bg-[var(--background)] rounded-t-[32px] shadow-[0_-10px_40px_rgba(0,0,0,0.15)] border-t border-stone-200 dark:border-stone-700 flex flex-col overflow-hidden transition-colors duration-500">
            {/* Drawer Handle */}
            <div 
              className="w-full py-6 flex flex-col items-center justify-center cursor-pointer active:bg-stone-100/50 dark:active:bg-stone-800/50 transition-colors shrink-0"
              onClick={toggleDrawer}
            >
              <div className="w-12 h-1.5 bg-stone-300 dark:bg-stone-600 rounded-full mb-2" />
              <div className="flex items-center gap-2 text-stone-900 dark:text-stone-100 font-bold uppercase tracking-widest text-xs">
                {isDrawerExpanded ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
                {isDrawerExpanded ? 'Close Map Menu' : `View ${trips.length} Trips`}
              </div>
            </div>

            {/* Drawer Content */}
            <div className="flex-1 overflow-y-auto px-4 pb-12 space-y-4">
              <TripList trips={trips} hoveredTripId={hoveredTripId} setHoveredTripId={setHoveredTripId} router={router} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function TripList({ trips, hoveredTripId, setHoveredTripId, router }: { 
  trips: Trip[], 
  hoveredTripId: string | null, 
  setHoveredTripId: (id: string | null) => void,
  router: any 
}) {
  if (trips.length === 0) {
    return (
      <div className="text-center p-8 bg-white/50 dark:bg-stone-800/50 backdrop-blur-sm rounded-2xl border-2 border-dashed border-stone-200 dark:border-stone-700 shadow-sm mt-4 transition-colors">
        <p className="text-stone-500 dark:text-stone-400 mb-4 font-medium">Your map is empty.</p>
        <Link
          href="/trips/new"
          className="inline-block px-6 py-2.5 bg-stone-900 dark:bg-stone-700 text-white font-semibold rounded-full text-sm hover:bg-stone-800 dark:hover:bg-stone-600 transition-all shadow-md hover:shadow-lg"
        >
          Add First Trip
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4 py-2">
      {trips.map((trip) => (
        <div
          key={trip.id}
          onClick={() => router.push(`/trips/${trip.id}`)}
          onMouseEnter={() => setHoveredTripId(trip.id)}
          onMouseLeave={() => setHoveredTripId(null)}
          className={`
            group p-4 rounded-2xl transition-all cursor-pointer flex gap-4 items-center border-2 transition-all duration-300
            ${hoveredTripId === trip.id 
              ? 'bg-white dark:bg-stone-700 shadow-lg border-stone-300 dark:border-stone-500 transform scale-[1.02]' 
              : 'bg-white/60 dark:bg-stone-800/60 backdrop-blur-sm border-stone-100 dark:border-stone-800 hover:border-stone-200 dark:hover:border-stone-700 hover:shadow-md'}
          `}
        >
          <div className="w-20 h-20 rounded-xl bg-stone-100 dark:bg-stone-900 overflow-hidden flex-shrink-0 border border-stone-200 dark:border-stone-700 shadow-sm transition-colors">
            {trip.coverPhoto ? (
              <img src={trip.coverPhoto} alt={trip.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-stone-400 dark:text-stone-600 text-xs font-bold uppercase tracking-wider">
                Map
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0 text-left">
            <h3 className="font-bold text-stone-900 dark:text-stone-100 truncate text-lg transition-colors">{trip.name}</h3>
            <p className="text-xs text-stone-500 dark:text-stone-400 mt-1.5 flex items-center gap-2 transition-colors">
              {!trip.isMine && <span className="bg-stone-100 dark:bg-stone-800 text-stone-800 dark:text-stone-200 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider text-[10px] border border-stone-200 dark:border-stone-700">Shared</span>}
              <span className="font-medium">{trip.photoCount} memories</span>
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
