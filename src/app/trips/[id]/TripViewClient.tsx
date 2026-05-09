'use client';

import React, { useState, useEffect, useRef } from 'react';
import MapDisplay from '@/components/map/MapDisplay';
import { MapMarker } from '@/types/map';
import { ArrowLeft, Calendar, Globe, Lock, Share2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { calculateSmartCentering } from '@/utils/map/smartCentering';

export default function TripViewClient({ trip, isMine }: { trip: any, isMine: boolean }) {
  const router = useRouter();
  const [selectedPhotoId, setSelectedPhotoId] = useState<string | null>(null);
  const photoRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  // Simple marker generation - one marker per location
  const markers: MapMarker[] = [];
  const locationMap = new Map<string, string[]>();

  trip.photos.forEach((p: any) => {
    if (typeof p.lat === 'number' && typeof p.lng === 'number') {
      const key = `${p.lat.toFixed(6)},${p.lng.toFixed(6)}`;
      if (!locationMap.has(key)) {
        locationMap.set(key, []);
        markers.push({
          id: `marker-${key}`,
          lat: p.lat,
          lng: p.lng,
          label: p.caption || 'Memory',
          imageUrl: p.storage_url,
          placeName: p.place_name,
          photoCount: 0,
          photos: []
        });
      }
      locationMap.get(key)?.push(p.id);
    }
  });

  // Populate marker details
  markers.forEach(m => {
    const key = `${m.lat.toFixed(6)},${m.lng.toFixed(6)}`;
    const ids = locationMap.get(key) || [];
    m.photoCount = ids.length;
    m.photos = trip.photos
      .filter((p: any) => ids.includes(p.id))
      .map((p: any) => ({
        id: p.id,
        storage_url: p.storage_url,
        caption: p.caption,
        lat: p.lat,
        lng: p.lng
      }));
  });

  // Find marker ID for selection
  const selectedMarkerId = React.useMemo(() => {
    if (!selectedPhotoId) return null;
    const photo = trip.photos.find((p: any) => p.id === selectedPhotoId);
    if (!photo || typeof photo.lat !== 'number') return null;
    return `marker-${photo.lat.toFixed(6)},${photo.lng.toFixed(6)}`;
  }, [selectedPhotoId, trip.photos]);

  // Highlight all photos at the same location
  const selectedLocationIds = React.useMemo(() => {
    if (!selectedMarkerId) return [];
    const marker = markers.find(m => m.id === selectedMarkerId);
    if (!marker) return [];
    return marker.photos?.map(p => p.id) || [];
  }, [selectedMarkerId, markers]);

  // Scroll to selected photo
  useEffect(() => {
    if (selectedPhotoId && photoRefs.current.has(selectedPhotoId)) {
      photoRefs.current.get(selectedPhotoId)?.scrollIntoView({
        behavior: 'smooth',
        block: 'center'
      });
    }
  }, [selectedPhotoId]);

  // Centering
  const centeringResult = calculateSmartCentering(markers, {
    minZoom: 2,
    maxZoom: 15,
    paddingFactor: 0.1,
  });

  return (
    <div className="flex flex-col md:flex-row h-[calc(100vh-4rem)] w-full overflow-hidden">
      {/* Sidebar */}
      <aside className="w-full md:w-96 lg:w-[400px] h-[50vh] md:h-full bg-white border-r border-stone-200 overflow-y-auto z-10">
        <div className="p-6 border-b border-stone-100 sticky top-0 bg-white/95 backdrop-blur z-20">
          <button onClick={() => router.push('/')} className="flex items-center gap-2 text-stone-500 hover:text-stone-900 transition-colors mb-4 group">
            <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
            <span className="text-xs font-bold uppercase tracking-widest">Home</span>
          </button>
          <h1 className="text-2xl font-bold text-stone-900 leading-tight">{trip.name}</h1>
          <div className="flex items-center gap-4 mt-3 text-xs font-medium text-stone-500 uppercase tracking-wider">
            {trip.start_date && (
              <span className="flex items-center gap-1">
                <Calendar size={14} />
                {new Date(trip.start_date).toLocaleDateString()}
              </span>
            )}
            <span className="flex items-center gap-1">
              {trip.is_public ? <Globe size={14} className="text-green-600" /> : <Lock size={14} />}
              {trip.is_public ? 'Public' : 'Private'}
            </span>
          </div>
        </div>

        <div className="p-6 space-y-8 pb-20">
          {trip.photos.length === 0 ? (
            <div className="text-center p-8 bg-stone-50 rounded-2xl border-2 border-dashed border-stone-200">
              <p className="text-stone-500">No memories yet.</p>
            </div>
          ) : (
            <div className="relative border-l-2 border-stone-200 ml-4 space-y-10">
              {trip.photos.map((photo: any) => {
                const isSelected = selectedLocationIds.includes(photo.id);
                return (
                  <div 
                    key={photo.id} 
                    ref={el => { if (el) photoRefs.current.set(photo.id, el); }}
                    className="relative pl-8 cursor-pointer group"
                    onClick={() => setSelectedPhotoId(photo.id)}
                  >
                    <div className={`absolute -left-[9px] top-4 w-4 h-4 rounded-full border-2 transition-all ${isSelected ? 'bg-stone-900 border-white' : 'bg-white border-stone-300'}`} />
                    <div className={`bg-white rounded-2xl border overflow-hidden transition-all ${isSelected ? 'border-stone-400 ring-4 ring-stone-100' : 'border-stone-200 shadow-sm'}`}>
                      <div className="aspect-[4/3] bg-stone-100 relative">
                        <img src={photo.storage_url} alt={photo.caption || 'Memory'} className="w-full h-full object-cover" />
                      </div>
                      {(photo.caption || photo.taken_at) && (
                        <div className="p-4 space-y-2">
                          {photo.taken_at && <p className="text-xs font-bold text-stone-400 uppercase tracking-wider">{new Date(photo.taken_at).toLocaleDateString()}</p>}
                          {photo.caption && <p className="text-sm text-stone-700 leading-relaxed">{photo.caption}</p>}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </aside>

      {/* Map */}
      <main className="flex-1 relative h-[50vh] md:h-full min-h-[400px]">
        <MapDisplay
          provider="leaflet"
          center={centeringResult.center}
          zoom={centeringResult.zoom}
          markers={markers}
          selectedMarkerId={selectedMarkerId}
          onMarkerClick={setSelectedPhotoId}
          showSeeDetails={false}
          className="w-full h-full"
        />
      </main>
    </div>
  );
}
