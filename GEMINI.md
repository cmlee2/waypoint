# Waypoint - Project Context & Rules

## Project Overview
Waypoint is a travel memory app that builds interactive trip maps from geotagged photos. It extracts location and timestamp data, plots trips on a map, and organizes memories into a timeline.

## Current Stack
- **Framework:** Next.js App Router
- **Styling:** Tailwind CSS
- **Database and Storage:** Supabase
- **Auth:** Clerk
- **Maps:** Mapbox GL JS via `react-map-gl`
- **Image Processing:** `exifr` on the client, `sharp` on the server

## Working Rules
- Use React Server Components by default. Limit `"use client"` to interactive UI such as maps and upload flows.
- Keep Supabase environment variables aligned on `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, and `SUPABASE_SERVICE_ROLE_KEY`.
- Limit uploads to 15 photos per trip.
- Resize and compress images on the server before uploading to Supabase Storage.
- Preserve the scrapbook aesthetic: warm tones, textured surfaces, and expressive typography.

## Agent Responsibilities
- `@database-agent`: Supabase schema design, migrations, RLS, and future geospatial work.
- `@map-agent`: Mapbox initialization, styling, markers, routes, and viewport behavior.
- `@photo-agent`: EXIF extraction, upload pipeline, image processing, storage integration, and upload limits.
- `@ui-agent`: Next.js layout, Tailwind implementation, scrapbook presentation, timeline UI, and Clerk UI integration.

## Repo MCP Notes
- Prefer a repo-local `.mcp.json` so this project uses the correct Supabase project ref.
- This repo expects both Supabase MCP and Playwright MCP to be available for database work and browser verification.
