# Real-Time POS Streaming Demo Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a standalone Kitakata Ramen POS UI at `/pos` that submits orders through the Snowflake pipeline, with the globe showing real-time pop animations for new orders.

**Architecture:** POS UI submits orders via `POST /api/pos/order` → API route inserts into `RAW.ORDER_HEADER` + `RAW.ORDER_DETAIL` via SQL INSERT (swap to Java Snowpipe Streaming SDK later) → Dynamic Table refreshes (5s target lag) → Globe polls `/api/orders/recent` every 5s → toast + marker pulse on new orders.

**Tech Stack:** Next.js 16, React 19, Tailwind CSS 4, Zustand, snowflake-sdk, Three.js/R3F (existing), Framer Motion (existing)

---

## Verified Schema Reference (from actual Snowflake queries)

### ORDER_HEADER (RAW schema)
| Column | Type | Notes |
|--------|------|-------|
| ORDER_ID | NUMBER(38,0) | PK. Max existing: 459,520,440 |
| TRUCK_ID | NUMBER(38,0) | FK → TRUCK.TRUCK_ID |
| LOCATION_ID | NUMBER(38,0) | Values range 1000-15000 |
| CUSTOMER_ID | NUMBER(38,0) | Nullable, not used in DT |
| DISCOUNT_ID | TEXT | Nullable |
| SHIFT_ID | NUMBER(38,0) | Nullable |
| SHIFT_START_TIME | TIME | Nullable |
| SHIFT_END_TIME | TIME | Nullable |
| ORDER_CHANNEL | TEXT | Nullable |
| ORDER_TS | TIMESTAMP_NTZ | **Required** — DT clustering key |
| SERVED_TS | TEXT | Nullable |
| ORDER_CURRENCY | TEXT | Nullable (e.g., "USD") |
| ORDER_AMOUNT | NUMBER(38,4) | Sum of line items before tax |
| ORDER_TAX_AMOUNT | **TEXT** | Nullable. DT casts via TRY_TO_NUMBER. Real data is all NULL |
| ORDER_DISCOUNT_AMOUNT | **TEXT** | Nullable. DT casts via TRY_TO_NUMBER. Real data is all NULL |
| ORDER_TOTAL | NUMBER(38,4) | Final total |

### ORDER_DETAIL (RAW schema)
| Column | Type | Notes |
|--------|------|-------|
| ORDER_DETAIL_ID | NUMBER(38,0) | PK. Max existing: 904,745,310 |
| ORDER_ID | NUMBER(38,0) | FK → ORDER_HEADER.ORDER_ID |
| MENU_ITEM_ID | NUMBER(38,0) | FK → MENU (composite with MENU_TYPE_ID from TRUCK) |
| DISCOUNT_ID | TEXT | Nullable |
| LINE_NUMBER | NUMBER(38,0) | **Starts at 0**, not 1 |
| QUANTITY | NUMBER(5,0) | |
| UNIT_PRICE | NUMBER(38,4) | |
| PRICE | NUMBER(38,4) | = UNIT_PRICE * QUANTITY |
| ORDER_ITEM_DISCOUNT_AMOUNT | TEXT | Nullable |

### POS_FLATTENED_DT (HARMONIZED schema) — deployed columns
ORDER_ID, TRUCK_ID, ORDER_TS, ORDER_TS_DATE, **ORDER_YEAR**, **ORDER_MONTH**, ORDER_DETAIL_ID, LINE_NUMBER, TRUCK_BRAND_NAME, MENU_TYPE, PRIMARY_CITY, REGION, COUNTRY, FRANCHISE_FLAG, FRANCHISE_ID, FRANCHISEE_NAME, LOCATION_ID, MENU_ITEM_ID, MENU_ITEM_NAME, QUANTITY, UNIT_PRICE, PRICE, ORDER_AMOUNT, ORDER_TAX_AMOUNT, ORDER_DISCOUNT_AMOUNT, ORDER_TOTAL

> Note: Deployed DT has ORDER_YEAR and ORDER_MONTH columns not in CDC.sql. The DT join denormalizes TRUCK (city, country, region, franchise), MENU (brand, type, item name), and FRANCHISE (name) automatically on refresh.

### Kitakata Ramen Bar — Reference Data
**MENU_TYPE_ID = 5** for all Kitakata trucks.

