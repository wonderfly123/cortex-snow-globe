# Cortex Globe Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a full-viewport, immersive 3D globe data explorer using React Three Fiber that displays Snowflake POS data for 30 cities with zoom-to-city detail cards and a toggle summary panel.

**Architecture:** Next.js app with R3F Canvas filling the viewport. Backend API routes copied from snowglobe (Snowflake JWT auth, city KPIs, trends, Cortex AI narratives). Frontend is entirely new: declarative R3F globe with postprocessing (bloom, vignette), drei Html overlays for city cards, Framer Motion for the summary panel. Zustand for state.

**Tech Stack:** Next.js 16, React 19, React Three Fiber, @react-three/drei, @react-three/postprocessing, Three.js, Zustand, Framer Motion, Tailwind CSS 4, Snowflake SDK

---

## Task 1: Project Scaffold

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `next.config.ts`
- Create: `postcss.config.mjs`
- Create: `src/app/layout.tsx`
- Create: `src/app/globals.css`
- Create: `src/app/page.tsx` (placeholder)
- Copy: `.env.local` from `../snowglobe/.env.local`
- Copy: `.keys/` directory from `../snowglobe/.keys/`
- Create: `.gitignore`

**Step 1: Create package.json**

```json
{
  "name": "cortex-globe",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint"
  },
  "dependencies": {
    "@react-three/drei": "^10.7.7",
    "@react-three/fiber": "^9.5.0",
    "@react-three/postprocessing": "^3.7.3",
    "framer-motion": "^12.35.0",
    "lucide-react": "^0.577.0",
    "next": "16.1.6",
    "react": "19.2.3",
    "react-dom": "19.2.3",
    "snowflake-sdk": "^2.3.4",
    "three": "^0.183.2",
    "zustand": "^5.0.11"
  },
  "devDependencies": {
    "@tailwindcss/postcss": "^4",
    "@types/node": "^20",
    "@types/react": "^19",
    "@types/react-dom": "^19",
    "@types/three": "^0.183.0",
    "eslint": "^9",
    "eslint-config-next": "16.1.6",
    "tailwindcss": "^4",
    "typescript": "^5"
  }
}
```

**Step 2: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./src/*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

**Step 3: Create next.config.ts**

```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ['three'],
};

export default nextConfig;
```

**Step 4: Create postcss.config.mjs**

```javascript
/** @type {import('postcss-load-config').Config} */
const config = {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};

export default config;
```

**Step 5: Create src/app/globals.css**

```css
@import "tailwindcss";

:root {
  --bg-primary: #0a0a1a;
  --accent-cyan: #00eeff;
  --accent-teal: #06b6d4;
  --text-primary: #ffffff;
  --text-secondary: #94a3b8;
  --glass-bg: rgba(15, 23, 42, 0.8);
  --glass-border: rgba(148, 163, 184, 0.1);
}

html, body {
  margin: 0;
  padding: 0;
  overflow: hidden;
  background: var(--bg-primary);
  color: var(--text-primary);
  font-family: 'Inter', system-ui, -apple-system, sans-serif;
}

/* Glassmorphism utility */
.glass {
  background: var(--glass-bg);
  backdrop-filter: blur(20px);
  border: 1px solid var(--glass-border);
}
```

**Step 6: Create src/app/layout.tsx**

```tsx
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Cortex Globe",
  description: "Interactive 3D globe data explorer powered by Snowflake Cortex",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
