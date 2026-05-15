import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createAuthenticatedClient } from '@/utils/supabase/server';
import { v4 as uuidv4 } from 'uuid';

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

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const { id: tripId } = await params;
    const supabase = await createAuthenticatedClient();

    // Verify ownership
    const { data: trip, error: tripError } = await supabase
      .from('trips')
      .select('id')
      .eq('id', tripId)
      .eq('user_id', userId)
      .single();

    if (tripError || !trip) {
      return new NextResponse('Trip not found or unauthorized', { status: 404 });
    }

    const formData = await req.formData();
    const photoCount = parseInt(formData.get('photoCount') as string || '0');

    // Process and Upload Photos
    const photoPromises = [];

    for (let i = 0; i < photoCount; i++) {
      const file = formData.get(`file_${i}`) as File;
      const metaStr = formData.get(`meta_${i}`) as string;
      let meta: Record<string, any> = {};

      if (!file) continue;

      try {
        meta = metaStr ? JSON.parse(metaStr) : {};
      } catch (error) {
        console.warn(`Invalid photo metadata for file ${i}`, error);
      }

      const buffer = Buffer.from(await file.arrayBuffer());
      const fileName = `${userId}/${tripId}/${uuidv4()}${getFileExtension(file)}`;

      // Upload original file
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

      const photoInsert = {
        trip_id: tripId,
        storage_url: publicUrl,
        lat,
        lng,
        taken_at: takenAt && !Number.isNaN(takenAt.getTime()) ? takenAt.toISOString() : null,
        caption: typeof meta.caption === 'string' ? meta.caption : '',
        place_name: locationName,
        place_type: meta.placeType || 'unknown'
      };

      // Save Photo record in DB
      photoPromises.push(supabase.from('photos').insert(photoInsert));
    }

    await Promise.all(photoPromises);

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Append Photos API Error:', err);
    return new NextResponse(err.message || 'Internal Server Error', { status: 500 });
  }
}
