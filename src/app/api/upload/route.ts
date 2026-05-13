import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createAuthenticatedClient } from '@/utils/supabase/server';
import { v4 as uuidv4 } from 'uuid';

function isMissingPlaceColumnError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;

  const message = 'message' in error && typeof error.message === 'string' ? error.message : '';
  const details = 'details' in error && typeof error.details === 'string' ? error.details : '';

  return message.includes('place_name') || message.includes('place_type') || details.includes('place_name') || details.includes('place_type');
}

function getFileExtension(file: File) {
  const originalExtension = file.name.split('.').pop()?.toLowerCase();
  if (originalExtension && /^[a-z0-9]+$/.test(originalExtension)) {
    return `.${originalExtension}`;
  }

  const typeToExtension: Record<string, string> = {
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/webp': '.webp',
    'image/heic': '.heic',
    'image/heif': '.heif',
    'image/gif': '.gif',
  };

  return typeToExtension[file.type] || '.jpg';
}

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    // Clerk 'supabase' template is now configured, using Authenticated Client for RLS.
    const supabase = await createAuthenticatedClient();

    const formData = await req.formData();
    const name = formData.get('name') as string;
    const description = formData.get('description') as string;
    const startDate = formData.get('startDate') as string;
    const endDate = formData.get('endDate') as string;
    const isPublic = formData.get('isPublic') === 'true';
    const photoCount = parseInt(formData.get('photoCount') as string || '0');

    // 1. Create the Trip record
    const { data: trip, error: tripError } = await supabase
      .from('trips')
      .insert({
        user_id: userId,
        name,
        description,
        start_date: startDate || null,
        end_date: endDate || null,
        is_public: isPublic
      })
      .select()
      .single();

    if (tripError) throw tripError;

    // 2. Process and Upload Photos
    const photoPromises = [];

    for (let i = 0; i < photoCount; i++) {
      const file = formData.get(`file_${i}`) as File;
      const metaStr = formData.get(`meta_${i}`) as string;
      let meta: Record<string, unknown> = {};

      if (!file) continue;

      try {
        meta = metaStr ? (JSON.parse(metaStr) as Record<string, unknown>) : {};
      } catch (error) {
        console.warn(`Invalid photo metadata for file ${i}`, error);
      }

      const buffer = Buffer.from(await file.arrayBuffer());
      const fileName = `${userId}/${trip.id}/${uuidv4()}${getFileExtension(file)}`;

      // Upload original file directly
      const { data: storageData, error: storageError } = await supabase
        .storage
        .from('photos')
        .upload(fileName, buffer, {
          contentType: file.type || 'image/jpeg',
          cacheControl: '3600',
          upsert: false
        });

      if (storageError) {
        console.error('Storage error for file', i, storageError);
        continue;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase
        .storage
        .from('photos')
        .getPublicUrl(fileName);

      const lat = typeof meta.lat === 'number' && Number.isFinite(meta.lat) ? meta.lat : null;
      const lng = typeof meta.lng === 'number' && Number.isFinite(meta.lng) ? meta.lng : null;
      const takenAt = typeof meta.takenAt === 'string' ? new Date(meta.takenAt) : null;
      const locationName = typeof meta.locationName === 'string' ? meta.locationName : null;

      // Extract place type from location name if available
      let placeType: string | null = null;
      if (locationName) {
        const lowerName = locationName.toLowerCase();
        if (lowerName.includes('restaurant') || lowerName.includes('cafe') || lowerName.includes('coffee')) {
          placeType = 'restaurant';
        } else if (lowerName.includes('museum') || lowerName.includes('gallery')) {
          placeType = 'museum';
        } else if (lowerName.includes('park') || lowerName.includes('garden')) {
          placeType = 'park';
        } else if (lowerName.includes('hotel') || lowerName.includes('resort')) {
          placeType = 'hotel';
        } else if (lowerName.includes('shop') || lowerName.includes('store')) {
          placeType = 'shop';
        } else {
          placeType = 'unknown';
        }
      }

      const photoInsert = {
        trip_id: trip.id,
        storage_url: publicUrl,
        lat,
        lng,
        taken_at: takenAt && !Number.isNaN(takenAt.getTime()) ? takenAt.toISOString() : null,
        caption: typeof meta.caption === 'string' ? meta.caption : '',
        place_name: locationName,
        place_type: placeType
      };

      // Save Photo record in DB
      photoPromises.push(
        (async () => {
          const { error: insertError } = await supabase.from('photos').insert(photoInsert);

          if (!insertError) {
            return;
          }

          if (!isMissingPlaceColumnError(insertError)) {
            throw insertError;
          }

          console.warn('photos.place_name/place_type missing in database; retrying photo insert without place fields');

          const { place_name: _placeName, place_type: _placeType, ...legacyInsert } = photoInsert;
          const { error: legacyInsertError } = await supabase.from('photos').insert(legacyInsert);

          if (legacyInsertError) {
            throw legacyInsertError;
          }
        })()
      );
    }

    await Promise.all(photoPromises);

    return NextResponse.json({ success: true, tripId: trip.id });
  } catch (err: any) {
    console.error('Upload API Error:', err);
    return new NextResponse(err.message || 'Internal Server Error', { status: 500 });
  }
}
