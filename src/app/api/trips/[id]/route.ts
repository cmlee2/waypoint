import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createAuthenticatedClient } from '@/utils/supabase/server';

/**
 * Update trip visibility (is_public)
 * Only the trip owner can change this setting
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { 
      is_public, 
      name, 
      description, 
      start_date, 
      end_date, 
      photoUpdates, 
      photosToDelete 
    } = body;

    const supabase = await createAuthenticatedClient();

    // 1. Update Trip Metadata
    const tripUpdate: any = { updated_at: new Date().toISOString() };
    if (typeof is_public === 'boolean') tripUpdate.is_public = is_public;
    if (typeof name === 'string') tripUpdate.name = name;
    if (typeof description === 'string') tripUpdate.description = description;
    if (start_date !== undefined) tripUpdate.start_date = start_date;
    if (end_date !== undefined) tripUpdate.end_date = end_date;

    const { data: tripData, error: tripError } = await supabase
      .from('trips')
      .update(tripUpdate)
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();

    if (tripError) {
      console.error('Error updating trip metadata:', tripError);
      return NextResponse.json({ error: 'Failed to update trip metadata' }, { status: 500 });
    }

    // 2. Handle Photo Deletions
    if (Array.isArray(photosToDelete) && photosToDelete.length > 0) {
      // First, get the storage URLs so we can delete from storage
      const { data: photos, error: fetchError } = await supabase
        .from('photos')
        .select('id, storage_url')
        .in('id', photosToDelete)
        .eq('trip_id', id);

      if (!fetchError && photos) {
        // Extract paths from public URLs
        // URL format: https://.../storage/v1/object/public/photos/USER_ID/TRIP_ID/FILENAME
        const pathsToDelete = photos.map(p => {
          const urlParts = p.storage_url.split('/photos/');
          return urlParts.length > 1 ? urlParts[1] : null;
        }).filter(Boolean) as string[];

        if (pathsToDelete.length > 0) {
          const { error: storageError } = await supabase
            .storage
            .from('photos')
            .remove(pathsToDelete);
          
          if (storageError) {
            console.error('Error deleting from storage:', storageError);
          }
        }

        // Delete from database
        const { error: dbDeleteError } = await supabase
          .from('photos')
          .delete()
          .in('id', photosToDelete)
          .eq('trip_id', id);

        if (dbDeleteError) {
          console.error('Error deleting from database:', dbDeleteError);
        }
      }
    }

    // 3. Handle Photo Caption Updates
    if (Array.isArray(photoUpdates) && photoUpdates.length > 0) {
      // We perform individual updates in a promise pool for now
      // Alternatively, we could use a RPC for batch updates if needed
      await Promise.all(photoUpdates.map(async (update: { id: string, caption: string }) => {
        return supabase
          .from('photos')
          .update({ caption: update.caption })
          .eq('id', update.id)
          .eq('trip_id', id);
      }));
    }

    return NextResponse.json({ success: true, trip: tripData });
  } catch (error) {
    console.error('API Error in PATCH /api/trips/[id]:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
