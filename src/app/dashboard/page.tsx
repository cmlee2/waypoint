import React from 'react';
import { auth } from '@clerk/nextjs/server';
import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';
import { MapMarker } from '@/types/map';
import { Plus } from 'lucide-react';
import Link from 'next/link';
import DashboardClient from './DashboardClient';

export default async function DashboardPage() {
  const { userId } = await auth();
  
  if (!userId) {
    return null; // Handled by middleware redirect
  }

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  // Fetch trips and their first photo for the map marker
  const { data: trips, error } = await supabase
    .from('trips')
    .select(`
      id, 
      name, 
      user_id, 
      is_public,
      photos (
        lat,
        lng,
        storage_url
      )
    `)
    .or(`user_id.eq.${userId},is_public.eq.true`)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching trips:', error);
  }

  const validTrips = trips || [];
  const markers: MapMarker[] = [];
  
  const clientTrips = validTrips.map((trip) => {
    // Find the first photo with valid coordinates to use as the trip's pin
    const firstValidPhoto = trip.photos?.find((p: any) => p.lat && p.lng);
    
    if (firstValidPhoto) {
      markers.push({
        id: trip.id,
        lat: firstValidPhoto.lat,
        lng: firstValidPhoto.lng,
        label: trip.name,
        imageUrl: firstValidPhoto.storage_url
      });
    }

    return {
      id: trip.id,
      name: trip.name,
      user_id: trip.user_id,
      isMine: trip.user_id === userId,
      coverPhoto: trip.photos?.[0]?.storage_url,
      photoCount: trip.photos?.length || 0
    };
  });

  const defaultCenter = { lat: 20, lng: 0 };
  const initialCenter = markers.length > 0 
    ? { lat: markers[0].lat, lng: markers[0].lng } 
    : defaultCenter;
  
  const initialZoom = markers.length > 0 ? 3 : 1;

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-4rem)]">
      {/* Dashboard Header/Actions */}
      <div className="bg-white border-b border-stone-200 px-6 py-4 flex items-center justify-between z-20">
        <h1 className="text-2xl font-bold text-stone-900 tracking-tight">Your Atlas</h1>
        <Link 
          href="/trips/new"
          className="flex items-center gap-2 bg-stone-900 text-white px-4 py-2 rounded-full text-sm font-medium hover:bg-stone-800 transition-colors shadow-sm"
        >
          <Plus size={16} />
          <span className="hidden sm:inline">Add Trip</span>
        </Link>
      </div>

      <DashboardClient 
        trips={clientTrips} 
        markers={markers} 
        initialCenter={initialCenter} 
        initialZoom={initialZoom} 
      />
    </div>
  );
}