```

**Step 7: Create src/app/page.tsx (placeholder)**

```tsx
export default function Home() {
  return (
    <main className="w-screen h-screen flex items-center justify-center bg-[#0a0a1a]">
      <h1 className="text-white text-2xl">Cortex Globe</h1>
    </main>
  );
}
```

**Step 8: Copy .env.local and .keys from snowglobe**

```bash
cp ../snowglobe/.env.local .env.local
cp -r ../snowglobe/.keys .keys
```

**Step 9: Create .gitignore**

```
node_modules/
.next/
.env.local
.keys/
```

**Step 10: Install dependencies**

```bash
npm install
```

**Step 11: Verify dev server starts**

```bash
npm run dev
```
Expected: Server starts on localhost:3000, shows "Cortex Globe" placeholder text.

**Step 12: Commit**

```bash
git init
git add -A
git commit -m "feat: scaffold cortex-globe project with Next.js + R3F dependencies"
```

---

## Task 2: Backend — Copy Snowflake Connection & API Routes

**Files:**
- Create: `src/lib/snowflake.ts` (copy from snowglobe)
- Create: `src/lib/cityData.ts` (copy from snowglobe)
- Create: `src/app/api/cities/route.ts` (copy from snowglobe)
- Create: `src/app/api/city/route.ts` (copy from snowglobe)
- Create: `src/app/api/cortex/complete/route.ts` (copy from snowglobe)

**Step 1: Copy src/lib/snowflake.ts**

Copy verbatim from `../snowglobe/src/lib/snowflake.ts`. This file handles:
- Snowflake connection with RSA key-pair JWT auth
- `getConnection()` with connection pooling
- `executeQuery<T>()` helper
- `formatCurrency()` and `formatNumber()` helpers

```bash
mkdir -p src/lib src/app/api/cities src/app/api/city src/app/api/cortex/complete
cp ../snowglobe/src/lib/snowflake.ts src/lib/snowflake.ts
```

**Step 2: Copy src/lib/cityData.ts**

Copy verbatim from `../snowglobe/src/lib/cityData.ts`. Contains:
- 30 cities with lat/lon/revenue data as fallback
- `formatCurrency()` and `formatNumber()` helpers

```bash
cp ../snowglobe/src/lib/cityData.ts src/lib/cityData.ts
```

**Step 3: Copy API routes**

```bash
cp ../snowglobe/src/app/api/cities/route.ts src/app/api/cities/route.ts
cp ../snowglobe/src/app/api/city/route.ts src/app/api/city/route.ts
cp ../snowglobe/src/app/api/cortex/complete/route.ts src/app/api/cortex/complete/route.ts
```

**Step 4: Verify API works**

```bash
npm run dev
# In another terminal:
curl http://localhost:3000/api/cities
```
Expected: JSON response with `{ cities: [...] }` array of 30 cities. If Snowflake connection fails, the error will be logged and a 500 returned — check that the .env.local and .keys are correct.

**Step 5: Commit**

```bash
git add src/lib/ src/app/api/
git commit -m "feat: add Snowflake connection and API routes (cities, city detail, cortex complete)"
```

---

## Task 3: Zustand Store

**Files:**
- Create: `src/lib/store.ts`

**Step 1: Create the store**

Adapted from snowglobe's store — removes copilot/chat state, adds summary panel and camera state:

```typescript
import { create } from 'zustand'

export interface CityData {
  city: string
  country: string
  latitude: number
  longitude: number
  totalSales?: number
  totalOrders?: number
}

export interface CityKPI {
  city: string
  country: string
  totalOrders: number
  totalSales: number
  avgOrderValue: number
  activeTrucks: number
  uniqueItemsSold: number
}

export interface MonthlyTrend {
  month: string
  orders: number
  sales: number
}

export interface TopItem {
  name: string
  quantity: number
  revenue: number
  rank: number
}

interface GlobeStore {
  // City data (loaded on mount)
  cities: CityData[]
  setCities: (cities: CityData[]) => void

  // Selected city
  selectedCity: string | null
  selectedCountry: string | null
  selectCity: (city: string | null, country?: string | null) => void

  // City detail data
  cityKPI: CityKPI | null
  setCityKPI: (kpi: CityKPI | null) => void
  monthlyTrend: MonthlyTrend[]
  setMonthlyTrend: (trend: MonthlyTrend[]) => void
  topItems: TopItem[]
  setTopItems: (items: TopItem[]) => void

  // AI narrative
  narrative: string
  setNarrative: (narrative: string) => void
  narrativeLoading: boolean
  setNarrativeLoading: (loading: boolean) => void

  // UI state
  dataLoading: boolean
  setDataLoading: (loading: boolean) => void
  summaryOpen: boolean
  setSummaryOpen: (open: boolean) => void

  // Camera target (for fly-to animation)
  cameraTarget: { lat: number; lon: number } | null
  setCameraTarget: (target: { lat: number; lon: number } | null) => void
}

export const useGlobeStore = create<GlobeStore>((set) => ({
  cities: [],
  setCities: (cities) => set({ cities }),

  selectedCity: null,
  selectedCountry: null,
  selectCity: (city, country = null) => set({ selectedCity: city, selectedCountry: country }),

  cityKPI: null,
  setCityKPI: (kpi) => set({ cityKPI: kpi }),
  monthlyTrend: [],
  setMonthlyTrend: (trend) => set({ monthlyTrend: trend }),
  topItems: [],
  setTopItems: (items) => set({ topItems: items }),

  narrative: '',
  setNarrative: (narrative) => set({ narrative }),
  narrativeLoading: false,
  setNarrativeLoading: (loading) => set({ narrativeLoading: loading }),

  dataLoading: false,
  setDataLoading: (loading) => set({ dataLoading: loading }),
  summaryOpen: false,
  setSummaryOpen: (open) => set({ summaryOpen: open }),

  cameraTarget: null,
  setCameraTarget: (target) => set({ cameraTarget: target }),
}))
```

**Step 2: Commit**

```bash
git add src/lib/store.ts
git commit -m "feat: add Zustand store for globe state management"
```

---

## Task 4: R3F Globe Component — Earth + Atmosphere + Stars

**Files:**
- Create: `src/components/Globe/Globe.tsx`
- Create: `src/components/Globe/Earth.tsx`
- Create: `src/components/Globe/Atmosphere.tsx`

**Step 1: Create Earth.tsx**

The Earth sphere with NASA texture and bump mapping:

```tsx
'use client'