**30 trucks** (one per city):
| TRUCK_ID | City | Country |
|----------|------|---------|
| 5 | San Mateo | United States |
| 20 | Denver | United States |
| 35 | Seattle | United States |
| 50 | Boston | United States |
| 65 | New York City | United States |
| 80 | Toronto | Canada |
| 95 | Vancouver | Canada |
| 110 | Montreal | Canada |
| 125 | London | England |
| 140 | Manchester | England |
| 155 | Paris | France |
| 170 | Nice | France |
| 185 | Warsaw | Poland |
| 200 | Krakow | Poland |
| 215 | Mumbai | India |
| 230 | Delhi | India |
| 245 | Tokyo | Japan |
| 260 | Seoul | South Korea |
| 275 | Sydney | Australia |
| 290 | Melbourne | Australia |
| 305 | Sao Paulo | Brazil |
| 320 | Rio de Janeiro | Brazil |
| 335 | Munich | Germany |
| 350 | Berlin | Germany |
| 365 | Hamburg | Germany |
| 380 | Stockholm | Sweden |
| 395 | Madrid | Spain |
| 410 | Barcelona | Spain |
| 425 | Cairo | Egypt |
| 440 | Cape Town | South Africa |

**6 menu items** (all MENU_TYPE_ID = 5):
| MENU_ITEM_ID | Name | Price |
|-------------|------|-------|
| 51 | Creamy Chicken Ramen | $17.25 |
| 52 | Spicy Miso Vegetable Ramen | $17.25 |
| 53 | Tonkotsu Ramen | $17.25 |
| 54 | Bottled Water | $2.00 |
| 55 | Bottled Soda | $3.00 |
| 56 | Ice Tea | $3.00 |

### Composite Join Key (critical)
The DT joins MENU on: `od.MENU_ITEM_ID = m.MENU_ITEM_ID AND t.MENU_TYPE_ID = m.MENU_TYPE_ID`
Since all Kitakata trucks have `MENU_TYPE_ID = 5` and all 6 menu items have `MENU_TYPE_ID = 5`, any combination works.

---

## SQL Setup (run manually in Snowflake before starting)

```sql
USE DATABASE TAKEHOME_DB;
USE SCHEMA RAW;

-- Sequences for POS-generated IDs (above all existing data)
CREATE OR REPLACE SEQUENCE ORDER_ID_SEQ START = 1000000000 INCREMENT = 1;
CREATE OR REPLACE SEQUENCE ORDER_DETAIL_ID_SEQ START = 1000000000 INCREMENT = 1;

-- Reduce DT target lag to 5 seconds for real-time demo
ALTER DYNAMIC TABLE HARMONIZED.POS_FLATTENED_DT SET TARGET_LAG = '5 seconds';
```

---

## Task 1: API Route — POS Config (Trucks + Menu)

**Files:**
- Create: `src/app/api/pos/config/route.ts`

**Step 1: Write the API route**

```typescript
// src/app/api/pos/config/route.ts
import { NextResponse } from 'next/server'
import { executeQuery } from '@/lib/snowflake'

interface TruckRow {
  TRUCK_ID: number
  PRIMARY_CITY: string
  COUNTRY: string
  FRANCHISE_ID: number
}

interface MenuItemRow {
  MENU_ITEM_ID: number
  MENU_ITEM_NAME: string
  SALE_PRICE_USD: number
}

export async function GET() {
  try {
    const trucks = await executeQuery<TruckRow>(`
      SELECT DISTINCT t.TRUCK_ID, t.PRIMARY_CITY, t.COUNTRY, t.FRANCHISE_ID
      FROM RAW.TRUCK t
      WHERE t.MENU_TYPE_ID = 5
      ORDER BY t.PRIMARY_CITY
    `)

    const menuItems = await executeQuery<MenuItemRow>(`
      SELECT DISTINCT MENU_ITEM_ID, MENU_ITEM_NAME, SALE_PRICE_USD
      FROM RAW.MENU
      WHERE MENU_TYPE_ID = 5 AND TRUCK_BRAND_NAME = 'Kitakata Ramen Bar'
      ORDER BY SALE_PRICE_USD DESC, MENU_ITEM_NAME
    `)

    return NextResponse.json({ trucks, menuItems })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
```

**Step 2: Test manually**

Run: `curl http://localhost:3000/api/pos/config | jq .`
Expected: 30 trucks, 6 menu items with correct prices.

**Step 3: Commit**

```bash
git add src/app/api/pos/config/route.ts
git commit -m "feat: add POS config API for Kitakata Ramen trucks and menu"
```

---

## Task 2: API Route — Submit Order

**Files:**
- Create: `src/app/api/pos/order/route.ts`

**Step 1: Write the API route**

