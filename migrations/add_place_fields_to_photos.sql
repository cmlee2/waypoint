-- Migration: Add place fields to photos table
-- This migration adds place_name and place_type fields to support automatic place lookup

-- Add place_name and place_type fields to photos table
ALTER TABLE photos
ADD COLUMN IF NOT EXISTS place_name TEXT,
ADD COLUMN IF NOT EXISTS place_type TEXT;

-- Create index on place_name for efficient queries
CREATE INDEX IF NOT EXISTS idx_photos_place_name ON photos(place_name);

-- Create index on place_type for efficient queries
CREATE INDEX IF NOT EXISTS idx_photos_place_type ON photos(place_type);

-- Add comment to document the new fields
COMMENT ON COLUMN photos.place_name IS 'Name of the place/business where photo was taken (auto-populated from reverse geocoding)';
COMMENT ON COLUMN photos.place_type IS 'Type of place (e.g., restaurant, museum, park) from reverse geocoding';

-- Verify the migration
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'photos'
AND column_name IN ('place_name', 'place_type')
ORDER BY column_name;