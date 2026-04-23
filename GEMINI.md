# Waypoint - Project Context & Rules

## Project Overview
Waypoint is a travel memory app that auto-builds interactive trip maps from geotagged photos. It extracts location/timestamp data, plots them on a map, and organizes them into a timeline.

## Tech Stack
- **Framework:** Next.js (App Router)
- **Styling:** Tailwind CSS (scrapbook-like feel, soft colors, textured edges)
- **Database/Storage:** Supabase (Postgres, Storage for photos)
- **Auth:** Clerk
- **Maps:** Mapbox GL JS (via `react-map-gl`) - "warm, empty world map" aesthetic
- **Image Processing:** `exifr` (client-side EXIF), `sharp` (server-side Next.js API routes for resizing)

## Rules & Conventions
- **Component Strategy:** Use React Server Components by default. Use Client Components (`"use client"`) strictly for interactive pieces (Mapbox, photo uploaders).
- **Environment Variables:** Expect `.env.local` for Clerk, Supabase, and Mapbox keys.
- **Constraints:** 
  - Limit photo uploads to 15 photos per trip initially to save storage space.
  - Image resizing must happen on the server via `sharp` before uploading to Supabase Storage.
- **Styling:** Adhere to the defined "scrapbook" aesthetic (warm tones, handwritten typography).

## Build Plan (First Draft)
1. **Phase 1: Foundation**
   - Initialize Next.js project with Tailwind CSS.
   - Setup Clerk authentication wrapper.
   - Setup basic UI shell (warm map aesthetic placeholder).
2. **Phase 2: Database & Storage (Supabase)**
   - Define schema for `trips` and `photos`.
   - Setup Supabase storage bucket for photos.
3. **Phase 3: Upload & Processing Loop**
   - Build client-side photo uploader (max 15 photos).
   - Integrate `exifr` to extract GPS coordinates and timestamps before upload.
   - Build Next.js API route using `sharp` to resize images, then upload to Supabase Storage.
4. **Phase 4: Map & Visualization**
   - Integrate Mapbox GL JS (`react-map-gl`).
   - Plot photo locations on the map using coordinates from the database.
   - Display basic timeline/journal entry UI.