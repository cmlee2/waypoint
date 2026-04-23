'use client';

import React, { useState } from 'react';
import MapDisplay from '@/components/map/MapDisplay';
import { MapMarker } from '@/types/map';

const SAMPLE_MARKERS: MapMarker[] = [
  { id: '1', lat: 45.523062, lng: -122.676482, label: 'Portland' },
  { id: '2', lat: 45.531, lng: -122.685, label: 'Park' },
  { id: '3', lat: 45.515, lng: -122.660, label: 'Bridge' },
];

const CENTER = { lat: 45.523062, lng: -122.676482 };
const ZOOM = 12;

export default function MapTestPage() {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  return (
    <div className="min-h-screen bg-stone-50 p-8 font-[family-name:var(--font-geist-sans)]">
      <header className="mb-12 max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold text-stone-900 mb-2">Map Engine Comparison</h1>
        <p className="text-stone-600">Comparing Mapbox (Vector) vs Leaflet (Raster) in a minimalist style.</p>
        {selectedId && (
          <div className="mt-4 p-3 bg-stone-800 text-white rounded-lg inline-block">
            Selected Marker: {SAMPLE_MARKERS.find(m => m.id === selectedId)?.label}
          </div>
        )}
      </header>

      <main className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Mapbox Side */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-stone-800">Mapbox GL JS</h2>
            <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-bold rounded uppercase tracking-wider">Vector</span>
          </div>
          <MapDisplay
            provider="mapbox"
            center={CENTER}
            zoom={ZOOM}
            markers={SAMPLE_MARKERS}
            onMarkerClick={setSelectedId}
            className="w-full h-[500px]"
          />
          <ul className="mt-4 space-y-2 text-sm text-stone-500 italic">
            <li>• GPU-accelerated smooth rotation and tilt.</li>
            <li>• Sharp vector text at all zoom levels.</li>
            <li>• Infinite zoom steps.</li>
          </ul>
        </section>

        {/* Leaflet Side */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-stone-800">Leaflet (Open Source)</h2>
            <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-bold rounded uppercase tracking-wider">Raster</span>
          </div>
          <MapDisplay
            provider="leaflet"
            center={CENTER}
            zoom={ZOOM}
            markers={SAMPLE_MARKERS}
            onMarkerClick={setSelectedId}
            className="w-full h-[500px]"
          />
          <ul className="mt-4 space-y-2 text-sm text-stone-500 italic">
            <li>• Traditional image-tile approach.</li>
            <li>• Community-driven tile layers (Carto Positron).</li>
            <li>• Discrete zoom levels.</li>
          </ul>
        </section>
      </main>

      <footer className="mt-16 text-center text-stone-400 text-sm">
        <p>Waypoint Project • Dual-Map Architecture Test</p>
      </footer>
    </div>
  );
}
