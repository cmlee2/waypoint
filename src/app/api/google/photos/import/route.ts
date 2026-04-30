import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';
import { GooglePhoto, createGooglePhotosClient } from '@/utils/google/photos';

/**
 * Import photos from Google Photos
 * This endpoint handles the import of selected photos from Google Photos
 */

export async function POST(request: NextRequest) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { photos, tripId, accessToken } = body;

    if (!photos || !Array.isArray(photos) || photos.length === 0) {
      return NextResponse.json({ error: 'No photos provided' }, { status: 400 });
    }

    if (!accessToken) {
      return NextResponse.json({ error: 'Access token required' }, { status: 400 });
    }

    // Initialize Supabase client
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    );

    // Verify trip ownership if tripId is provided
    if (tripId) {
      const { data: trip, error: tripError } = await supabase
        .from('trips')
        .select('user_id')
        .eq('id', tripId)
        .single();

      if (tripError || !trip) {
        return NextResponse.json({ error: 'Trip not found' }, { status: 404 });
      }

      if (trip.user_id !== userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
      }
    }

    // Initialize Google Photos client
    const { client, rateLimiter } = createGooglePhotosClient(accessToken);

    // Process photos with rate limiting
    const processedPhotos = await Promise.all(
      photos.map(async (photo: GooglePhoto) => {
        try {
          // Convert photo to upload format
          const uploadData = await rateLimiter.execute(() =>
            client.convertToUploadFormat(photo)
          );

          // Upload to Supabase Storage
          const fileName = `${userId}/${Date.now()}-${uploadData.filename}`;
          const { data: uploadDataResult, error: uploadError } = await supabase.storage
            .from('photos')
            .upload(fileName, uploadData.file, {
              contentType: uploadData.file.type || 'image/jpeg',
              upsert: false,
            });

          if (uploadError) {
            console.error('Upload error:', uploadError);
            throw new Error(`Failed to upload photo: ${uploadError.message}`);
          }

          // Get public URL
          const { data: publicUrlData } = supabase.storage
            .from('photos')
            .getPublicUrl(fileName);

          // Create photo record in database
          const { data: photoRecord, error: dbError } = await supabase
            .from('photos')
            .insert({
              trip_id: tripId,
              storage_url: publicUrlData.publicUrl,
              lat: uploadData.lat,
              lng: uploadData.lng,
              taken_at: uploadData.takenAt?.toISOString(),
            })
            .select()
            .single();

          if (dbError) {
            console.error('Database error:', dbError);
            throw new Error(`Failed to create photo record: ${dbError.message}`);
          }

          return {
            success: true,
            photo: photoRecord,
            originalPhoto: photo,
          };
        } catch (error) {
          console.error('Failed to process photo:', photo.id, error);
          return {
            success: false,
            photoId: photo.id,
            error: error instanceof Error ? error.message : 'Unknown error',
          };
        }
      })
    );

    // Count successes and failures
    const successes = processedPhotos.filter(p => p.success);
    const failures = processedPhotos.filter(p => !p.success);

    return NextResponse.json({
      success: true,
      imported: successes.length,
      failed: failures.length,
      photos: successes.map(s => s.photo),
      errors: failures,
    });
  } catch (error) {
    console.error('Import error:', error);
    return NextResponse.json(
      { error: 'Import failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
