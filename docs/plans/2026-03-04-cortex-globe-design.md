# Cortex Globe — Design Document

**Date:** 2026-03-04
**Status:** Approved

## Overview

A full-viewport, immersive 3D globe data explorer built with React Three Fiber. Displays Snowflake POS transaction data (587M records, 30 cities, 15 countries) on a stylized dark globe with glowing city markers. Users can rotate/zoom the globe, click cities for detail cards, and toggle a summary panel.

## What Stays From Snowglobe (Copied, Not Modified)

- Snowflake connection code (`lib/snowflake.ts`) — JWT/RSA auth
- RSA key pairs (`.keys/` directory)
- `.env.local` configuration
- API routes: `/api/cities`, `/api/city`, `/api/cortex/complete`
- Zustand store structure (adapted for new UI)
- `cityData.ts` fallback data

## What Gets Removed (Not Carried Over)

- Snow particles, shake button, glass dome
- CSS background snowfall animations
- Copilot chat widget + `/api/cortex/analyst` route
- Vanilla Three.js Scene.tsx
- Snow globe themed styling

## Architecture

### Tech Stack

- **Framework:** Next.js (latest)
- **3D:** React Three Fiber + @react-three/drei + @react-three/postprocessing
- **State:** Zustand
- **Animation:** Framer Motion (UI panels), R3F spring animations (camera)
- **Styling:** Tailwind CSS
- **Backend:** Next.js API routes → Snowflake SDK
- **Auth:** RSA Key-Pair JWT (existing)

### Layout

Full viewport (100vw × 100vh) R3F Canvas with HTML overlays:

- **Center:** 3D globe, fills viewport
- **Top-left:** App title + Cortex connection status badge
- **Top-right:** Summary panel toggle button
- **On city click:** Floating glassmorphism detail card near the marker
- **Right side (toggle):** Summary data panel

## Globe Design

### Earth

- Sphere geometry with NASA satellite texture + bump mapping (from snowglobe assets)
- Custom atmosphere shader — blue-cyan Fresnel glow around edges
- Slow auto-rotation (pauses on user interaction, resumes after idle)
- Dark space background with subtle star field (drei `<Stars>`)

### City Markers

- 30 instanced mesh points on globe surface
- Sized proportionally by revenue (Cape Town largest, etc.)
- Color: cyan/teal glow (#00eeff family)
- Hover state: marker pulses larger, city name tooltip appears
- Click state: camera flies to city, detail card opens

### Postprocessing

- Bloom effect (makes markers and atmosphere glow)
- Vignette (darkens edges for focus)
- Subtle chromatic aberration (optional, for style)

### Controls

- OrbitControls: drag to rotate, scroll to zoom
- Zoom clamped: min distance (close enough to see city region), max distance (see full globe)
- Smooth damping enabled

## City Detail Card

Triggered by clicking a city marker. Uses drei's `<Html>` component to anchor an HTML overlay in 3D space near the city.

### Content

- **Header:** City name, country flag/name
- **KPI row:** Total Revenue, Total Orders, Avg Order Value, Active Trucks (4 compact metrics)
- **Trend sparkline:** 22-month mini chart (SVG, reuse sparkline logic)
- **Top 3 items:** Ranked list with mini horizontal bars
- **AI narrative:** 2-3 sentence insight from Cortex Complete (`mistral-large2`)
- **Close button:** X icon, also dismisses on clicking elsewhere

### Style

- Glassmorphism: semi-transparent dark background, backdrop blur, subtle border
- Matches dark theme with cyan accents
- Appears with fade+scale animation
- Card width ~320px

## Summary Panel

Toggle panel that slides in from the right edge.

### Content

- **Portfolio total:** Total revenue ($24.7B), total orders
- **Top 10 cities:** Ranked by revenue with horizontal bar chart
- **Top 5 menu items:** Global best sellers
- **Data freshness:** Last refresh timestamp

### Style

- ~400px wide, full height
- Dark glass effect with backdrop blur
- Framer Motion slide-in/out animation
- Scrollable if content overflows

## Visual Style

- **Background:** Very dark (#0a0a1a)
- **Accents:** Cyan/teal (#00eeff, #06b6d4)
- **Text:** White/gray on dark
- **Typography:** Inter or system sans-serif, clean and modern
- **Effects:** Bloom glow, backdrop blur, glassmorphism panels
- **Overall feel:** Futuristic command center / data observatory

## New Dependencies

- `@react-three/fiber` — React renderer for Three.js
- `@react-three/drei` — OrbitControls, Html, Stars, etc.
- `@react-three/postprocessing` — Bloom, Vignette, EffectComposer
- Three.js (peer dependency of R3F)

## Data Flow

1. App loads → `GET /api/cities` → 30 cities with KPI summaries → render markers on globe
2. User clicks marker → camera flies to city → `GET /api/city?name=X` → KPI, trend, top items → render detail card
3. Detail card loads → `POST /api/cortex/complete` → AI narrative → append to card
4. User toggles summary → panel shows aggregate data (already loaded from step 1)
