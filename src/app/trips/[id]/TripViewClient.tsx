'use client';

import React, { useState, useEffect, useMemo } from 'react';
import MapDisplay from '@/components/map/MapDisplay';
import { MapMarker } from '@/types/map';
import { ArrowLeft, Calendar, Globe, Lock, Share2, Edit3, Save, Trash2, PlusCircle, Loader2, X, ChevronUp, ChevronDown } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { calculateSmartCentering } from '@/utils/map/smartCentering';
import PhotoUploader from '@/components/upload/PhotoUploader';
import type { PhotoPreview } from '@/components/upload/PhotoUploader';

export default function TripViewClient({ trip: initialTrip, isMine }: { trip: any, isMine: boolean }) {
  const router = useRouter();
  const [trip, setTrip] = useState(initialTrip);
  const [selectedPhotoId, setSelectedPhotoId] = useState<string | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [isPublic, setIsPublic] = useState(trip.is_public);
  const [isUpdating, setIsUpdating] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isTimelineExpanded, setIsTimelineExpanded] = useState(false);

  // Edit Mode States
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(trip.name);
  const [editDescription, setEditDescription] = useState(trip.description || '');
  const [photoCaptions, setPhotoCaptions] = useState<Record<string, string>>(
    Object.fromEntries(trip.photos.map((p: any) => [p.id, p.caption || '']))
  );
  const [photosToDelete, setPhotosToDelete] = useState<Set<string>>(new Set());
  const [newPhotos, setNewPhotos] = useState<PhotoPreview[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  // Fix hydration issues by only rendering map after mount
  useEffect(() => {
    setMounted(true);
  }, []);

  const startEditing = () => {
    setEditName(trip.name);
    setEditDescription(trip.description || '');
    setPhotoCaptions(Object.fromEntries(trip.photos.map((p: any) => [p.id, p.caption || ''])));
    setPhotosToDelete(new Set());
    setNewPhotos([]);
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setIsEditing(false);
    setNewPhotos([]);
  };

  const saveChanges = async () => {
    setIsSaving(true);
    try {
      const photoUpdates = Object.entries(photoCaptions)
        .filter(([id, caption]) => {
          const original = trip.photos.find((p: any) => p.id === id);
          return original && original.caption !== caption && !photosToDelete.has(id);
        })
        .map(([id, caption]) => ({ id, caption }));

      const res = await fetch(`/api/trips/${trip.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editName,
          description: editDescription,
          photoUpdates,
          photosToDelete: Array.from(photosToDelete),
        }),
      });

      if (!res.ok) throw new Error('Failed to save trip updates');

      if (newPhotos.length > 0) {
        const formData = new FormData();
        formData.append('photoCount', String(newPhotos.length));
        newPhotos.forEach((photo, index) => {
          formData.append(`file_${index}`, photo.file);
          formData.append(`meta_${index}`, JSON.stringify({
            lat: photo.lat,
            lng: photo.lng,
            takenAt: photo.takenAt,
            caption: photo.caption,
            placeType: photo.placeType
          }));
        });

        const uploadRes = await fetch(`/api/trips/${trip.id}/photos`, {
          method: 'POST',
          body: formData,
        });

        if (!uploadRes.ok) throw new Error('Failed to upload new photos');
      }

      router.refresh();
      setIsEditing(false);
      window.location.reload();
    } catch (err) {
      console.error('Save error:', err);
      alert('Failed to save changes. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const markers: MapMarker[] = useMemo(() => {
    const activePhotos = (trip.photos || []).filter((p: any) => !photosToDelete.has(p.id));
    return activePhotos
      .filter((p: any) => 
        typeof p.lat === 'number' && 
        typeof p.lng === 'number' && 
        Number.isFinite(p.lat) && 
        Number.isFinite(p.lng)
      )
      .map((p: any) => ({
        id: p.id,
        lat: p.lat,
        lng: p.lng,
        label: p.caption || 'Memory',
        imageUrl: p.storage_url,
        placeName: p.place_name,
        tripName: trip.name,
        photoCount: 1,
        isPublic: isPublic,
        isMine: isMine,
        photos: [{
          id: p.id,
          storage_url: p.storage_url,
          caption: p.caption,
          lat: p.lat,
          lng: p.lng
        }],
        startDate: p.taken_at,
        endDate: p.taken_at
      }));
  }, [trip.photos, isPublic, isMine, photosToDelete]);

  const centeringResult = useMemo(() => {
    return calculateSmartCentering(markers, {
      minZoom: 5,
      maxZoom: 15,
      paddingFactor: 0.1,
    });
  }, [markers]);

  const initialCenter = centeringResult.center;
  const initialZoom = centeringResult.zoom;

  const toggleVisibility = async () => {
    setIsUpdating(true);
    try {
      const res = await fetch(`/api/trips/${trip.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_public: !isPublic }),
      });
      if (res.ok) {
        setIsPublic(!isPublic);
      }
    } catch (err) {
      console.error('Failed to update trip visibility:', err);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleShare = async () => {
    try {
      await navigator.share({
        title: trip.name,
        text: trip.description,
        url: window.location.href,
      });
    } catch (err) {
      navigator.clipboard.writeText(window.location.href);
      alert('Link copied to clipboard!');
    }
  };

  return (
    <div className="flex flex-col md:flex-row w-full h-[calc(100vh-4rem)] overflow-hidden bg-[var(--background)] relative transition-colors duration-500">
      {/* Desktop Sidebar: Trip Info & Timeline */}
      <aside className="hidden md:flex w-96 lg:w-[400px] border-r border-stone-200 dark:border-stone-700 flex-col z-10 h-full overflow-hidden bg-[var(--background)] shrink-0 transition-colors duration-500">
        <SidebarContent 
          trip={trip} 
          isMine={isMine} 
          isEditing={isEditing} 
          isSaving={isSaving}
          editName={editName}
          setEditName={setEditName}
          editDescription={editDescription}
          setEditDescription={setEditDescription}
          saveChanges={saveChanges}
          cancelEditing={cancelEditing}
          startEditing={startEditing}
          toggleVisibility={toggleVisibility}
          isPublic={isPublic}
          isUpdating={isUpdating}
          handleShare={handleShare}
          selectedPhotoId={selectedPhotoId}
          setSelectedPhotoId={setSelectedPhotoId}
          photosToDelete={photosToDelete}
          setPhotosToDelete={setPhotosToDelete}
          photoCaptions={photoCaptions}
          setPhotoCaptions={setPhotoCaptions}
          setNewPhotos={setNewPhotos}
          router={router}
        />
      </aside>

      {/* Main Content: Map */}
      <main className="flex-1 relative bg-[var(--background)] h-full overflow-hidden min-h-0 order-first md:order-none transition-colors duration-500">
        {mounted && (
          <MapDisplay
            provider="leaflet"
            center={initialCenter}
            zoom={initialZoom}
            markers={markers}
            onMarkerClick={setSelectedPhotoId}
            onMapReady={() => setMapReady(true)}
            className="absolute inset-0 w-full h-full"
          />
        )}
        <div className="absolute inset-0 pointer-events-none shadow-[inset_0_0_100px_rgba(0,0,0,0.05)]" />
      </main>

      {/* Mobile Bottom Sheet: Timeline */}
      <div 
        className={`
          md:hidden fixed inset-x-0 bottom-0 z-[1001] transition-all duration-500 ease-in-out transform
          ${isTimelineExpanded ? 'h-[85vh]' : 'h-20'}
        `}
      >
        {/* Backdrop */}
        {isTimelineExpanded && (
          <div 
            className="fixed inset-0 bg-stone-900/40 backdrop-blur-sm -z-10"
            onClick={() => setIsTimelineExpanded(false)}
          />
        )}

        <div className="h-full bg-[var(--background)] rounded-t-[32px] shadow-[0_-10px_40px_rgba(0,0,0,0.2)] border-t border-stone-200 dark:border-stone-700 flex flex-col overflow-hidden transition-colors duration-500">
          {/* Handle */}
          <div 
            className="w-full py-6 flex flex-col items-center justify-center cursor-pointer active:bg-stone-100/50 dark:active:bg-stone-800/50 transition-colors shrink-0"
            onClick={() => setIsTimelineExpanded(!isTimelineExpanded)}
          >
            <div className="w-12 h-1.5 bg-stone-300 dark:bg-stone-600 rounded-full mb-2" />
            <div className="flex items-center gap-2 text-stone-900 dark:text-stone-100 font-bold uppercase tracking-widest text-xs">
              {isTimelineExpanded ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
              {isTimelineExpanded ? 'Close Timeline' : 'Explore Timeline'}
            </div>
          </div>

          {/* Mobile Sidebar Content */}
          <div className="flex-1 overflow-y-auto px-1 pb-16 custom-scrollbar">
            <SidebarContent 
              trip={trip} 
              isMine={isMine} 
              isEditing={isEditing} 
              isSaving={isSaving}
              editName={editName}
              setEditName={setEditName}
              editDescription={editDescription}
              setEditDescription={setEditDescription}
              saveChanges={saveChanges}
              cancelEditing={cancelEditing}
              startEditing={startEditing}
              toggleVisibility={toggleVisibility}
              isPublic={isPublic}
              isUpdating={isUpdating}
              handleShare={handleShare}
              selectedPhotoId={selectedPhotoId}
              setSelectedPhotoId={(id: string) => {
                setSelectedPhotoId(id);
                // On mobile, keep expanded so they can read. 
                // Or maybe collapse slightly? Let's keep it simple.
              }}
              photosToDelete={photosToDelete}
              setPhotosToDelete={setPhotosToDelete}
              photoCaptions={photoCaptions}
              setPhotoCaptions={setPhotoCaptions}
              setNewPhotos={setNewPhotos}
              router={router}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function SidebarContent({ 
  trip, isMine, isEditing, isSaving, editName, setEditName, editDescription, setEditDescription,
  saveChanges, cancelEditing, startEditing, toggleVisibility, isPublic, isUpdating, handleShare,
  selectedPhotoId, setSelectedPhotoId, photosToDelete, setPhotosToDelete, photoCaptions, setPhotoCaptions,
  setNewPhotos, router
}: any) {
  return (
    <>
      {/* Header */}
      <div className="p-6 border-b border-stone-100 dark:border-stone-800 flex-shrink-0 bg-[var(--background)] transition-colors duration-500">
        <button
          onClick={() => router.push('/')}
          className="flex items-center gap-2 text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 transition-colors mb-4 group"
        >
          <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
          <span className="text-xs font-bold uppercase tracking-widest">Home</span>
        </button>
        
        {isEditing ? (
          <div className="space-y-3">
            <input
              type="text"
              value={editName}
              onChange={(e: any) => setEditName(e.target.value)}
              className="w-full text-2xl font-bold text-stone-900 dark:text-stone-100 leading-tight border-b-2 border-stone-200 dark:border-stone-700 focus:border-stone-900 dark:focus:border-stone-400 focus:ring-0 px-0 bg-transparent transition-colors"
              placeholder="Trip Name"
            />
            <textarea
              value={editDescription}
              onChange={(e: any) => setEditDescription(e.target.value)}
              className="w-full text-sm text-stone-600 dark:text-stone-400 leading-relaxed border-b border-stone-200 dark:border-stone-700 focus:border-stone-900 dark:focus:border-stone-400 focus:ring-0 px-0 bg-transparent resize-none h-20 transition-colors"
              placeholder="Add a description..."
            />
          </div>
        ) : (
          <>
            <h1 className="text-2xl font-bold text-stone-900 dark:text-stone-100 leading-tight transition-colors">{trip.name}</h1>
            
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-3 text-xs font-medium text-stone-500 dark:text-stone-400 uppercase tracking-wider transition-colors">
              {trip.start_date && (
                <span className="flex items-center gap-1">
                  <Calendar size={14} />
                  {new Date(trip.start_date).toLocaleDateString()} 
                  {trip.end_date ? ` - ${new Date(trip.end_date).toLocaleDateString()}` : ''}
                </span>
              )}
              <span className="flex items-center gap-1">
                {isPublic ? <Globe size={14} className="text-green-600 dark:text-green-400" /> : <Lock size={14} />}
                {isPublic ? 'Public' : 'Private'}
              </span>
            </div>

            {trip.description && (
              <p className="mt-4 text-sm text-stone-600 dark:text-stone-400 leading-relaxed line-clamp-2 transition-colors">
                {trip.description}
              </p>
            )}
          </>
        )}

        <div className="mt-6 flex flex-col gap-2">
          {isEditing ? (
            <div className="flex items-center gap-2">
              <button
                onClick={saveChanges}
                disabled={isSaving || !editName.trim()}
                className="flex-1 flex items-center justify-center gap-2 h-10 bg-stone-900 dark:bg-stone-700 text-white text-[10px] font-bold uppercase tracking-widest rounded-xl hover:bg-stone-800 dark:hover:bg-stone-600 shadow-md active:scale-95 disabled:opacity-50 transition-all"
              >
                {isSaving ? <Loader2 size={14} className="animate-spin" /> : <><Save size={14} /> Save Changes</>}
              </button>
              <button
                onClick={cancelEditing}
                disabled={isSaving}
                className="px-4 flex items-center justify-center h-10 bg-stone-100 dark:bg-stone-800 text-stone-500 dark:text-stone-400 text-[10px] font-bold uppercase tracking-widest rounded-xl hover:bg-stone-200 dark:hover:bg-stone-700 active:scale-95 transition-all"
              >
                <X size={14} />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              {isMine && (
                <>
                  <button
                    onClick={startEditing}
                    className="flex-1 flex items-center justify-center gap-2 h-10 bg-white/60 dark:bg-stone-800/60 backdrop-blur-sm text-stone-900 dark:text-stone-100 border-2 border-stone-900 dark:border-stone-700 text-[10px] font-bold uppercase tracking-widest rounded-xl hover:bg-white dark:hover:bg-stone-800 active:scale-95 transition-all shadow-sm"
                  >
                    <Edit3 size={14} /> Edit Trip
                  </button>
                  <button
                    onClick={toggleVisibility}
                    disabled={isUpdating}
                    className={`flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-xl transition-all border-2 ${
                      isPublic 
                        ? 'bg-white/40 dark:bg-stone-800/40 backdrop-blur-sm text-stone-500 dark:text-stone-400 border-stone-200 dark:border-stone-700 hover:bg-white/60 dark:hover:bg-stone-800/60' 
                        : 'bg-stone-900 dark:bg-amber-600 text-white border-stone-900 dark:border-amber-600 hover:bg-stone-800 dark:hover:bg-amber-500 shadow-md'
                    }`}
                    title={isPublic ? 'Make Private' : 'Make Public'}
                  >
                    {isUpdating ? '...' : isPublic ? <Globe size={16} /> : <Lock size={16} />}
                  </button>
                </>
              )}
              
              <button 
                onClick={handleShare}
                disabled={!isPublic && !isMine}
                className={`flex-1 flex items-center justify-center gap-2 h-10 font-bold uppercase tracking-widest rounded-xl transition-all text-[10px] border-2 ${
                  isPublic 
                    ? 'bg-white/60 dark:bg-stone-800/60 backdrop-blur-sm text-stone-900 dark:text-stone-100 border-stone-900 dark:border-stone-700 hover:bg-white dark:hover:bg-stone-800 shadow-sm' 
                    : 'bg-stone-50 dark:bg-stone-900 text-stone-300 dark:text-stone-600 border-dashed border-stone-200 dark:border-stone-800 cursor-not-allowed'
                }`}
              >
                <Share2 size={14} /> Share
              </button>
            </div>
          )}
          
          {!isPublic && isMine && !isEditing && (
            <p className="text-[10px] text-stone-400 dark:text-stone-500 font-medium uppercase tracking-tight text-center mt-1 italic transition-colors">
              Make public to share with a link
            </p>
          )}
        </div>
      </div>

      {/* Timeline */}
      <div className="p-6 space-y-8 flex-1 overflow-y-auto min-h-0 bg-[var(--background)] custom-scrollbar transition-colors duration-500">
        {trip.photos.length === 0 && !isEditing ? (
          <div className="text-center p-8 bg-white/40 dark:bg-stone-800/40 backdrop-blur-sm rounded-2xl border-2 border-dashed border-stone-200 dark:border-stone-700 transition-colors">
            <p className="text-stone-500 dark:text-stone-400">No memories yet.</p>
          </div>
        ) : (
          <div className="relative border-l-2 border-stone-200 dark:border-stone-800 ml-4 space-y-10 pb-8 transition-colors">
            {trip.photos
              .filter((p: any) => !photosToDelete.has(p.id))
              .map((photo: any) => {
                const isSelected = selectedPhotoId === photo.id;
                
                return (
                  <div 
                    key={photo.id} 
                    className="relative pl-8 cursor-pointer group"
                    onClick={() => !isEditing && setSelectedPhotoId(photo.id)}
                  >
                    {/* Timeline Node */}
                    <div className={`
                      absolute -left-[9px] top-4 w-4 h-4 rounded-full border-2 transition-all
                      ${isSelected 
                        ? 'bg-stone-900 dark:bg-amber-500 border-white dark:border-stone-900 shadow-md scale-125' 
                        : 'bg-white dark:bg-stone-800 border-stone-300 dark:border-stone-600 group-hover:border-stone-500 dark:group-hover:border-stone-400'}
                    `} />
                    
                    {/* Photo Card */}
                    <div className={`
                      bg-white/80 dark:bg-stone-800/80 backdrop-blur-sm rounded-2xl border overflow-hidden transition-all shadow-sm hover:shadow-md
                      ${isSelected 
                        ? 'border-stone-400 dark:border-amber-500 ring-2 ring-stone-100 dark:ring-amber-900/20 transform scale-[1.02]' 
                        : 'border-stone-200 dark:border-stone-700'}
                    `}>
                      <div className="aspect-[4/3] bg-stone-100 dark:bg-stone-900 relative group/photo">
                        <img 
                          src={photo.storage_url} 
                          alt={photo.caption || 'Memory'} 
                          className="w-full h-full object-cover"
                        />
                        {isEditing && (
                          <button
                            onClick={(e: any) => {
                              e.stopPropagation();
                              setPhotosToDelete((prev: any) => {
                                const next = new Set(prev);
                                next.add(photo.id);
                                return next;
                              });
                            }}
                            className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-full opacity-0 group-hover/photo:opacity-100 transition-opacity shadow-lg hover:bg-red-600 active:scale-90"
                            title="Remove photo"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                      
                      <div className="p-4 space-y-2">
                        {photo.taken_at && (
                          <p className="text-xs font-bold text-stone-400 dark:text-stone-500 uppercase tracking-wider transition-colors">
                            {new Date(photo.taken_at).toLocaleDateString(undefined, { 
                              month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' 
                            })}
                          </p>
                        )}
                        
                        {isEditing ? (
                          <textarea
                            value={photoCaptions[photo.id] || ''}
                            onChange={(e: any) => setPhotoCaptions((prev: any) => ({ ...prev, [photo.id]: e.target.value }))}
                            className="w-full text-sm text-stone-700 dark:text-stone-200 leading-relaxed border-stone-200 dark:border-stone-700 rounded-lg focus:ring-stone-400 dark:focus:ring-amber-500 focus:border-stone-400 dark:focus:border-amber-500 p-2 bg-white/50 dark:bg-stone-900/50 resize-none h-20 transition-all"
                            placeholder="Add a caption..."
                          />
                        ) : (
                          photo.caption && (
                            <p className="text-sm text-stone-700 dark:text-stone-200 leading-relaxed line-clamp-3 transition-colors">{photo.caption}</p>
                          )
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}

            {isEditing && (
              <div className="relative pl-8">
                {/* Timeline Node */}
                <div className="absolute -left-[9px] top-4 w-4 h-4 rounded-full border-2 bg-white dark:bg-stone-800 border-stone-300 dark:border-stone-700 border-dashed" />
                
                <div className="bg-white/60 dark:bg-stone-800/60 backdrop-blur-sm rounded-2xl border-2 border-dashed border-stone-200 dark:border-stone-700 p-6 space-y-4 shadow-sm transition-colors">
                  <div className="flex items-center gap-3 text-stone-900 dark:text-stone-100 transition-colors">
                    <PlusCircle size={20} />
                    <h3 className="font-bold">Add New Memories</h3>
                  </div>
                  
                  <PhotoUploader
                    onChange={setNewPhotos}
                    submitLabel="Update Trip"
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
