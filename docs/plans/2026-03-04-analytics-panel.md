# Analytics Panel Implementation Plan

**Goal:** Add a left-side tabbed Analytics Panel that visually answers the 6 Part 2 analytical questions from the take-home prompt, with a time slider for filtering across 2021-2022 data.

**Architecture:** Left-side glassmorphism panel (420px) with vertical icon tabs, slides in from left via Framer Motion. Each tab answers one analytical question using recharts visualizations. Data fetched lazily per-tab from new API routes that query `POS_FLATTENED_V` and existing ANALYTICS tables. Time slider filters data client-side.

**Tech Stack:** recharts, Framer Motion, Zustand, lucide-react, Tailwind CSS

---

## Database Context

**Available data (verified):**
- `POS_FLATTENED_V` — 587M rows, 2021-01 to 2022-11
  - 15 countries, 30 cities, 15 truck brands, ~15 menu types, 322 franchisees
  - Columns: ORDER_ID, TRUCK_ID, ORDER_TS, ORDER_TS_DATE, TRUCK_BRAND_NAME, MENU_TYPE, PRIMARY_CITY, COUNTRY, FRANCHISE_FLAG, FRANCHISEE_NAME, MENU_ITEM_NAME, QUANTITY, UNIT_PRICE, PRICE, ORDER_AMOUNT, ORDER_TAX_AMOUNT, ORDER_DISCOUNT_AMOUNT, ORDER_TOTAL
- `MONTHLY_TREND_DT` — pre-aggregated monthly city/country sales (already includes 2021+2022)
- `CITY_KPI_DT` — pre-aggregated city-level KPIs
- `TOP_ITEMS_DT` — top menu items per city

---

## Task 1: Install recharts + extend Zustand store

**Files:**
- Modify: `src/lib/store.ts`
- Run: `npm install recharts`

**Store additions:**
- `analyticsOpen: boolean` + setter (panel toggle)
- `analyticsTab: string` + setter (active tab: 'overview' | 'sales-trend' | 'top-brands' | 'menu-types' | 'franchisees' | 'distribution' | 'patterns')
- `timeRange: [number, number]` + setter (indices 0-22 mapping to 2021-01 through 2022-11)
- Data cache fields (all `null` initially, set after fetch): `salesTrendData`, `topBrandsData`, `menuTypesData`, `franchiseeData`, `orderDistributionData`, `orderPatternsData`
- `analyticsLoading: boolean` + setter

**Types to add:** `SalesTrendRow`, `TopBrandRow`, `MenuTypeRow`, `FranchiseeMonthRow`, `OrderDistributionRow`, `OrderPatternRow`

---

## Task 2: Create 6 API routes under `/api/analytics/`

**Files to create:**
- `src/app/api/analytics/sales-trend/route.ts`
- `src/app/api/analytics/top-brands/route.ts`
- `src/app/api/analytics/menu-types/route.ts`
- `src/app/api/analytics/franchisee-months/route.ts`
- `src/app/api/analytics/order-distribution/route.ts`
- `src/app/api/analytics/order-patterns/route.ts`

**Pattern:** Follow existing `src/app/api/city/route.ts` — define interface, `executeQuery<T>()`, transform, return JSON.

**SQL queries (all pre-aggregated, no raw 587M row scans):**

### sales-trend (Q1) — use existing MONTHLY_TREND_DT:
```sql
SELECT MONTH, COUNTRY, SUM(SALES) AS TOTAL_SALES, SUM(ORDERS) AS TOTAL_ORDERS
FROM TAKEHOME_DB.ANALYTICS.MONTHLY_TREND_DT
GROUP BY MONTH, COUNTRY
ORDER BY MONTH, COUNTRY
```
Returns ~345 rows (15 countries x 23 months).

