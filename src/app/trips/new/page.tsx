'use client';

import React, { useState } from 'react';
import PhotoUploader from '@/components/upload/PhotoUploader';
import { useRouter } from 'next/navigation';
import { Calendar, Lock, Globe, ArrowLeft, Loader2 } from 'lucide-react';

export default function NewTripPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [photos, setPhotos] = useState<any[]>([]);
  const [tripData, setTripData] = useState({
    name: '',
    description: '',
    startDate: '',
    endDate: '',
    isPublic: false
  });

  const handleCreateTrip = async () => {
    if (!tripData.name) return;
    
    setIsSubmitting(true);
    
    try {
      // Create FormData to send files and metadata
      const formData = new FormData();
      formData.append('name', tripData.name);
      formData.append('description', tripData.description);
      formData.append('startDate', tripData.startDate);
      formData.append('endDate', tripData.endDate);
      formData.append('isPublic', String(tripData.isPublic));
      
      // Append each photo with its metadata
      photos.forEach((photo, index) => {
        formData.append(`file_${index}`, photo.file);
        formData.append(`meta_${index}`, JSON.stringify({
          lat: photo.lat,
          lng: photo.lng,
          takenAt: photo.takenAt,
          caption: photo.caption
        }));
      });
      formData.append('photoCount', String(photos.length));

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) throw new Error('Failed to upload trip');

      router.push('/dashboard');
    } catch (err) {
      console.error('Upload error:', err);
      alert('Failed to save trip. Check console for details.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-stone-50 pb-20">
      <div className="max-w-4xl mx-auto px-4 pt-12">
        {/* Back Link */}
        <button 
          onClick={() => router.back()}
          className="flex items-center gap-2 text-stone-500 hover:text-stone-900 transition-colors mb-8 group"
        >
          <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
          <span className="text-sm font-medium">Back to dashboard</span>
        </button>

        <header className="mb-12">
          <h1 className="text-4xl font-bold text-stone-900 tracking-tight">Create a New Trip</h1>
          <p className="text-stone-500 mt-2 text-lg italic">"Collect moments, not things."</p>
        </header>

        <div className="space-y-12">
          {/* Section 1: Basic Info */}
          <section className="bg-white rounded-3xl p-8 border border-stone-200 shadow-sm space-y-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-1.5 h-6 bg-stone-800 rounded-full" />
              <h2 className="text-xl font-bold text-stone-900">Trip Details</h2>
            </div>
            
            <div className="grid grid-cols-1 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-bold text-stone-400 uppercase tracking-widest">Trip Name</label>
                <input 
                  type="text" 
                  placeholder="e.g., Summer in Japan"
                  className="w-full text-2xl font-semibold border-none focus:ring-0 p-0 placeholder:text-stone-200"
                  value={tripData.name}
                  onChange={(e) => setTripData({...tripData, name: e.target.value})}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-stone-400 uppercase tracking-widest flex items-center gap-2">
                    <Calendar size={14} /> Start Date
                  </label>
                  <input 
                    type="date" 
                    className="w-full bg-stone-50 border-stone-200 rounded-xl px-4 py-3 focus:ring-stone-400 transition-all"
                    value={tripData.startDate}
                    onChange={(e) => setTripData({...tripData, startDate: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-stone-400 uppercase tracking-widest flex items-center gap-2">
                    <Calendar size={14} /> End Date
                  </label>
                  <input 
                    type="date" 
                    className="w-full bg-stone-50 border-stone-200 rounded-xl px-4 py-3 focus:ring-stone-400 transition-all"
                    value={tripData.endDate}
                    onChange={(e) => setTripData({...tripData, endDate: e.target.value})}
                  />
                </div>
              </div>

              <div className="space-y-2 pt-4">
                <label className="text-sm font-bold text-stone-400 uppercase tracking-widest">Description</label>
                <textarea 
                  placeholder="Tell the story of this trip..."
                  className="w-full bg-stone-50 border-stone-200 rounded-2xl px-4 py-3 h-24 focus:ring-stone-400 transition-all"
                  value={tripData.description}
                  onChange={(e) => setTripData({...tripData, description: e.target.value})}
                />
              </div>
            </div>
          </section>

          {/* Section 2: Photos */}
          <section className="space-y-6">
            <div className="flex items-center gap-3 px-8">
              <div className="w-1.5 h-6 bg-stone-800 rounded-full" />
              <h2 className="text-xl font-bold text-stone-900">Add Memories</h2>
            </div>
            <PhotoUploader onChange={setPhotos} />
          </section>

          {/* Section 3: Privacy & Submit */}
          <section className="bg-stone-100 rounded-3xl p-8 border border-stone-200 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => setTripData({...tripData, isPublic: !tripData.isPublic})}
                className={`
                  p-4 rounded-2xl transition-all border-2
                  ${tripData.isPublic ? 'bg-white border-stone-900 text-stone-900' : 'bg-white border-transparent text-stone-300'}
                `}
              >
                {tripData.isPublic ? <Globe size={24} /> : <Lock size={24} />}
              </button>
              <div>
                <p className="font-bold text-stone-900">
                  {tripData.isPublic ? 'Public Trip' : 'Private Trip'}
                </p>
                <p className="text-sm text-stone-500">
                  {tripData.isPublic ? 'Anyone with the link can view.' : 'Only you can see this trip.'}
                </p>
              </div>
            </div>

            <button 
              onClick={handleCreateTrip}
              disabled={!tripData.name || isSubmitting}
              className="w-full md:w-auto bg-stone-900 text-white px-12 py-4 rounded-full font-bold text-lg hover:bg-stone-800 shadow-xl shadow-stone-200 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3"
            >
              {isSubmitting ? <Loader2 className="animate-spin" /> : 'Create My Trip'}
            </button>
          </section>
        </div>
      </div>
    </div>
  );
}
