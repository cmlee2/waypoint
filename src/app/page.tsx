import React from 'react';
import { auth } from '@clerk/nextjs/server';
import { createAdminClient } from '@/utils/supabase/server';
import { MapMarker } from '@/types/map';
import { Plus } from 'lucide-react';
import Link from 'next/link';
import DashboardClient from './dashboard/DashboardClient';
import AuthPopup from '@/components/AuthPopup';
import { calculateSmartCentering } from '@/utils/map/smartCentering';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const { userId } = await auth();
  const supabase = createAdminClient();

  let tripQuery = supabase
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
    .order('created_at', { ascending: false });

  if (userId) {
    tripQuery = tripQuery.or(`user_id.eq.${userId},is_public.eq.true`);
  } else {
    tripQuery = tripQuery.eq('is_public', true);
  }

  const { data: trips, error } = await tripQuery;

  if (error) {
    console.error('Error fetching trips:', error);
  }

  const validTrips = trips || [];
  const markers: MapMarker[] = [];

  const clientTrips = validTrips.map((trip) => {
    // Find the first photo with valid coordinates to use as the trip's pin
    const firstValidPhoto = trip.photos?.find((p: any) =>
      typeof p.lat === 'number' && typeof p.lng === 'number' && Number.isFinite(p.lat) && Number.isFinite(p.lng)
    );

    // Only add marker if trip has GPS coordinates
    if (firstValidPhoto) {
      markers.push({
        id: trip.id,
        lat: firstValidPhoto.lat,
        lng: firstValidPhoto.lng,
        label: trip.name,
        imageUrl: firstValidPhoto.storage_url,
        tripName: trip.name,
        photoCount: trip.photos?.length || 0,
        isPublic: Boolean(trip.is_public),
        isMine: trip.user_id === userId,
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

  // Use smart centering to calculate optimal center and zoom
  const centeringResult = calculateSmartCentering(markers, {
    minZoom: 2,
    maxZoom: 12,
    paddingFactor: 0.15, // Add 15% padding for better visualization
  });

  const initialCenter = centeringResult.center;
  const initialZoom = centeringResult.zoom;

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-4rem)]">
      {/* Dashboard Header/Actions */}
      <div className="bg-white border-b border-stone-200 px-6 py-4 flex items-center justify-between z-20">
        <h1 className="text-2xl font-bold text-stone-900 tracking-tight">
          {userId ? 'Your Atlas' : 'Shared Atlas'}
        </h1>
        {userId ? (
          <Link
            href="/trips/new"
            className="flex items-center gap-2 bg-stone-900 text-white px-4 py-2 rounded-full text-sm font-medium hover:bg-stone-800 transition-colors shadow-sm"
          >
            <Plus size={16} />
            <span className="hidden sm:inline">Add Trip</span>
          </Link>
        ) : (
          <div className="text-sm text-stone-500">
            Explore public trips or sign in to create your own.
          </div>
        )}
      </div>

      <DashboardClient
        trips={clientTrips}
        markers={markers}
        initialCenter={initialCenter}
        initialZoom={initialZoom}
        isAuthenticated={Boolean(userId)}
      />
      {!userId && <AuthPopup />}
    </div>
  );
}
