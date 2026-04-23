import React from 'react';
import { auth } from '@clerk/nextjs/server';
import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import TripViewClient from './TripViewClient';

export default async function TripPage({ params }: { params: { id: string } }) {
  const { userId } = await auth();
  if (!userId) {
    redirect('/sign-in');
  }

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  // Fetch the trip and its photos, ordering photos by taken_at
  const { data: trip, error } = await supabase
    .from('trips')
    .select(`
      *,
      photos (
        id,
        storage_url,
        caption,
        lat,
        lng,
        taken_at
      )
    `)
    .eq('id', params.id)
    .single();

  if (error || !trip) {
    console.error('Error fetching trip:', error);
    notFound();
  }

  // Ensure user has access (either owns it or it's public)
  if (trip.user_id !== userId && !trip.is_public) {
    notFound();
  }

  // Sort photos chronologically
  const sortedPhotos = [...(trip.photos || [])].sort((a, b) => {
    if (!a.taken_at) return 1;
    if (!b.taken_at) return -1;
    return new Date(a.taken_at).getTime() - new Date(b.taken_at).getTime();
  });

  return (
    <TripViewClient 
      trip={{...trip, photos: sortedPhotos}} 
      isMine={trip.user_id === userId} 
    />
  );
}
