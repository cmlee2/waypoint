# Sub-Agent Roles for Waypoint

This document defines specialized agent personas to help modularize the development of Waypoint.

## 1. @database-agent
**Focus:** Supabase, Postgres, Data Modeling, MCP
**Responsibilities:**
- Designing robust and scalable database schemas for trips, users, and photos.
- Writing migrations and utilizing the Supabase MCP for schema management.
- Setting up Row Level Security (RLS) policies.
- Optimizing geospatial queries if PostGIS is introduced later.

## 2. @map-agent
**Focus:** Mapbox GL JS, react-map-gl, Geospatial UI
**Responsibilities:**
- Initializing and styling the Mapbox instance to achieve the "warm, empty world map" look.
- Plotting interactive markers and route lines connecting trip destinations.
- Handling map state (zoom, pan, bounding boxes around trip clusters).

## 3. @photo-agent
**Focus:** Image Processing, Upload Pipeline
**Responsibilities:**
- Implementing reliable client-side EXIF extraction using `exifr` (handling HEIC if necessary).
- Building the Next.js API route with `sharp` for image resizing and compression.
- Enforcing the 15-photo limit per trip.
- Integrating with Supabase Storage for secure and efficient photo hosting.

## 4. @ui-agent
**Focus:** Next.js App Router, Tailwind CSS, Aesthetic
**Responsibilities:**
- Building out the overarching Next.js layout and routing structure.
- Crafting the "scrapbook" aesthetic (soft colors, textured paper edges, handwritten typography).
- Building the timeline view and journal entry components.
- Integrating Clerk for seamless authentication UI.

## Current Handoff Notes

- The repo uses `src/proxy.ts` for Clerk auth/session handling on Next.js 16. `src/middleware.ts` was replaced because Clerk now documents `proxy.ts` for this setup.
- Supabase session refresh is defensive now. `src/utils/supabase/middleware.ts` should not crash if env vars are missing or token refresh fails.
- The homepage empty-state buttons were fixed to be real links, not inert buttons.
- The trip creation page uses the uploader flow and supports quick upload via `/trips/new?quickUpload=1#photos`.
- The uploader is still the main area to watch:
  - JPEGs from the local `IMG_3244.JPEG` test file had date metadata but no GPS metadata.
  - iPhone-origin photos can still lose GPS when exported/copied through Apple Photos or other transfer paths.
  - Date metadata is more reliable than location metadata; GPS should be treated as optional, not guaranteed.
  - Quick upload should allow click-to-browse as well as auto-open.
  - `Save Memories to Trip` should submit the whole trip, not just keep local previews.
- Current likely runtime pitfalls on Vercel:
  - Missing Clerk env vars in Production.
  - Wrong environment scope in Vercel for Clerk or Supabase keys.
  - Prerender/build issues from client hooks on pages that are still statically analyzed.
- `.mcp.json` is repo-local and includes Supabase + Playwright, but it is local workflow config, not app code.
