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