### top-brands (Q2) — query POS_FLATTENED_V:
```sql
SELECT YEAR(ORDER_TS_DATE) AS YEAR, TRUCK_BRAND_NAME,
  SUM(PRICE) AS TOTAL_SALES, COUNT(DISTINCT ORDER_ID) AS TOTAL_ORDERS,
  RANK() OVER (PARTITION BY YEAR(ORDER_TS_DATE) ORDER BY SUM(PRICE) DESC) AS BRAND_RANK
FROM TAKEHOME_DB.HARMONIZED.POS_FLATTENED_V
GROUP BY 1, 2
QUALIFY BRAND_RANK <= 3
ORDER BY YEAR, BRAND_RANK
```
Returns 6 rows (3 per year).

### menu-types (Q3) — query POS_FLATTENED_V:
```sql
SELECT COUNTRY, MENU_TYPE, SUM(PRICE) AS TOTAL_SALES,
  RANK() OVER (PARTITION BY COUNTRY ORDER BY SUM(PRICE) DESC) AS TYPE_RANK
FROM TAKEHOME_DB.HARMONIZED.POS_FLATTENED_V
GROUP BY 1, 2
QUALIFY TYPE_RANK <= 3
ORDER BY COUNTRY, TYPE_RANK
```
Returns ~45 rows (15 countries x 3).

### franchisee-months (Q4) — query POS_FLATTENED_V:
```sql
SELECT COUNTRY, YEAR(ORDER_TS_DATE) AS YEAR, FRANCHISEE_NAME,
  TO_CHAR(ORDER_TS_DATE, 'YYYY-MM') AS MONTH_LABEL,
  SUM(PRICE) AS MONTHLY_SALES,
  RANK() OVER (PARTITION BY COUNTRY, YEAR(ORDER_TS_DATE), FRANCHISEE_NAME ORDER BY SUM(PRICE) DESC) AS MONTH_RANK
FROM TAKEHOME_DB.HARMONIZED.POS_FLATTENED_V
WHERE FRANCHISE_FLAG = 1
GROUP BY 1, 2, 3, 4
QUALIFY MONTH_RANK <= 3
ORDER BY COUNTRY, YEAR, FRANCHISEE_NAME, MONTH_RANK
```
Returns ~1900 rows. Supports optional `?country=` and `?year=` query params for server-side filtering.

### order-distribution (Q5) — use existing CITY_KPI_DT:
```sql
SELECT COUNTRY, SUM(TOTAL_ORDERS) AS TOTAL_ORDERS, SUM(TOTAL_SALES) AS TOTAL_SALES
FROM TAKEHOME_DB.ANALYTICS.CITY_KPI_DT
GROUP BY COUNTRY
ORDER BY TOTAL_ORDERS DESC
```
Returns 15 rows.

### order-patterns (Q6) — use existing MONTHLY_TREND_DT:
```sql
SELECT MONTH, SUM(ORDERS) AS TOTAL_ORDERS, SUM(SALES) AS TOTAL_SALES
FROM TAKEHOME_DB.ANALYTICS.MONTHLY_TREND_DT
GROUP BY MONTH
ORDER BY MONTH
```
Returns 23 rows.

---

## Task 3: Build shared chart utilities

**Files to create:**
- `src/components/AnalyticsPanel/ChartTheme.ts` — shared recharts colors, tooltip style, axis style
- `src/components/AnalyticsPanel/TimeSlider.tsx` — dual-range month slider (2021-01 to 2022-11)
- `src/components/AnalyticsPanel/useAnalyticsData.ts` — custom hook for lazy fetch + store cache pattern

**ChartTheme colors:** primary `#06b6d4` (teal), secondary `#00eeff` (cyan), tertiary `#8b5cf6` (violet), quaternary `#f59e0b` (amber), text `#94a3b8`, grid `rgba(148,163,184,0.1)`

**TimeSlider:** Two overlapping `<input type="range">` with custom CSS thumbs (cyan dots), gradient fill between thumbs. Reads/writes `timeRange` from store.

---

## Task 4: Build AnalyticsPanel container + tab bar

