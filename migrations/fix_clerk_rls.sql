-- Migration: Fix Clerk RLS Compatibility
-- Replaces auth.uid() with auth.jwt() ->> 'sub' for Clerk string-based user IDs

-- 1. Fix Trips Policies
DROP POLICY IF EXISTS "Users can view their own trips" ON trips;
CREATE POLICY "Users can view their own trips" ON trips FOR SELECT USING (user_id = (auth.jwt() ->> 'sub'));

DROP POLICY IF EXISTS "Users can create their own trips" ON trips;
CREATE POLICY "Users can create their own trips" ON trips FOR INSERT WITH CHECK (user_id = (auth.jwt() ->> 'sub'));

DROP POLICY IF EXISTS "Users can update their own trips" ON trips;
CREATE POLICY "Users can update their own trips" ON trips FOR UPDATE USING (user_id = (auth.jwt() ->> 'sub'));

DROP POLICY IF EXISTS "Users can delete their own trips" ON trips;
CREATE POLICY "Users can delete their own trips" ON trips FOR DELETE USING (user_id = (auth.jwt() ->> 'sub'));

-- 2. Fix Photos Policies
DROP POLICY IF EXISTS "Users can view photos from their own trips" ON photos;
CREATE POLICY "Users can view photos from their own trips" ON photos FOR SELECT USING (
  EXISTS (SELECT 1 FROM trips WHERE trips.id = photos.trip_id AND trips.user_id = (auth.jwt() ->> 'sub'))
);

DROP POLICY IF EXISTS "Users can upload photos to their own trips" ON photos;
CREATE POLICY "Users can upload photos to their own trips" ON photos FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM trips WHERE trips.id = photos.trip_id AND trips.user_id = (auth.jwt() ->> 'sub'))
);

DROP POLICY IF EXISTS "Users can delete photos from their own trips" ON photos;
CREATE POLICY "Users can delete photos from their own trips" ON photos FOR DELETE USING (
  EXISTS (SELECT 1 FROM trips WHERE trips.id = photos.trip_id AND trips.user_id = (auth.jwt() ->> 'sub'))
);

-- 3. Fix Storage Policies
DROP POLICY IF EXISTS "Users can upload to their own folder" ON storage.objects;
CREATE POLICY "Users can upload to their own folder"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'photos' AND
  (storage.foldername(name))[1] = (auth.jwt() ->> 'sub')
);

DROP POLICY IF EXISTS "Users can delete their own photos" ON storage.objects;
CREATE POLICY "Users can delete their own photos"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'photos' AND
  (storage.foldername(name))[1] = (auth.jwt() ->> 'sub')
);

DROP POLICY IF EXISTS "Users can update their own photos" ON storage.objects;
CREATE POLICY "Users can update their own photos"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'photos' AND
  (storage.foldername(name))[1] = (auth.jwt() ->> 'sub')
);
