# Project Proposal: Waypoint

## One-Line Description
A travel memory app that auto-builds interactive trip maps from your geotagged photos, with timelines, journal entries, and shareable trip profiles.

## The Problem
After a trip, your memories live in a disorganized camera roll and maybe a forgotten Google Sheet of your itinerary. You remember the highlights but forget the details — the restaurant you stumbled into on day three, the side street you walked down, the order of events that made the trip feel like a story. Photos have all the data (location, time) but no structure. There's no easy way to turn a pile of photos into a meaningful, browsable record of where you went and what you did.

Waypoint extracts location and timestamp data from your photos, plots them on a map, and organizes them into a timeline — automatically. You add journal entries and notes where you want, share trip maps with friends, and build a personal atlas of everywhere you've been.

## Target User
Travelers (20-35) who take a lot of photos but never organize them. People who want to look back on trips months or years later and actually remember the details. Not travel influencers — this is for personal memory, not content creation. The collaborative features serve friend groups who travel together and want a shared record of the trip.

## First-Time User Experience
You open Waypoint and see a warm, empty world map — soft colors, a scrapbook-like feel with textured paper edges and handwritten-style typography. A friendly prompt invites you to **"Add your first trip."** You name the trip, set the dates, and upload a batch of photos from your camera roll. The app processes them, and within seconds, pins appear on the map — your photos placed exactly where you took them, ordered by time. You click a pin and see your photos with the date and location. You add a short journal note: "Best ramen of my life." Your trip exists now — not as a forgotten folder on your phone, but as a living, browsable memory on a map.

## Core Features (v1)
1. **Trip Creation** — Manually create a trip ("Tokyo, March 2026") or let the app auto-detect trip clusters from uploaded photos based on date/location gaps. Users are prompted to create a trip manually but the app can also suggest trips from photo patterns.
2. **Photo Upload with Auto-Extraction** — Upload photos from camera roll. The app extracts GPS coordinates and timestamps from EXIF data (using `exifr`) and places them on the map automatically. Photos without geotags can be manually pinned.
3. **Interactive Trip Map** — A Mapbox-powered map showing pins for each photo/stop. Click a pin to see the photos, timestamp, and any journal notes for that location. Pins are connected by a route line showing the trip path chronologically.
4. **Timeline View** — A day-by-day timeline of the trip showing photos, locations, and journal entries in order. Toggle between map view and timeline view.
5. **Sharing** — Generate a shareable link to your trip map. Friends can view your trip (with your permission). For group trips, multiple users can contribute photos to the same trip collaboratively.

## Tech Stack
- **Frontend:** Next.js (App Router) — familiar stack, server components for initial load, client components for the interactive map
- **Styling:** Tailwind CSS — fast iteration, responsive design for eventual mobile use
- **Database:** Supabase (Postgres) — stores trip metadata, photo records (GPS, timestamp, storage path), journal entries, user profiles, sharing permissions. PostGIS extension available if advanced geospatial queries are needed.
- **Auth:** Clerk — user accounts, session management, sharing permissions
- **APIs:**
  - Mapbox GL JS (via `react-map-gl`) — interactive maps, beautiful styles, route rendering. Free tier: 50,000 map loads/month.
  - `exifr` (client-side) — EXIF extraction for GPS and datetime from uploaded photos including HEIC
  - `sharp` (server-side, Next.js API routes) — image resizing and WebP conversion before storage to manage Supabase storage limits
- **Storage:** Supabase Storage — S3-compatible object storage for photos. Resized to ~300KB/photo (~3,300 photos on free tier).
- **Deployment:** Vercel — zero-config Next.js hosting
- **MCP Servers:** Supabase MCP for database management and migrations during development

## Stretch Goals
- **Trip planning mode** — before a trip, add planned stops/destinations to a map, then compare planned vs. actual after
- **AI-powered journal prompts** — use an LLM to generate reflection prompts based on your photos and locations ("You spent 3 hours in Shibuya — what stood out?")
- **Auto-detect trips** — smart clustering that groups photos by date/location gaps and suggests "It looks like you went to Tokyo from March 3-10 — create a trip?"
- **Travel stats** — countries visited, cities explored, total distance traveled, a year-in-review summary
- **Social trip feed** — browse friends' trip maps from a profile page, "add to your map" to mark places you also want to visit
- **Offline capture mode** — a lightweight companion for logging notes/locations during a trip without uploading photos yet
- **React Native mobile app** — camera roll integration, background location tracking, push notifications for journal prompts
- **Export** — export a trip as a PDF photobook or printable map poster

## Biggest Risk
1. **EXIF data availability.** The whole auto-mapping feature depends on photos having GPS data. If a user had location services off, or their photos were processed through an app that strips EXIF (screenshots, WhatsApp forwards), the magic breaks. Need a clear fallback for manual pinning and good UX messaging when photos lack location data.
2. **Photo storage costs.** Even with resizing, a heavy user uploading hundreds of photos per trip will hit Supabase free tier limits quickly. Need to be smart about compression and possibly implement upload limits or prompt for Pro tier.
3. **Map UX complexity.** Making an interactive map that feels intuitive (not cluttered, easy to navigate between pins, smooth zoom/pan, clear chronological flow) is harder than it sounds. This will take significant design iteration.
4. **Collaborative trip syncing.** Multiple users uploading to the same trip introduces ordering, deduplication, and permission challenges. This is a stretch goal-level feature that could get complex fast.

## Week 5 Goal
A working prototype where a user can: (1) create an account and start a new trip, (2) upload photos from their camera roll, (3) see photos automatically plotted on a Mapbox map based on extracted GPS data, (4) click pins to view photos and timestamps, (5) add a journal note to any pin. No sharing, no collaboration, no timeline view yet — just the core loop of "upload photos, see them on a map, annotate them." If the auto-extraction works reliably, the demo basically sells itself.
