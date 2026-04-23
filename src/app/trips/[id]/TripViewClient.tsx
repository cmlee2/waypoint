'use client';

import React, { useState } from 'react';
import MapDisplay from '@/components/map/MapDisplay';
import { MapMarker } from '@/types/map';
import { ArrowLeft, Calendar, Globe, Lock, Share2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function TripViewClient({ trip, isMine }: { trip: any, isMine: boolean }) {
  const router = useRouter();
  const [selectedPhotoId, setSelectedPhotoId] = useState<string | null>(null);

  // Generate markers from photos that have coordinates
  const markers: MapMarker[] = trip.photos
    .filter((p: any) => p.lat && p.lng)
    .map((p: any) => ({
      id: p.id,
      lat: p.lat,
      lng: p.lng,
      label: p.caption || 'Memory',
      imageUrl: p.storage_url,
    }));

  const initialCenter = markers.length > 0 
    ? { lat: markers[0].lat, lng: markers[0].lng } 
    : { lat: 20, lng: 0 };
    
  const initialZoom = markers.length > 0 ? 10 : 2;

  const handleShare = async () => {
    try {
      await navigator.share({
        title: trip.name,
        text: trip.description,
        url: window.location.href,
      });
    } catch (err) {
      // Fallback to copying to clipboard
      navigator.clipboard.writeText(window.location.href);
      alert('Link copied to clipboard!');
    }
  };

  return (
    <div className="flex-1 flex flex-col md:flex-row h-[calc(100vh-4rem)]">
      {/* Sidebar: Trip Info & Timeline */}
      <aside className="w-full md:w-96 lg:w-[400px] bg-white border-r border-stone-200 overflow-y-auto flex flex-col z-10 shadow-xl md:shadow-none">
        {/* Header */}
        <div className="p-6 border-b border-stone-100 sticky top-0 bg-white/95 backdrop-blur z-20">
          <button 
            onClick={() => router.push('/dashboard')}
            className="flex items-center gap-2 text-stone-500 hover:text-stone-900 transition-colors mb-4 group"
          >
            <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
            <span className="text-xs font-bold uppercase tracking-widest">Dashboard</span>
          </button>
          
          <h1 className="text-2xl font-bold text-stone-900 leading-tight">{trip.name}</h1>
          
          <div className="flex items-center gap-4 mt-3 text-xs font-medium text-stone-500 uppercase tracking-wider">
            {trip.start_date && (
              <span className="flex items-center gap-1">
                <Calendar size={14} />
                {new Date(trip.start_date).toLocaleDateString()} 
                {trip.end_date ? ` - ${new Date(trip.end_date).toLocaleDateString()}` : ''}
              </span>
            )}
            <span className="flex items-center gap-1">
              {trip.is_public ? <Globe size={14} className="text-green-600" /> : <Lock size={14} />}
              {trip.is_public ? 'Public' : 'Private'}
            </span>
          </div>

          {trip.description && (
            <p className="mt-4 text-sm text-stone-600 leading-relaxed">
              {trip.description}
            </p>
          )}

          {trip.is_public && (
            <button 
              onClick={handleShare}
              className="mt-4 w-full flex items-center justify-center gap-2 py-2 px-4 bg-stone-100 hover:bg-stone-200 text-stone-700 font-medium rounded-xl transition-colors text-sm"
            >
              <Share2 size={16} /> Share Trip
            </button>
          )}
        </div>

        {/* Timeline */}
        <div className="p-6 space-y-8 flex-1">
          {trip.photos.length === 0 ? (
            <div className="text-center p-8 bg-stone-50 rounded-2xl border-2 border-dashed border-stone-200">
              <p className="text-stone-500">No memories yet.</p>
            </div>
          ) : (
            <div className="relative border-l-2 border-stone-200 ml-4 space-y-10 pb-8">
              {trip.photos.map((photo: any, index: number) => {
                const isSelected = selectedPhotoId === photo.id;
                
                return (
                  <div 
                    key={photo.id} 
                    className="relative pl-8 cursor-pointer group"
                    onClick={() => setSelectedPhotoId(photo.id)}
                  >
                    {/* Timeline Node */}
                    <div className={`
                      absolute -left-[9px] top-4 w-4 h-4 rounded-full border-2 transition-all
                      ${isSelected ? 'bg-stone-900 border-white shadow-md scale-125' : 'bg-white border-stone-300 group-hover:border-stone-500'}
                    `} />
                    
                    {/* Photo Card */}
                    <div className={`
                      bg-white rounded-2xl border overflow-hidden transition-all shadow-sm hover:shadow-md
                      ${isSelected ? 'border-stone-400 ring-2 ring-stone-100' : 'border-stone-200'}
                    `}>
                      <div className="aspect-[4/3] bg-stone-100 relative">
                        <img 
                          src={photo.storage_url} 
                          alt={photo.caption || 'Memory'} 
                          className="w-full h-full object-cover"
                        />
                      </div>
                      
                      {(photo.caption || photo.taken_at) && (
                        <div className="p-4 space-y-2">
                          {photo.taken_at && (
                            <p className="text-xs font-bold text-stone-400 uppercase tracking-wider">
                              {new Date(photo.taken_at).toLocaleDateString(undefined, { 
                                month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' 
                              })}
                            </p>
                          )}
                          {photo.caption && (
                            <p className="text-sm text-stone-700 leading-relaxed">{photo.caption}</p>
                          )}
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

      {/* Main Content: Map */}
      <main className="flex-1 relative bg-stone-100 h-[50vh] md:h-auto">
        <MapDisplay 
          provider="mapbox"
          center={initialCenter}
          zoom={initialZoom}
          markers={markers}
          onMarkerClick={setSelectedPhotoId}
          className="w-full h-full"
        />
        <div className="absolute inset-0 pointer-events-none shadow-[inset_0_0_100px_rgba(0,0,0,0.05)]" />
      </main>
    </div>
  );
}