**Files to create:**
- `src/components/AnalyticsPanel/AnalyticsPanel.tsx` — main container with Framer Motion slide-from-left
- `src/components/AnalyticsPanel/AnalyticsTabBar.tsx` — vertical icon strip (~48px wide, left edge)

**Panel:** 420px wide, full height, `glass` class, `border-r border-white/10`, z-30. Mirrors SummaryPanel animation but from left.

**Tab bar icons (lucide-react):** LayoutDashboard (Overview), TrendingUp (Sales Trend), Award (Top Brands), UtensilsCrossed (Menu Types), Users (Franchisees), PieChart (Distribution), Clock (Patterns). Active tab gets cyan left border + brighter icon.

---

## Task 5: Build Overview tab

**File:** `src/components/AnalyticsPanel/tabs/OverviewTab.tsx`

**Content:**
- KPI cards (total revenue, total orders, avg order value — computed from cities in store)
- Global stats (30 cities, 15 countries, 2021-2022)
- TimeSlider component
- Small global sales sparkline (aggregate monthly sales from salesTrendData)

---

## Task 6: Build Sales Trend tab (Q1)

**File:** `src/components/AnalyticsPanel/tabs/SalesTrendTab.tsx`

**Content:** recharts `AreaChart` showing monthly sales across all countries. Stacked areas by country or a single aggregate line with country toggle. Filtered by timeRange. Uses `salesTrendData` from store, fetches from `/api/analytics/sales-trend` on first render.

---

## Task 7: Build Top Brands tab (Q2)

**File:** `src/components/AnalyticsPanel/tabs/TopBrandsTab.tsx`

**Content:** Horizontal `BarChart` showing top 3 truck brands per year (2021 vs 2022 side by side). Uses `topBrandsData`. Only 6 rows total — simple grouped bars.

---

## Task 8: Build Menu Types tab (Q3)

**File:** `src/components/AnalyticsPanel/tabs/MenuTypesTab.tsx`

**Content:** Country selector dropdown + horizontal bars for top 3 menu types in selected country. Uses `menuTypesData`. Default to first country alphabetically.

---

## Task 9: Build Franchisees tab (Q4)

**File:** `src/components/AnalyticsPanel/tabs/FranchiseeTab.tsx`

**Content:** Country + year selectors, then scrollable list showing each franchisee's best 3 months with sales figures. Uses `franchiseeData`. Styled as compact cards or a table.

---

## Task 10: Build Order Distribution tab (Q5)

**File:** `src/components/AnalyticsPanel/tabs/OrderDistributionTab.tsx`

**Content:** recharts `PieChart` (donut style) showing order counts by country. Legend below with percentages. Uses `orderDistributionData`.

---

## Task 11: Build Order Patterns tab (Q6)

**File:** `src/components/AnalyticsPanel/tabs/OrderPatternsTab.tsx`

**Content:** recharts `LineChart` or `BarChart` showing monthly order volume over time. Filtered by timeRange. Uses `orderPatternsData`. Shows trend with month-over-month growth indicators.

---

## Task 12: Wire into page.tsx + add toggle button

**Files to modify:**
- `src/app/page.tsx` — import AnalyticsPanel, add toggle button below Cortex Globe badge, render panel
- `src/app/globals.css` — add custom range slider thumb styles

**Toggle button:** Fixed position, top-left area (below existing badge), glass style with LayoutDashboard icon + "Analytics" label.

---

## Task 13: Polish + build verification

- Test all 6 API routes return data
- Verify time slider filters across tabs
- Ensure globe remains interactive behind panel
- Run `npm run build` to verify no type errors
- Commit

---

## Verification

1. `npm run dev` — app loads with globe
2. Click "Analytics" button — panel slides in from left with tabs
3. Each tab shows the correct visualization with real Snowflake data
4. Time slider filters data across tabs
5. Globe remains interactive (orbit, click cities, CityCard still works)
6. Right-side SummaryPanel still works independently
7. `npm run build` passes