import { useRef } from 'react'
import { useFrame, useLoader } from '@react-three/fiber'
import * as THREE from 'three'

export function Earth() {
  const meshRef = useRef<THREE.Mesh>(null)

  const [colorMap, bumpMap] = useLoader(THREE.TextureLoader, [
    'https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/planets/earth_atmos_2048.jpg',
    'https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/planets/earth_normal_2048.jpg',
  ])

  return (
    <mesh ref={meshRef}>
      <sphereGeometry args={[1, 64, 64]} />
      <meshPhongMaterial
        map={colorMap}
        bumpMap={bumpMap}
        bumpScale={0.04}
        specular={new THREE.Color(0x3366aa)}
        shininess={20}
      />
    </mesh>
  )
}
```

**Step 2: Create Atmosphere.tsx**

Custom Fresnel glow shader for the atmosphere:

```tsx
'use client'

import { useRef, useMemo } from 'react'
import * as THREE from 'three'
import { shaderMaterial } from '@react-three/drei'
import { extend } from '@react-three/fiber'

const AtmosphereMaterial = shaderMaterial(
  {
    color: new THREE.Color(0x00bbff),
    coefficient: 0.8,
    power: 6.0,
  },
  // Vertex shader
  `
    varying vec3 vNormal;
    varying vec3 vPositionNormal;
    void main() {
      vNormal = normalize(normalMatrix * normal);
      vPositionNormal = normalize((modelViewMatrix * vec4(position, 1.0)).xyz);
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  // Fragment shader
  `
    uniform vec3 color;
    uniform float coefficient;
    uniform float power;
    varying vec3 vNormal;
    varying vec3 vPositionNormal;
    void main() {
      float intensity = pow(coefficient + dot(vPositionNormal, vNormal), power);
      gl_FragColor = vec4(color, intensity);
    }
  `
)

extend({ AtmosphereMaterial })

// Declare for TypeScript
declare module '@react-three/fiber' {
  interface ThreeElements {
    atmosphereMaterial: any
  }
}

export function Atmosphere() {
  return (
    <mesh scale={[1.12, 1.12, 1.12]}>
      <sphereGeometry args={[1, 64, 64]} />
      <atmosphereMaterial
        transparent
        side={THREE.BackSide}
        depthWrite={false}
        color={new THREE.Color(0x00bbff)}
        coefficient={0.8}
        power={6.0}
      />
    </mesh>
  )
}
```

**Step 3: Create Globe.tsx (the R3F Canvas wrapper)**

```tsx
'use client'

import { Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Stars } from '@react-three/drei'
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing'
import { Earth } from './Earth'
import { Atmosphere } from './Atmosphere'

export function Globe() {
  return (
    <Canvas
      camera={{ position: [0, 0, 3.2], fov: 42 }}
      style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh' }}
      gl={{ antialias: true, alpha: false }}
      onCreated={({ gl }) => {
        gl.setClearColor('#0a0a1a')
      }}
    >
      <Suspense fallback={null}>
        {/* Lighting */}
        <ambientLight intensity={0.4} color="#334466" />
        <directionalLight position={[4, 2, 3]} intensity={2.0} color="#fff5e0" />
        <directionalLight position={[-4, -1, -3]} intensity={0.3} color="#2244aa" />

        {/* Stars background */}
        <Stars radius={100} depth={50} count={3000} factor={4} saturation={0} fade speed={1} />

        {/* Globe */}
        <group>
          <Earth />
          <Atmosphere />
        </group>

        {/* Controls */}
        <OrbitControls
          enablePan={false}
          enableZoom={true}
          minDistance={1.8}
          maxDistance={6}
          autoRotate
          autoRotateSpeed={0.5}
          enableDamping
          dampingFactor={0.05}
        />

        {/* Postprocessing */}
        <EffectComposer>
          <Bloom
            luminanceThreshold={0.2}
            luminanceSmoothing={0.9}
            intensity={0.8}
          />
          <Vignette eskil={false} offset={0.1} darkness={0.8} />
        </EffectComposer>
      </Suspense>
    </Canvas>
  )
}
```

**Step 4: Update page.tsx to render the Globe**

```tsx
'use client'

import dynamic from 'next/dynamic'

const Globe = dynamic(
  () => import('@/components/Globe/Globe').then((mod) => ({ default: mod.Globe })),
  { ssr: false }
)

export default function Home() {
  return (
    <main className="w-screen h-screen bg-[#0a0a1a]">
      <Globe />
    </main>
  )
}
```

**Step 5: Verify**

```bash
npm run dev
```
Expected: Full-viewport dark scene with a rotating Earth, atmosphere glow, stars, bloom effect. Can drag to rotate, scroll to zoom.

**Step 6: Commit**

```bash
git add src/components/Globe/ src/app/page.tsx
git commit -m "feat: add R3F globe with Earth texture, atmosphere shader, stars, and postprocessing"
```

---

## Task 5: City Markers on Globe

**Files:**
- Create: `src/components/Globe/CityMarkers.tsx`
- Modify: `src/components/Globe/Globe.tsx` (add CityMarkers to scene)
- Modify: `src/app/page.tsx` (fetch cities on mount)

**Step 1: Create CityMarkers.tsx**

Renders 30 glowing markers on the globe surface, sized by revenue:

```tsx
'use client'

import { useRef, useMemo, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import * as THREE from 'three'
import { useGlobeStore, CityData } from '@/lib/store'

function latLonToVec3(lat: number, lon: number, radius = 1.02): THREE.Vector3 {
  const phi = (90 - lat) * (Math.PI / 180)
  const theta = (lon + 180) * (Math.PI / 180)
  return new THREE.Vector3(
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta)
  )
}

function CityMarker({ city, maxSales }: { city: CityData; maxSales: number }) {
  const meshRef = useRef<THREE.Mesh>(null)
  const [hovered, setHovered] = useState(false)
  const selectCity = useGlobeStore((s) => s.selectCity)
  const setCameraTarget = useGlobeStore((s) => s.setCameraTarget)

  const position = useMemo(
    () => latLonToVec3(city.latitude, city.longitude),
    [city.latitude, city.longitude]
  )

  // Scale marker size by revenue (0.015 to 0.045)
  const scale = useMemo(() => {
    const ratio = (city.totalSales || 0) / maxSales
    return 0.015 + ratio * 0.03
  }, [city.totalSales, maxSales])

  // Pulse animation on hover
  useFrame((_, delta) => {
    if (meshRef.current && hovered) {
      meshRef.current.scale.setScalar(1 + Math.sin(Date.now() * 0.005) * 0.3)
    } else if (meshRef.current) {
      meshRef.current.scale.setScalar(1)
    }
  })

  const handleClick = () => {
    selectCity(city.city, city.country)
    setCameraTarget({ lat: city.latitude, lon: city.longitude })
  }

  return (
    <group position={position}>
      {/* Glow ring */}
      <mesh rotation={[0, 0, 0]} lookAt={[0, 0, 0]}>
        <ringGeometry args={[scale * 2, scale * 3.5, 32]} />
        <meshBasicMaterial
          color="#00eeff"
          transparent
          opacity={hovered ? 0.5 : 0.2}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>

      {/* Core dot */}
      <mesh
        ref={meshRef}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
        onClick={handleClick}
      >
        <sphereGeometry args={[scale, 16, 16]} />
        <meshBasicMaterial color="#00eeff" />
      </mesh>

      {/* Hover tooltip */}
      {hovered && (
        <Html distanceFactor={8} center style={{ pointerEvents: 'none' }}>
          <div className="glass rounded-lg px-3 py-1.5 whitespace-nowrap text-sm font-medium text-white">
            {city.city}
          </div>
        </Html>
      )}
    </group>
  )
}

export function CityMarkers() {
  const cities = useGlobeStore((s) => s.cities)

  const maxSales = useMemo(
    () => Math.max(...cities.map((c) => c.totalSales || 0), 1),
    [cities]
  )

  if (cities.length === 0) return null

  return (
    <group>
      {cities.map((city) => (
        <CityMarker key={`${city.city}-${city.country}`} city={city} maxSales={maxSales} />
      ))}
    </group>
  )
}
```

**Step 2: Add CityMarkers to Globe.tsx**

Import and add `<CityMarkers />` inside the `<group>` with Earth and Atmosphere.

**Step 3: Update page.tsx to fetch cities on mount**

```tsx
'use client'

import { useEffect } from 'react'
import dynamic from 'next/dynamic'
import { useGlobeStore } from '@/lib/store'
import { CITIES } from '@/lib/cityData'

const Globe = dynamic(
  () => import('@/components/Globe/Globe').then((mod) => ({ default: mod.Globe })),
  { ssr: false }
)

export default function Home() {
  const setCities = useGlobeStore((s) => s.setCities)

  useEffect(() => {
    async function fetchCities() {
      try {
        const res = await fetch('/api/cities')
        const data = await res.json()
        if (data.cities) setCities(data.cities)
      } catch {
        // Fallback to static data
        setCities(CITIES.map((c) => ({
          city: c.city,
          country: c.country,
          latitude: c.latitude,
          longitude: c.longitude,
          totalSales: c.totalSales,
          totalOrders: c.totalOrders,
        })))
      }
    }
    fetchCities()
  }, [setCities])

  return (
    <main className="w-screen h-screen bg-[#0a0a1a]">
      <Globe />
    </main>
  )
}
```

**Step 4: Verify**

```bash
npm run dev
```
Expected: 30 glowing cyan markers on the globe. Hover shows city name tooltip. Markers sized by revenue. Click doesn't do much yet (next task).

**Step 5: Commit**

```bash
git add src/components/Globe/CityMarkers.tsx src/components/Globe/Globe.tsx src/app/page.tsx
git commit -m "feat: add city markers on globe with hover tooltips and revenue-based sizing"
```

---

## Task 6: Camera Fly-To Animation on City Click

**Files:**
- Create: `src/components/Globe/CameraController.tsx`
- Modify: `src/components/Globe/Globe.tsx` (add CameraController, pass OrbitControls ref)

**Step 1: Create CameraController.tsx**

Smoothly animates the camera to focus on a clicked city:

```tsx
'use client'

import { useRef, useEffect } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { useGlobeStore } from '@/lib/store'

function latLonToPosition(lat: number, lon: number, distance: number): THREE.Vector3 {
  const phi = (90 - lat) * (Math.PI / 180)
  const theta = (lon + 180) * (Math.PI / 180)
  return new THREE.Vector3(
    -distance * Math.sin(phi) * Math.cos(theta),
    distance * Math.cos(phi),
    distance * Math.sin(phi) * Math.sin(theta)
  )
}

export function CameraController({ controlsRef }: { controlsRef: React.RefObject<any> }) {
  const { camera } = useThree()
  const cameraTarget = useGlobeStore((s) => s.cameraTarget)
  const selectedCity = useGlobeStore((s) => s.selectedCity)

  const targetPosition = useRef<THREE.Vector3 | null>(null)
  const isAnimating = useRef(false)
  const defaultPosition = useRef(new THREE.Vector3(0, 0, 3.2))

  useEffect(() => {
    if (cameraTarget) {
      // Fly to city — position camera at distance 2.2 looking at the city's location on globe
      targetPosition.current = latLonToPosition(cameraTarget.lat, cameraTarget.lon, 2.2)
      isAnimating.current = true
      // Disable auto-rotate during animation
      if (controlsRef.current) {
        controlsRef.current.autoRotate = false
      }
    } else if (!selectedCity) {
      // Fly back to default
      targetPosition.current = defaultPosition.current.clone()
      isAnimating.current = true
      if (controlsRef.current) {
        controlsRef.current.autoRotate = true
      }
    }
  }, [cameraTarget, selectedCity, controlsRef])

  useFrame(() => {
    if (!isAnimating.current || !targetPosition.current) return

    camera.position.lerp(targetPosition.current, 0.04)
    camera.lookAt(0, 0, 0)

    if (controlsRef.current) {
      controlsRef.current.target.set(0, 0, 0)
    }

    const distance = camera.position.distanceTo(targetPosition.current)
    if (distance < 0.01) {
      isAnimating.current = false
    }
  })

  return null
}
```

**Step 2: Update Globe.tsx to use CameraController**

Replace the inline `<OrbitControls>` with a ref-based approach so CameraController can disable auto-rotate:

```tsx
// Add to Globe.tsx:
import { useRef } from 'react'
import { CameraController } from './CameraController'

// Inside the Canvas, replace OrbitControls with:
const controlsRef = useRef(null)

// In JSX:
<OrbitControls
  ref={controlsRef}
  enablePan={false}
  enableZoom={true}
  minDistance={1.8}
  maxDistance={6}
  autoRotate
  autoRotateSpeed={0.5}
  enableDamping
  dampingFactor={0.05}
/>
<CameraController controlsRef={controlsRef} />
```

Note: The `controlsRef` needs to be passed from within the Canvas. Create a wrapper component inside Canvas for this.

**Step 3: Verify**

Click a city marker → camera smoothly flies to it. Click empty space or zoom out → camera returns.

**Step 4: Commit**

```bash
git add src/components/Globe/CameraController.tsx src/components/Globe/Globe.tsx
git commit -m "feat: add smooth camera fly-to animation on city click"
```

---

## Task 7: City Detail Card (Floating HTML Overlay)

**Files:**
- Create: `src/components/CityCard/CityCard.tsx`
- Create: `src/components/CityCard/Sparkline.tsx`
- Modify: `src/components/Globe/Globe.tsx` (add CityCard overlay)
- Modify: `src/app/page.tsx` (add city data fetching logic)

**Step 1: Create city data fetching hook**

Add to `src/app/page.tsx` — when a city is selected, fetch its data:

```tsx
// Add to page.tsx useEffect or create a custom hook:
const selectedCity = useGlobeStore((s) => s.selectedCity)
const selectedCountry = useGlobeStore((s) => s.selectedCountry)
const setDataLoading = useGlobeStore((s) => s.setDataLoading)
const setCityKPI = useGlobeStore((s) => s.setCityKPI)
const setMonthlyTrend = useGlobeStore((s) => s.setMonthlyTrend)
const setTopItems = useGlobeStore((s) => s.setTopItems)
const setNarrative = useGlobeStore((s) => s.setNarrative)
const setNarrativeLoading = useGlobeStore((s) => s.setNarrativeLoading)

useEffect(() => {
  if (!selectedCity) return

  setDataLoading(true)
  setNarrative('')
  setNarrativeLoading(true)

  // Fetch city KPIs, trend, top items
  fetch(`/api/city?name=${encodeURIComponent(selectedCity)}&country=${encodeURIComponent(selectedCountry || '')}`)
    .then((r) => r.json())
    .then((data) => {
      if (data.kpi) setCityKPI(data.kpi)
      if (data.trend) setMonthlyTrend(data.trend)
      if (data.topItems) setTopItems(data.topItems)
    })
    .catch(console.error)
    .finally(() => setDataLoading(false))

  // Fetch AI narrative (separate, slower)
  fetch('/api/cortex/complete', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ city: selectedCity, country: selectedCountry }),
  })
    .then((r) => r.json())
    .then((data) => setNarrative(data.narrative || ''))
    .catch(() => setNarrative('Unable to generate AI insight.'))
    .finally(() => setNarrativeLoading(false))
}, [selectedCity, selectedCountry])
```

**Step 2: Create Sparkline.tsx**

Compact SVG sparkline for the city card (adapted from snowglobe):

```tsx
'use client'

import { useMemo } from 'react'
import { MonthlyTrend } from '@/lib/store'

export function Sparkline({ data }: { data: MonthlyTrend[] }) {
  const { path, areaPath } = useMemo(() => {
    if (data.length === 0) return { path: '', areaPath: '' }

    const sorted = [...data].sort((a, b) =>
      new Date(a.month).getTime() - new Date(b.month).getTime()
    )
    const sales = sorted.map((d) => d.sales)
    const max = Math.max(...sales)
    const min = Math.min(...sales)
    const range = max - min || 1

    const w = 260, h = 50, pad = 4

    const points = sorted.map((d, i) => ({
      x: pad + (i * (w - 2 * pad)) / (sorted.length - 1 || 1),
      y: h - pad - ((d.sales - min) / range) * (h - 2 * pad),
    }))

    const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
    const area = `${linePath} L ${points[points.length - 1].x} ${h} L ${points[0].x} ${h} Z`

    return { path: linePath, areaPath: area }
  }, [data])

  if (data.length === 0) return null

  return (
    <svg viewBox="0 0 260 50" className="w-full h-12">
      <defs>
        <linearGradient id="sparkGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#06b6d4" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill="url(#sparkGrad)" />
      <path d={path} fill="none" stroke="#06b6d4" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}
```

**Step 3: Create CityCard.tsx**

Glassmorphism card that appears as an HTML overlay when a city is selected:

```tsx
'use client'

import { useGlobeStore } from '@/lib/store'
import { formatCurrency, formatNumber } from '@/lib/cityData'
import { Sparkline } from './Sparkline'
import { X, DollarSign, ShoppingCart, TrendingUp, Truck } from 'lucide-react'

export function CityCard() {
  const selectedCity = useGlobeStore((s) => s.selectedCity)
  const cityKPI = useGlobeStore((s) => s.cityKPI)
  const monthlyTrend = useGlobeStore((s) => s.monthlyTrend)
  const topItems = useGlobeStore((s) => s.topItems)
  const narrative = useGlobeStore((s) => s.narrative)
  const narrativeLoading = useGlobeStore((s) => s.narrativeLoading)
  const dataLoading = useGlobeStore((s) => s.dataLoading)
  const selectCity = useGlobeStore((s) => s.selectCity)
  const setCameraTarget = useGlobeStore((s) => s.setCameraTarget)

  if (!selectedCity) return null

  const handleClose = () => {
    selectCity(null)
    setCameraTarget(null)
  }

  return (
    <div className="fixed top-1/2 right-8 -translate-y-1/2 z-20 w-[320px] max-h-[80vh] overflow-y-auto glass rounded-2xl p-5 animate-in fade-in slide-in-from-right-4 duration-300">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-white">{selectedCity}</h2>
          {cityKPI && (
            <p className="text-xs text-slate-400">{cityKPI.country}</p>
          )}
        </div>
        <button onClick={handleClose} className="p-1 hover:bg-white/10 rounded-lg transition">
          <X className="w-4 h-4 text-slate-400" />
        </button>
      </div>

      {dataLoading ? (
        <div className="flex items-center justify-center py-8">
          <div className="w-6 h-6 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : cityKPI ? (
        <>
          {/* KPI Grid */}
          <div className="grid grid-cols-2 gap-2 mb-4">
            <KPICard icon={<DollarSign className="w-3.5 h-3.5" />} label="Revenue" value={formatCurrency(cityKPI.totalSales)} />
            <KPICard icon={<ShoppingCart className="w-3.5 h-3.5" />} label="Orders" value={formatNumber(cityKPI.totalOrders)} />
            <KPICard icon={<TrendingUp className="w-3.5 h-3.5" />} label="Avg Order" value={formatCurrency(cityKPI.avgOrderValue)} />
            <KPICard icon={<Truck className="w-3.5 h-3.5" />} label="Trucks" value={String(cityKPI.activeTrucks)} />
          </div>

          {/* Sparkline */}
          {monthlyTrend.length > 0 && (
            <div className="mb-4">
              <p className="text-xs text-slate-400 mb-1">Monthly Sales Trend</p>
              <Sparkline data={monthlyTrend} />
            </div>
          )}

          {/* Top Items */}
          {topItems.length > 0 && (
            <div className="mb-4">
              <p className="text-xs text-slate-400 mb-2">Top Items</p>
              <div className="space-y-1.5">
                {topItems.slice(0, 3).map((item) => (
                  <div key={item.rank} className="flex items-center gap-2">
                    <span className="text-xs text-cyan-400 font-mono w-4">#{item.rank}</span>
                    <span className="text-xs text-white truncate flex-1">{item.name}</span>
                    <span className="text-xs text-slate-400">{formatCurrency(item.revenue)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* AI Narrative */}
          <div className="border-t border-white/10 pt-3">
            <p className="text-xs text-slate-400 mb-1">AI Insight</p>
            {narrativeLoading ? (
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <div className="w-3 h-3 border border-cyan-400 border-t-transparent rounded-full animate-spin" />
                Generating insight...
              </div>
            ) : (
              <p className="text-xs text-slate-300 leading-relaxed">{narrative}</p>
            )}
          </div>
        </>
      ) : null}
    </div>
  )
}

function KPICard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="bg-white/5 rounded-lg p-2.5">
      <div className="flex items-center gap-1.5 text-cyan-400 mb-1">
        {icon}
        <span className="text-[10px] uppercase tracking-wider text-slate-400">{label}</span>
      </div>
      <p className="text-sm font-semibold text-white">{value}</p>
    </div>
  )
}
```

**Step 4: Add CityCard to page.tsx**

```tsx
import { CityCard } from '@/components/CityCard/CityCard'

// In the return JSX, after <Globe />:
<CityCard />
```

**Step 5: Verify**

Click a city marker → camera flies to it → city card appears on the right with KPIs, sparkline, top items, and AI narrative loading.

**Step 6: Commit**

```bash
git add src/components/CityCard/ src/app/page.tsx
git commit -m "feat: add city detail card with KPIs, sparkline, top items, and AI narrative"
```

---

## Task 8: Summary Panel (Toggle)

**Files:**
- Create: `src/components/SummaryPanel/SummaryPanel.tsx`
- Modify: `src/app/page.tsx` (add summary panel + toggle button)

**Step 1: Create SummaryPanel.tsx**

```tsx
'use client'

import { useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useGlobeStore } from '@/lib/store'
import { formatCurrency, formatNumber } from '@/lib/cityData'
import { X, Globe, ShoppingCart, TrendingUp } from 'lucide-react'

export function SummaryPanel() {
  const summaryOpen = useGlobeStore((s) => s.summaryOpen)
  const setSummaryOpen = useGlobeStore((s) => s.setSummaryOpen)
  const cities = useGlobeStore((s) => s.cities)

  const stats = useMemo(() => {
    const totalRevenue = cities.reduce((sum, c) => sum + (c.totalSales || 0), 0)
    const totalOrders = cities.reduce((sum, c) => sum + (c.totalOrders || 0), 0)
    const sorted = [...cities].sort((a, b) => (b.totalSales || 0) - (a.totalSales || 0))
    return { totalRevenue, totalOrders, topCities: sorted.slice(0, 10) }
  }, [cities])

  const maxCitySales = stats.topCities[0]?.totalSales || 1

  return (
    <AnimatePresence>
      {summaryOpen && (
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="fixed top-0 right-0 h-full w-[400px] z-30 glass border-l border-white/10 overflow-y-auto"
        >
          <div className="p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-white">Portfolio Summary</h2>
              <button onClick={() => setSummaryOpen(false)} className="p-1 hover:bg-white/10 rounded-lg transition">
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>

            {/* Aggregate Stats */}
            <div className="grid grid-cols-2 gap-3 mb-6">
              <div className="bg-white/5 rounded-xl p-4">
                <div className="flex items-center gap-2 text-cyan-400 mb-2">
                  <TrendingUp className="w-4 h-4" />
                  <span className="text-xs uppercase tracking-wider text-slate-400">Total Revenue</span>
                </div>
                <p className="text-xl font-bold text-white">{formatCurrency(stats.totalRevenue)}</p>
              </div>
              <div className="bg-white/5 rounded-xl p-4">
                <div className="flex items-center gap-2 text-cyan-400 mb-2">
                  <ShoppingCart className="w-4 h-4" />
                  <span className="text-xs uppercase tracking-wider text-slate-400">Total Orders</span>
                </div>
                <p className="text-xl font-bold text-white">{formatNumber(stats.totalOrders)}</p>
              </div>
            </div>

            {/* Global Stats */}
            <div className="flex items-center gap-4 mb-6 text-sm text-slate-400">
              <div className="flex items-center gap-1.5">
                <Globe className="w-4 h-4 text-cyan-400" />
                <span>{cities.length} cities</span>
              </div>
              <span>15 countries</span>
              <span>2021–2022</span>
            </div>

            {/* Top 10 Cities */}
            <div className="mb-6">
              <h3 className="text-sm font-medium text-white mb-3">Top 10 Cities by Revenue</h3>
              <div className="space-y-2">
                {stats.topCities.map((city, i) => (
                  <div key={`${city.city}-${city.country}`} className="flex items-center gap-3">
                    <span className="text-xs text-slate-500 font-mono w-5">{i + 1}</span>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-xs text-white">{city.city}</span>
                        <span className="text-xs text-slate-400">{formatCurrency(city.totalSales || 0)}</span>
                      </div>
                      <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-cyan-400 to-teal-400 rounded-full"
                          style={{ width: `${((city.totalSales || 0) / maxCitySales) * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
```

**Step 2: Add toggle button and SummaryPanel to page.tsx**

```tsx
import { SummaryPanel } from '@/components/SummaryPanel/SummaryPanel'
import { BarChart3 } from 'lucide-react'

// In the JSX, add:
{/* Summary toggle button */}
<button
  onClick={() => useGlobeStore.getState().setSummaryOpen(!useGlobeStore.getState().summaryOpen)}
  className="fixed top-6 right-6 z-20 glass rounded-xl px-4 py-2.5 flex items-center gap-2 hover:bg-white/10 transition"
>
  <BarChart3 className="w-4 h-4 text-cyan-400" />
  <span className="text-sm text-white">Summary</span>
</button>

<SummaryPanel />
```

**Step 3: Verify**

Click "Summary" button → panel slides in from right with aggregate stats and top 10 city list.

**Step 4: Commit**

```bash
git add src/components/SummaryPanel/ src/app/page.tsx
git commit -m "feat: add toggle summary panel with portfolio stats and top cities ranking"
```

---

## Task 9: UI Overlay — Title Badge & Status

**Files:**
- Modify: `src/app/page.tsx` (add title badge top-left)

**Step 1: Add minimal top-left badge**

```tsx
{/* Top-left badge */}
<div className="fixed top-6 left-6 z-20 glass rounded-xl px-4 py-2.5">
  <h1 className="text-sm font-semibold text-white">Cortex Globe</h1>
  <div className="flex items-center gap-1.5 mt-0.5">
    <div className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-pulse" />
    <span className="text-[10px] text-slate-400 uppercase tracking-wider">Snowflake Connected</span>
  </div>
</div>
```

**Step 2: Verify**

Title badge appears top-left with a pulsing status indicator.

**Step 3: Commit**

```bash
git add src/app/page.tsx
git commit -m "feat: add title badge and connection status overlay"
```

---

## Task 10: Polish & Responsiveness

**Files:**
- Modify: `src/app/globals.css` (add animation utilities)
- Modify: `src/components/Globe/CityMarkers.tsx` (fix lookAt for markers so they face outward)
- Modify: various files for edge cases

**Step 1: Add CSS animations to globals.css**

```css
@keyframes fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes slide-in-from-right {
  from { transform: translateX(1rem); opacity: 0; }
  to { transform: translateX(0); opacity: 1; }
}

.animate-in {
  animation: fade-in 0.3s ease-out, slide-in-from-right 0.3s ease-out;
}
```

**Step 2: Fix marker lookAt**

Each marker's ring geometry needs to face outward from the globe center. Ensure the ring mesh `lookAt(0,0,0)` is applied correctly via a `useEffect` or by computing the quaternion from the position normal.

**Step 3: Test edge cases**

- Click city → close card → verify camera returns to default
- Toggle summary while city card is open → both should coexist
- Zoom in close → markers should still be clickable
- Zoom out far → markers should be visible

**Step 4: Verify full flow end-to-end**

```bash
npm run dev
```

1. Globe loads with stars and atmosphere ✓
2. 30 city markers visible ✓
3. Hover marker shows tooltip ✓
4. Click marker → camera flies to city → detail card appears ✓
5. Card shows KPIs, sparkline, top items, AI narrative ✓
6. Close card → camera returns ✓
7. Summary button → panel slides in ✓
8. Panel shows aggregate stats and top 10 ✓

**Step 5: Commit**

```bash
git add -A
git commit -m "feat: polish animations, fix marker orientation, handle edge cases"
```

---

## Task 11: Build Verification

**Step 1: Run production build**

```bash
npm run build
```
Expected: Build succeeds with no errors.

**Step 2: Fix any build errors**

Common issues:
- Missing `'use client'` directives on components using hooks
- TypeScript errors with R3F types
- Dynamic import needed for Canvas components (no SSR)

**Step 3: Test production build**

```bash
npm run start
```
Expected: App loads correctly in production mode.

**Step 4: Final commit**

```bash
git add -A
git commit -m "chore: fix build issues and verify production build"
```
