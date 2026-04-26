'use client';

import React, { useState } from 'react';
import MapDisplay from '@/components/map/MapDisplay';
import { MapMarker } from '@/types/map';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

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
}

export default function DashboardClient({ trips, markers, initialCenter, initialZoom }: DashboardClientProps) {
  const router = useRouter();
  const [hoveredTripId, setHoveredTripId] = useState<string | null>(null);

  const handleMarkerClick = (id: string) => {
    router.push(`/trips/${id}`);
  };

  return (
    <div className="flex-1 flex flex-col md:flex-row h-full">
      {/* Sidebar: Trip List */}
      <aside className="w-full md:w-80 lg:w-96 bg-white border-r border-stone-200 overflow-y-auto flex flex-col z-10 shadow-xl md:shadow-none">
        <div className="p-4 flex-1 space-y-4">
          {trips.length === 0 ? (
            <div className="text-center p-8 bg-stone-50 rounded-2xl border-2 border-dashed border-stone-200">
              <p className="text-stone-500 mb-4">Your map is empty.</p>
              <Link 
                href="/trips/new"
                className="inline-block px-6 py-2 bg-stone-900 text-white font-medium rounded-full text-sm hover:bg-stone-800 transition-colors"
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
                    group p-3 rounded-2xl transition-all cursor-pointer flex gap-4 items-center border
                    ${hoveredTripId === trip.id ? 'bg-stone-50 border-stone-300 shadow-sm' : 'bg-white border-transparent hover:border-stone-200'}
                  `}
                >
                  <div className="w-16 h-16 rounded-xl bg-stone-100 overflow-hidden flex-shrink-0 border border-stone-200">
                    {trip.coverPhoto ? (
                      <img src={trip.coverPhoto} alt={trip.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-stone-300 text-xs font-medium uppercase">
                        Map
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-stone-900 truncate">{trip.name}</h3>
                    <p className="text-xs text-stone-500 mt-1 flex items-center gap-2">
                      {!trip.isMine && <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider text-[10px]">Shared</span>}
                      {trip.photoCount} memories
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </aside>

      {/* Main Content: Map */}
      <main className="flex-1 relative bg-stone-100 h-[50vh] md:h-auto">
        <MapDisplay
          provider="leaflet" // Using open source Leaflet for the scrapbook feel
          center={initialCenter}
          zoom={initialZoom}
          markers={markers}
          onMarkerClick={handleMarkerClick}
          className="w-full h-full"
        />
      </main>
    </div>
  );
}
