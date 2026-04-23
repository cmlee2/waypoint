# Waypoint - Map Safety & Cost Prevention Guide

This document outlines how to keep Waypoint in the **$0/month** bracket for Mapbox and provides the strategy for switching between Mapbox and Leaflet.

## 1. Mapbox Free Tier Protection

Mapbox GL JS (Web) is free for **50,000 "Map Loads"** per month. A load occurs whenever a `Map` component is initialized.

### How to Stay Free:
- **Persistent Component:** Do not unmount the map when a user navigates between trip entries. Keep the map in a layout or high-level context so it stays active.
- **Controlled Re-renders:** Use `React.memo` or careful state management to ensure the Map component itself doesn't re-initialize when props change (like markers or center coordinates).
- **Limit Geocoding:** Extraction of GPS coordinates should happen via **exifr** (client-side) rather than using Mapbox Geocoding APIs. We already have `exifr` in `package.json`.
- **Static Images:** For "Trip Cards" on the dashboard, use standard CSS or local image previews instead of Mapbox Static Image APIs where possible.

### Budget Alerts:
- Visit [Mapbox Billing](https://account.mapbox.com/billing) and set a **Budget Alert** at $0.01 to get an email the moment you hit the limit.

---

## 2. Dual-Map Architecture

To allow for easy switching between Mapbox and Leaflet, we will use a common `MapProvider` pattern.

### The Interface:
Both map implementations will accept the same `TripMapProps`:
```typescript
interface TripMapProps {
  center: [number, number]; // [lat, lng]
  zoom: number;
  markers: Array<{ id: string; lat: number; lng: number; imageUrl?: string }>;
  onMarkerClick: (id: string) => void;
  style?: 'pencil' | 'treasure' | 'watercolor' | 'standard';
}
```

### File Structure:
- `src/components/map/MapboxEngine.tsx` - High-performance, vector-based.
- `src/components/map/LeafletEngine.tsx` - Open-source, raster-based.
- `src/components/map/MapDisplay.tsx` - The switcher that reads from `.env` or local state.

---

## 3. Aesthetic Goals for Both Engines

| Feature | Mapbox Goal | Leaflet Goal |
| :--- | :--- | :--- |
| **Theme** | Custom "Pencil" or "Treasure" Vector Style | "Stamen Watercolor" or "Positron" Tiles |
| **Feel** | Hand-drawn textures, vector clarity | Organic, paper-like edges, vintage feel |
| **Zoom** | Smooth continuous zoom (60fps) | Discrete zoom levels (step-based) |
| **Performance** | GPU Accelerated (handles thousands of photos) | DOM-based (better for <100 markers) |
