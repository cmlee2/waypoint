# Waypoint

Waypoint is a geospatial photo journaling application designed to transform static photo libraries into interactive trip narratives. By integrating Google Photos with advanced mapping technologies, Waypoint allows users to visualize their travels through space and time with high-fidelity clusters and synchronized timeline views.

## Technical Architecture

### Core Stack
*   **Frontend**: Next.js (App Router) with TypeScript
*   **Authentication**: Clerk for secure identity management and social login
*   **Database**: Supabase (Postgres) with Row Level Security (RLS)
*   **Storage**: Supabase Storage with granular path-based access control
*   **Mapping**: Leaflet and Mapbox GL for performant geospatial visualization
*   **Styling**: Tailwind CSS v4 and Vanilla CSS for minimalist, Stone-palette UI

### Cloud Integrations & APIs
*   **Google Photos API**: Custom OAuth flow with automatic token refresh loops for persistent media access.
*   **Nominatim (OpenStreetMap)**: Batch reverse-geocoding for place enrichment and human-readable location labels.
*   **Media Processing**: Browser-based image compression and EXIF metadata extraction (exifr) for geospatial precision.

## Key Features

### Intelligent Mapping
*   **Rich Waypoint System**: Clean "White Card" popup UI displaying location names, pure dates, and captions.
*   **Advanced Clustering**: Custom Leaflet markers with dynamic location labels and memory-count badges.
*   **Smart Centering**: Automated viewport calculation using bounding box logic to ensure all memories are perfectly framed.
*   **Interactive Grid Previews**: Dynamic 2x2 photo grids within map clusters for rapid content discovery.

### Privacy and Social Sharing
*   **Granular Visibility**: Support for both private and public trips, allowing users to share specific travel narratives while keeping personal memories secure.
*   **Row Level Security**: Robust multi-tenant isolation using Supabase RLS, ensuring users can only access their authorized content.

### Interactive Synchronization
*   **Bidirectional Sync**: Selecting a photo in the timeline pans the map to the corresponding waypoint; clicking a map marker scrolls and highlights the specific memory in the timeline.
*   **Multi-Highlighting**: Supports waypoint clusters, allowing users to highlight multiple photos at a single location simultaneously.

### Robust Media Import
*   **Persistent Sessions**: Advanced session management for Google Photos picker, allowing background imports without re-authentication.
*   **Place Enrichment**: Automated background tasks to fill missing place data for historical photos using reverse-geocoding.

## AI-Native Development Workflow

Waypoint was developed using an agentic, AI-first workflow. This approach significantly accelerated the development lifecycle through:

*   **Agentic Orchestration**: Extensive use of the Gemini CLI for complex refactorings, system design, and automated testing.
*   **Persistent Context**: Utilization of dedicated markdown files (GEMINI.md and MEMORY.md) to preserve architectural decisions and project state across development cycles.
*   **Strategic Research**: AI-driven analysis of complex library behaviors (e.g., React-Leaflet hydration issues and Google Photos token lifecycle) to implement resilient, production-grade solutions.

## Database Schema Overview

The system operates on a hardened Postgres schema managed via Supabase:

*   **trips**: Encapsulates travel events, linked to Clerk user IDs with strict RLS policies.
*   **photos**: Stores media metadata, geospatial coordinates, and enriched place data (place_name, place_type).
*   **Security**: Path-based storage policies (bucket_id/user_id/trip_id) ensure data isolation and security at the infrastructure level.

## Getting Started

### Prerequisites
*   Node.js (latest LTS)
*   Google Cloud Console credentials (Photos Library API enabled)
*   Supabase Project (Database and Storage Buckets configured)
*   Clerk Account

### Installation
1. Clone the repository
2. Install dependencies: `npm install`
3. Configure environment variables in `.env.local`
4. Run migrations: `npm run migrations` (using Supabase CLI)
5. Start the development server: `npm run dev`
