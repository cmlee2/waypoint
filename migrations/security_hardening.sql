-- Migration: Security Hardening
-- This migration restricts storage access and ensures robust RLS policies

-- 1. Restrict Storage Uploads
-- Remove the broad policy that allowed any authenticated user to upload anywhere
DROP POLICY IF EXISTS "Authenticated users can upload photos" ON storage.objects;

-- Add a restrictive policy that only allows users to upload to their own folder
-- Path format: {userId}/{tripId}/{filename}
CREATE POLICY "Users can upload to their own folder"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'photos' AND
  (storage.foldername(name))[1] = (auth.uid())::text
);

-- 2. Restrict Storage Deletions/Updates
-- Ensure users can only modify their own photos based on the path
DROP POLICY IF EXISTS "Users can delete their own photos" ON storage.objects;
CREATE POLICY "Users can delete their own photos"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'photos' AND
  (storage.foldername(name))[1] = (auth.uid())::text
);

DROP POLICY IF EXISTS "Users can update their own photos" ON storage.objects;
CREATE POLICY "Users can update their own photos"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'photos' AND
  (storage.foldername(name))[1] = (auth.uid())::text
);

-- 3. Ensure Table RLS is fully enabled (defense in depth)
ALTER TABLE trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE photos ENABLE ROW LEVEL SECURITY;

-- 4. Add index for performance on user_id if not already there
CREATE INDEX IF NOT EXISTS idx_trips_user_id ON trips(user_id);