```typescript
// src/app/api/pos/order/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { executeQuery } from '@/lib/snowflake'

interface OrderItem {
  menuItemId: number
  quantity: number
  unitPrice: number
}

interface OrderPayload {
  truckId: number
  items: OrderItem[]
}

export async function POST(request: NextRequest) {
  try {
    const body: OrderPayload = await request.json()
    const { truckId, items } = body

    if (!truckId || !items || items.length === 0) {
      return NextResponse.json({ error: 'Missing truckId or items' }, { status: 400 })
    }

    // Get next ORDER_ID from sequence
    const [{ NEXTVAL: orderId }] = await executeQuery<{ NEXTVAL: number }>(
      `SELECT RAW.ORDER_ID_SEQ.NEXTVAL AS NEXTVAL`
    )

    // Calculate totals (matching existing data patterns)
    const orderAmount = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0)
    // Real data has NULL tax/discount — match that pattern
    const orderTotal = orderAmount

    // Get a valid LOCATION_ID for this truck
    const locations = await executeQuery<{ LOCATION_ID: number }>(
      `SELECT LOCATION_ID FROM RAW.ORDER_HEADER WHERE TRUCK_ID = ? LIMIT 1`,
      [truckId]
    )
    const locationId = locations.length > 0 ? locations[0].LOCATION_ID : 1

    // INSERT ORDER_HEADER
    // ORDER_TAX_AMOUNT and ORDER_DISCOUNT_AMOUNT are TEXT columns, NULL in real data
    await executeQuery(
      `INSERT INTO RAW.ORDER_HEADER (
        ORDER_ID, TRUCK_ID, LOCATION_ID, ORDER_TS,
        ORDER_AMOUNT, ORDER_TAX_AMOUNT, ORDER_DISCOUNT_AMOUNT, ORDER_TOTAL
      ) SELECT ?, ?, ?, CURRENT_TIMESTAMP(), ?, NULL, NULL, ?`,
      [orderId, truckId, locationId, orderAmount, orderTotal]
    )

    // INSERT ORDER_DETAIL rows (LINE_NUMBER starts at 0)
    for (let i = 0; i < items.length; i++) {
      const item = items[i]
      const [{ NEXTVAL: detailId }] = await executeQuery<{ NEXTVAL: number }>(
        `SELECT RAW.ORDER_DETAIL_ID_SEQ.NEXTVAL AS NEXTVAL`
      )
      const linePrice = item.unitPrice * item.quantity

      await executeQuery(
        `INSERT INTO RAW.ORDER_DETAIL (
          ORDER_DETAIL_ID, ORDER_ID, MENU_ITEM_ID, LINE_NUMBER,
          QUANTITY, UNIT_PRICE, PRICE
        ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [detailId, orderId, item.menuItemId, i, item.quantity, item.unitPrice, linePrice]
      )
    }

    return NextResponse.json({
      success: true,
      orderId,
      orderTotal,
      itemCount: items.length,
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('Order submission error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
```

**Step 2: Test manually** (use real truck/menu IDs)

```bash
curl -X POST http://localhost:3000/api/pos/order \
  -H "Content-Type: application/json" \
  -d '{"truckId": 65, "items": [{"menuItemId": 53, "quantity": 2, "unitPrice": 17.25}]}'
```

Expected: `{"success": true, "orderId": 1000000001, "orderTotal": 34.5, "itemCount": 1}`

Then verify in Snowflake:
```sql
SELECT * FROM RAW.ORDER_HEADER WHERE ORDER_ID >= 1000000000;
SELECT * FROM RAW.ORDER_DETAIL WHERE ORDER_ID >= 1000000000;
```

**Step 3: Commit**

```bash
git add src/app/api/pos/order/route.ts
git commit -m "feat: add POS order submission API with SQL INSERT into RAW tables"
```

---

## Task 3: API Route — Recent Orders (Globe polling endpoint)

**Files:**
- Create: `src/app/api/orders/recent/route.ts`

**Step 1: Write the API route**

```typescript
// src/app/api/orders/recent/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { executeQuery } from '@/lib/snowflake'

interface RecentOrderRow {
  ORDER_ID: number
  ORDER_TS: string
  PRIMARY_CITY: string
  COUNTRY: string
  MENU_ITEM_NAME: string
  TRUCK_BRAND_NAME: string
  QUANTITY: number
  PRICE: number
  ORDER_TOTAL: number
}

export async function GET(request: NextRequest) {
  const since = request.nextUrl.searchParams.get('since')

  try {
    // Query the Dynamic Table for POS-submitted orders (ID >= 1B)
    // If 'since' provided, only get newer orders; otherwise last 30 seconds
    const rows = await executeQuery<RecentOrderRow>(
      since
        ? `SELECT DISTINCT
            ORDER_ID, ORDER_TS, PRIMARY_CITY, COUNTRY,
            MENU_ITEM_NAME, TRUCK_BRAND_NAME, QUANTITY, PRICE, ORDER_TOTAL
          FROM HARMONIZED.POS_FLATTENED_DT
          WHERE ORDER_ID >= 1000000000
            AND ORDER_TS > ?
          ORDER BY ORDER_TS DESC
          LIMIT 50`
        : `SELECT DISTINCT
            ORDER_ID, ORDER_TS, PRIMARY_CITY, COUNTRY,
            MENU_ITEM_NAME, TRUCK_BRAND_NAME, QUANTITY, PRICE, ORDER_TOTAL
          FROM HARMONIZED.POS_FLATTENED_DT
          WHERE ORDER_ID >= 1000000000
            AND ORDER_TS > DATEADD('second', -30, CURRENT_TIMESTAMP())
          ORDER BY ORDER_TS DESC
          LIMIT 50`,
      since ? [since] : undefined
    )

    return NextResponse.json({ orders: rows })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
```

**Step 2: Test** (after submitting a test order and waiting ~5s for DT refresh)

```bash
curl http://localhost:3000/api/orders/recent | jq .
```

Expected: Orders with denormalized TRUCK_BRAND_NAME ("Kitakata Ramen Bar"), PRIMARY_CITY, MENU_ITEM_NAME from the DT.

**Step 3: Commit**

```bash
git add src/app/api/orders/recent/route.ts
git commit -m "feat: add recent orders polling endpoint for globe"
```

---

## Task 4: Zustand Store — Streaming State

**Files:**
- Modify: `src/lib/store.ts`

**Step 1: Add RecentOrder interface** (after `HourPatternRow` interface, ~line 93)

```typescript
export interface RecentOrder {
  orderId: number
  orderTs: string
  city: string
  country: string
  menuItemName: string
  brandName: string
  quantity: number
  price: number
  orderTotal: number
}
```

**Step 2: Add fields to GlobeStore interface** (after `tabInsightLoading` lines)

```typescript
  // Real-time order feed
  recentOrders: RecentOrder[]
  addRecentOrders: (orders: RecentOrder[]) => void
  lastPollTimestamp: string | null
  setLastPollTimestamp: (ts: string) => void
  poppingCities: Set<string>
  addPoppingCity: (city: string) => void
  removePoppingCity: (city: string) => void
```

**Step 3: Add implementations** (after `setTabInsightLoading` in create call)

```typescript
  recentOrders: [],
  addRecentOrders: (orders) => set((s) => ({
    recentOrders: [...orders, ...s.recentOrders].slice(0, 20)
  })),
  lastPollTimestamp: null,
  setLastPollTimestamp: (ts) => set({ lastPollTimestamp: ts }),
  poppingCities: new Set(),
  addPoppingCity: (city) => set((s) => {
    const next = new Set(s.poppingCities)
    next.add(city)
    return { poppingCities: next }
  }),
  removePoppingCity: (city) => set((s) => {
    const next = new Set(s.poppingCities)
    next.delete(city)
    return { poppingCities: next }
  }),
```

**Step 4: Commit**

```bash
git add src/lib/store.ts
git commit -m "feat: add streaming order state to Zustand store"
```

---

## Task 5: Order Feed Poller Hook

**Files:**
- Create: `src/hooks/useOrderFeed.ts`

**Step 1: Write the hook**

```typescript
// src/hooks/useOrderFeed.ts
'use client'

import { useEffect, useRef, useCallback } from 'react'
import { useGlobeStore, RecentOrder } from '@/lib/store'

const POLL_INTERVAL = 5000

export function useOrderFeed() {
  const addRecentOrders = useGlobeStore((s) => s.addRecentOrders)
  const lastPollTimestamp = useGlobeStore((s) => s.lastPollTimestamp)
  const setLastPollTimestamp = useGlobeStore((s) => s.setLastPollTimestamp)
  const addPoppingCity = useGlobeStore((s) => s.addPoppingCity)
  const removePoppingCity = useGlobeStore((s) => s.removePoppingCity)
  const lastPollRef = useRef(lastPollTimestamp)
  lastPollRef.current = lastPollTimestamp

  const poll = useCallback(async () => {
    try {
      const url = lastPollRef.current
        ? `/api/orders/recent?since=${encodeURIComponent(lastPollRef.current)}`
        : '/api/orders/recent'

      const res = await fetch(url)
      if (!res.ok) return
      const data = await res.json()

      if (data.orders && data.orders.length > 0) {
        const orders: RecentOrder[] = data.orders.map((o: Record<string, unknown>) => ({
          orderId: o.ORDER_ID as number,
          orderTs: o.ORDER_TS as string,
          city: o.PRIMARY_CITY as string,
          country: o.COUNTRY as string,
          menuItemName: o.MENU_ITEM_NAME as string,
          brandName: o.TRUCK_BRAND_NAME as string,
          quantity: o.QUANTITY as number,
          price: o.PRICE as number,
          orderTotal: o.ORDER_TOTAL as number,
        }))

        addRecentOrders(orders)
        setLastPollTimestamp(orders[0].orderTs)

        // Trigger pop for each city with new orders
        const cities = [...new Set(orders.map((o) => o.city))]
        cities.forEach((city) => {
          addPoppingCity(city)
          setTimeout(() => removePoppingCity(city), 3000)
        })
      }
    } catch {
      // Silent fail, retries on next interval
    }
  }, [addRecentOrders, setLastPollTimestamp, addPoppingCity, removePoppingCity])

  useEffect(() => {
    const interval = setInterval(poll, POLL_INTERVAL)
    return () => clearInterval(interval)
  }, [poll])
}
```

**Step 2: Commit**

```bash
git add src/hooks/useOrderFeed.ts
git commit -m "feat: add order feed polling hook with 5s interval"
```

---

## Task 6: Globe Pop Animation + Order Toast

**Files:**
- Modify: `src/components/Globe/CityMarkers.tsx`
- Create: `src/components/Globe/OrderToast.tsx`

### 6a: Add pop ring to CityMarkers

**Add `createPopTexture` function** (after `getGlowTexture`, ~line 73):

```typescript
function createPopTexture(size = 128): THREE.Texture {
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!
  const center = size / 2
  const gradient = ctx.createRadialGradient(center, center, center * 0.4, center, center, center)
  gradient.addColorStop(0, 'rgba(0,238,255,0)')
  gradient.addColorStop(0.5, 'rgba(0,238,255,0.6)')
  gradient.addColorStop(0.7, 'rgba(0,238,255,0.2)')
  gradient.addColorStop(1, 'rgba(0,238,255,0)')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, size, size)
  const tex = new THREE.CanvasTexture(canvas)
  tex.needsUpdate = true
  return tex
}

let popTexture: THREE.Texture | null = null
function getPopTexture() {
  if (!popTexture) popTexture = createPopTexture()
  return popTexture
}
```

**Inside CityMarker component**, add after `const isSelected = ...`:

```typescript
const poppingCities = useGlobeStore((s) => s.poppingCities)
const isPopping = poppingCities.has(city.city)
const popRingRef = useRef<THREE.Sprite>(null)
const popStartRef = useRef(0)
```

**Add pop `useFrame` block** (after existing pulse useFrame):

```typescript
useFrame(() => {
  if (popRingRef.current) {
    if (isPopping) {
      if (popStartRef.current === 0) popStartRef.current = Date.now()
      const elapsed = (Date.now() - popStartRef.current) / 1000
      const scale = pinSize * (2 + elapsed * 4)
      const opacity = Math.max(0, 1 - elapsed / 3)
      popRingRef.current.scale.setScalar(scale)
      popRingRef.current.material.opacity = opacity * 0.6
      popRingRef.current.visible = true
    } else {
      popStartRef.current = 0
      popRingRef.current.visible = false
    }
  }
})
```

**Add pop ring sprite in JSX** (inside `<group>`, before selection glow):

```tsx
{/* Pop ring for new orders */}
<sprite
  ref={popRingRef}
  material={new THREE.SpriteMaterial({
    map: getPopTexture(),
    transparent: true,
    depthWrite: false,
    sizeAttenuation: true,
    opacity: 0,
  })}
  scale={[pinSize * 2, pinSize * 2, 1]}
  visible={false}
/>
```

### 6b: Create OrderToast

```typescript
// src/components/Globe/OrderToast.tsx
'use client'

import { useGlobeStore } from '@/lib/store'
import { AnimatePresence, motion } from 'framer-motion'

export function OrderToast() {
  const recentOrders = useGlobeStore((s) => s.recentOrders)
  const visible = recentOrders.slice(0, 3)

  return (
    <div className="fixed bottom-24 right-6 z-30 flex flex-col gap-2 pointer-events-none">
      <AnimatePresence mode="popLayout">
        {visible.map((order) => (
          <motion.div
            key={`${order.orderId}-${order.menuItemName}`}
            initial={{ opacity: 0, x: 40, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 40, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            className="glass rounded-lg px-4 py-3 min-w-[260px] max-w-[320px]"
          >
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs font-semibold text-emerald-400">New Order</span>
              <span className="text-[10px] text-slate-500 ml-auto">
                {order.city}, {order.country}
              </span>
            </div>
            <div className="mt-1 text-sm text-white font-medium">
              {order.quantity}x {order.menuItemName}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              ${order.orderTotal.toFixed(2)} &middot; {order.brandName}
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}
```

**Step 3: Commit**

```bash
git add src/components/Globe/CityMarkers.tsx src/components/Globe/OrderToast.tsx
git commit -m "feat: add pop ring animation and order toast on globe"
```

---

## Task 7: Wire Poller + Toast into Globe Page

**Files:**
- Modify: `src/app/page.tsx`

**Step 1: Add imports**

```typescript
import { useOrderFeed } from '@/hooks/useOrderFeed'
import { OrderToast } from '@/components/Globe/OrderToast'
```

**Step 2: Add hook call** inside `Home()`:

```typescript
useOrderFeed()
```

**Step 3: Add `<OrderToast />` in JSX** before `</main>`:

```tsx
<OrderToast />
```

**Step 4: Commit**

```bash
git add src/app/page.tsx
git commit -m "feat: wire order feed poller and toast into globe page"
```

---

## Task 8: POS UI — `/pos` Route (Kitakata Ramen Bar Terminal)

**Files:**
- Create: `src/app/pos/layout.tsx`
- Create: `src/app/pos/page.tsx`

### Brand Design: Kitakata Ramen Bar
- Background: Deep charcoal `#1a1a2e`
- Accent: Warm red `#c0392b` / gold `#d4a017`
- Layout: Left = truck selector + menu grid, Right = cart + order summary
- Feel: Premium Japanese street food — dark, warm, minimal

### 8a: POS Layout

```typescript
// src/app/pos/layout.tsx
import type { Metadata } from 'next'
import '../globals.css'

export const metadata: Metadata = {
  title: 'Kitakata Ramen Bar — POS Terminal',
  description: 'Point of Sale Terminal',
}

export default function POSLayout({ children }: { children: React.ReactNode }) {
  return children
}
```

### 8b: POS Page

```typescript
// src/app/pos/page.tsx
'use client'

import { useState, useEffect, useCallback } from 'react'

interface Truck {
  TRUCK_ID: number
  PRIMARY_CITY: string
  COUNTRY: string
  FRANCHISE_ID: number
}

interface MenuItem {
  MENU_ITEM_ID: number
  MENU_ITEM_NAME: string
  SALE_PRICE_USD: number
}

interface CartItem {
  menuItem: MenuItem
  quantity: number
}

export default function POSPage() {
  const [trucks, setTrucks] = useState<Truck[]>([])
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [selectedTruck, setSelectedTruck] = useState<Truck | null>(null)
  const [cart, setCart] = useState<CartItem[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [lastOrder, setLastOrder] = useState<{ orderId: number; total: number } | null>(null)
  const [orderCount, setOrderCount] = useState(0)

  useEffect(() => {
    fetch('/api/pos/config')
      .then((r) => r.json())
      .then((data) => {
        setTrucks(data.trucks || [])
        setMenuItems(data.menuItems || [])
        if (data.trucks?.length > 0) setSelectedTruck(data.trucks[0])
      })
      .catch(console.error)
  }, [])

  const addToCart = useCallback((item: MenuItem) => {
    setCart((prev) => {
      const existing = prev.find((c) => c.menuItem.MENU_ITEM_ID === item.MENU_ITEM_ID)
      if (existing) {
        return prev.map((c) =>
          c.menuItem.MENU_ITEM_ID === item.MENU_ITEM_ID
            ? { ...c, quantity: c.quantity + 1 }
            : c
        )
      }
      return [...prev, { menuItem: item, quantity: 1 }]
    })
  }, [])

  const removeFromCart = useCallback((menuItemId: number) => {
    setCart((prev) => {
      const existing = prev.find((c) => c.menuItem.MENU_ITEM_ID === menuItemId)
      if (existing && existing.quantity > 1) {
        return prev.map((c) =>
          c.menuItem.MENU_ITEM_ID === menuItemId ? { ...c, quantity: c.quantity - 1 } : c
        )
      }
      return prev.filter((c) => c.menuItem.MENU_ITEM_ID !== menuItemId)
    })
  }, [])

  const subtotal = cart.reduce((sum, c) => sum + c.menuItem.SALE_PRICE_USD * c.quantity, 0)
  const total = subtotal // Matching real data pattern: no tax in existing orders

  const submitOrder = useCallback(async () => {
    if (!selectedTruck || cart.length === 0) return
    setSubmitting(true)
    try {
      const res = await fetch('/api/pos/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          truckId: selectedTruck.TRUCK_ID,
          items: cart.map((c) => ({
            menuItemId: c.menuItem.MENU_ITEM_ID,
            quantity: c.quantity,
            unitPrice: c.menuItem.SALE_PRICE_USD,
          })),
        }),
      })
      const data = await res.json()
      if (data.success) {
        setLastOrder({ orderId: data.orderId, total: data.orderTotal })
        setOrderCount((c) => c + 1)
        setCart([])
      }
    } catch (err) {
      console.error('Order failed:', err)
    } finally {
      setSubmitting(false)
    }
  }, [selectedTruck, cart])

  return (
    <div className="min-h-screen bg-[#1a1a2e] text-white flex flex-col">
      {/* Header */}
      <header className="bg-[#0f0f23] border-b border-[#c0392b]/30 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="text-2xl font-bold">
            <span className="text-[#c0392b]">Kitakata</span>{' '}
            <span className="text-[#d4a017]">Ramen Bar</span>
          </div>
          <div className="text-xs text-slate-500 border-l border-slate-700 pl-4">POS Terminal</div>
        </div>
        <div className="flex items-center gap-4">
          {selectedTruck && (
            <div className="text-xs text-slate-400">
              Truck #{selectedTruck.TRUCK_ID} &middot; {selectedTruck.PRIMARY_CITY}, {selectedTruck.COUNTRY}
            </div>
          )}
          <div className="text-xs text-emerald-400 font-mono">
            Orders today: {orderCount}
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Left: Truck selector + Menu Grid */}
        <div className="flex-1 p-6 overflow-y-auto">
          <div className="mb-6">
            <label className="text-xs text-slate-400 uppercase tracking-wider mb-2 block">
              Select Truck Location
            </label>
            <select
              value={selectedTruck?.TRUCK_ID || ''}
              onChange={(e) => {
                const truck = trucks.find((t) => t.TRUCK_ID === Number(e.target.value))
                if (truck) setSelectedTruck(truck)
              }}
              className="bg-[#0f0f23] border border-slate-700 rounded-lg px-4 py-2 text-sm text-white w-full max-w-md focus:border-[#c0392b] focus:outline-none"
            >
              {trucks.map((t) => (
                <option key={t.TRUCK_ID} value={t.TRUCK_ID}>
                  #{t.TRUCK_ID} — {t.PRIMARY_CITY}, {t.COUNTRY}
                </option>
              ))}
            </select>
          </div>

          <h2 className="text-sm text-slate-400 uppercase tracking-wider mb-4">Menu</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {menuItems.map((item) => (
              <button
                key={item.MENU_ITEM_ID}
                onClick={() => addToCart(item)}
                className="bg-[#0f0f23] border border-slate-700/50 rounded-xl p-4 text-left
                  hover:border-[#c0392b]/50 hover:bg-[#c0392b]/5 transition-all group"
              >
                <div className="text-sm font-medium text-white group-hover:text-[#d4a017] transition-colors">
                  {item.MENU_ITEM_NAME}
                </div>
                <div className="text-lg font-bold text-[#d4a017] mt-2">
                  ${item.SALE_PRICE_USD.toFixed(2)}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Right: Cart */}
        <div className="w-[380px] bg-[#0f0f23] border-l border-slate-800 flex flex-col">
          <div className="p-6 flex-1 overflow-y-auto">
            <h2 className="text-sm text-slate-400 uppercase tracking-wider mb-4">Current Order</h2>

            {cart.length === 0 ? (
              <div className="text-sm text-slate-600 text-center py-12">
                Tap menu items to add to order
              </div>
            ) : (
              <div className="space-y-3">
                {cart.map((c) => (
                  <div
                    key={c.menuItem.MENU_ITEM_ID}
                    className="flex items-center justify-between bg-[#1a1a2e] rounded-lg p-3"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{c.menuItem.MENU_ITEM_NAME}</div>
                      <div className="text-xs text-slate-400">
                        ${c.menuItem.SALE_PRICE_USD.toFixed(2)} each
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-2">
                      <button
                        onClick={() => removeFromCart(c.menuItem.MENU_ITEM_ID)}
                        className="w-7 h-7 rounded-full bg-slate-800 text-slate-400 hover:bg-[#c0392b] hover:text-white transition-colors flex items-center justify-center text-sm"
                      >
                        -
                      </button>
                      <span className="text-sm font-mono w-6 text-center">{c.quantity}</span>
                      <button
                        onClick={() => addToCart(c.menuItem)}
                        className="w-7 h-7 rounded-full bg-slate-800 text-slate-400 hover:bg-emerald-600 hover:text-white transition-colors flex items-center justify-center text-sm"
                      >
                        +
                      </button>
                    </div>
                    <div className="text-sm font-bold text-[#d4a017] ml-3 w-16 text-right">
                      ${(c.menuItem.SALE_PRICE_USD * c.quantity).toFixed(2)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Totals + Submit */}
          <div className="border-t border-slate-800 p-6">
            <div className="flex justify-between text-white text-lg font-bold mb-4">
              <span>Total</span>
              <span className="text-[#d4a017]">${total.toFixed(2)}</span>
            </div>

            <button
              onClick={submitOrder}
              disabled={cart.length === 0 || submitting}
              className="w-full py-4 rounded-xl font-bold text-white text-lg transition-all
                bg-gradient-to-r from-[#c0392b] to-[#e74c3c]
                hover:from-[#e74c3c] hover:to-[#c0392b]
                disabled:opacity-30 disabled:cursor-not-allowed
                active:scale-[0.98]"
            >
              {submitting ? 'Submitting...' : `Place Order — $${total.toFixed(2)}`}
            </button>

            {lastOrder && (
              <div className="mt-4 bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3 text-center">
                <div className="text-xs text-emerald-400 font-semibold">Order Confirmed</div>
                <div className="text-[10px] text-slate-400 mt-1">
                  #{lastOrder.orderId} &middot; ${lastOrder.total.toFixed(2)}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
```

**Step 3: Commit**

```bash
git add src/app/pos/page.tsx src/app/pos/layout.tsx
git commit -m "feat: add Kitakata Ramen Bar POS terminal at /pos"
```

---

## Task 9: Integration Test (Manual)

1. Run SQL setup (sequences + DT target lag)
2. Start dev server: `npm run dev`
3. Open two windows side-by-side:
   - `http://localhost:3000` (Globe)
   - `http://localhost:3000/pos` (POS)
4. In POS: select a truck (note city), add items, click Place Order
5. Wait 5-10s (DT refresh + poll)
6. On Globe: see cyan pulse ring + toast notification
7. Verify in Snowflake:
   ```sql
   SELECT * FROM HARMONIZED.POS_FLATTENED_DT
   WHERE ORDER_ID >= 1000000000
   ORDER BY ORDER_TS DESC LIMIT 10;
   ```
   Confirm: TRUCK_BRAND_NAME = "Kitakata Ramen Bar", correct city, menu item name, franchisee name all denormalized.

---

## Task Summary

| # | Component | Files | Purpose |
|---|-----------|-------|---------|
| SQL | Snowflake Setup | Run in console | Sequences + DT 5s lag |
| 1 | POS Config API | `api/pos/config/route.ts` | Load trucks + menu |
| 2 | Order Submit API | `api/pos/order/route.ts` | INSERT into RAW |
| 3 | Recent Orders API | `api/orders/recent/route.ts` | Globe polls DT |
| 4 | Store Updates | `lib/store.ts` | Streaming state |
| 5 | Poller Hook | `hooks/useOrderFeed.ts` | 5s polling |
| 6 | Globe Animations | `CityMarkers.tsx` + `OrderToast.tsx` | Pulse + toast |
| 7 | Wire Into Page | `page.tsx` | Connect poller + toast |
| 8 | POS UI | `pos/page.tsx` + `pos/layout.tsx` | Kitakata terminal |
| 9 | Integration Test | Manual | End-to-end |

## Future: Swap to Java Snowpipe Streaming

Replace Task 2's SQL INSERT with a call to a Java microservice:
```
POST /api/pos/order → POST http://localhost:8080/ingest → Snowpipe Streaming SDK insertRows() → RAW tables
```
Rest of pipeline unchanged.

## Future: Add Kafka
```
POST /api/pos/order → Kafka Producer → topic: pos-orders → Snowflake Kafka Connector → RAW tables
```
The Snowflake Kafka Connector uses Snowpipe Streaming internally.
