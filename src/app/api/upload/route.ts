import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';
import sharp from 'sharp';
import { v4 as uuidv4 } from 'uuid';

// Initialize Supabase with Service Role for admin-level operations (resizing/storage)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const formData = await req.formData();
    const name = formData.get('name') as string;
    const description = formData.get('description') as string;
    const startDate = formData.get('startDate') as string;
    const endDate = formData.get('endDate') as string;
    const isPublic = formData.get('isPublic') === 'true';
    const photoCount = parseInt(formData.get('photoCount') as string || '0');

    // 1. Create the Trip record
    const { data: trip, error: tripError } = await supabaseAdmin
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
      const meta = JSON.parse(metaStr);

      if (!file) continue;

      const buffer = Buffer.from(await file.arrayBuffer());
      
      // OPTIMIZATION: Resize and convert to WebP to save storage space
      // Max width 1600px, quality 80 for ~200-300KB files
      const optimizedBuffer = await sharp(buffer)
        .resize({ width: 1600, withoutEnlargement: true })
        .webp({ quality: 80 })
        .toBuffer();

      const fileName = `${userId}/${trip.id}/${uuidv4()}.webp`;

      // Upload to Supabase Storage
      const { data: storageData, error: storageError } = await supabaseAdmin
        .storage
        .from('photos')
        .upload(fileName, optimizedBuffer, {
          contentType: 'image/webp',
          cacheControl: '3600',
          upsert: false
        });

      if (storageError) {
        console.error('Storage error for file', i, storageError);
        continue;
      }

      // Get public URL
      const { data: { publicUrl } } = supabaseAdmin
        .storage
        .from('photos')
        .getPublicUrl(fileName);

      // Save Photo record in DB
      photoPromises.push(
        supabaseAdmin.from('photos').insert({
          trip_id: trip.id,
          storage_url: publicUrl,
          lat: meta.lat || 0,
          lng: meta.lng || 0,
          taken_at: meta.takenAt || null,
          caption: meta.caption || ''
        })
      );
    }

    await Promise.all(photoPromises);

    return NextResponse.json({ success: true, tripId: trip.id });
  } catch (err: any) {
    console.error('Upload API Error:', err);
    return new NextResponse(err.message || 'Internal Server Error', { status: 500 });
  }
}
