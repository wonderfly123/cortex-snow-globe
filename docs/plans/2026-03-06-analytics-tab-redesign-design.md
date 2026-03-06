# Analytics Tab Redesign — Design Document

## Goal

Redesign 4 analytics tabs (Top Brands, Menu Types, Distribution, Franchisees) to tell the business.md stories clearly through multiple chart types, summary cards, and complete data views — matching the quality of the Patterns tab.

## Shared Pattern

Every redesigned tab follows this structure:
1. **AI Insight** (existing — keep as-is)
2. **Summary cards** — 2-3 stat cards highlighting the key finding from business.md
3. **Primary chart** — the main visualization telling the story
4. **Secondary chart(s)** — additional angles on the same data
5. **Filters** — dropdowns where applicable (country, year)

Tech: React + Recharts (already in use). No new dependencies.

---

## Tab 1: Top Brands

### Story to Tell
Kitakata Ramen surged from #3 to #1 in 2022. Nani's Kitchen is the most consistent. Cheeky Greek is slipping.

### Summary Cards
- "Fastest Riser" — brand with largest YoY revenue increase (Kitakata Ramen, +60%)
- "Most Consistent" — brand that stayed in top 3 both years (Nani's Kitchen)

### Charts
1. **Grouped bar chart** — top brands with 2021 vs 2022 bars side-by-side. Shows absolute revenue and growth at a glance.
2. **Slope/bump chart** — lines connecting rank positions from 2021 to 2022. Makes the Ramen surge and Greek decline visually obvious.
3. **Orders secondary metric** — small text or secondary bar showing order count alongside revenue.

### Filters
- **Country dropdown** — "All Countries" (default, overall) plus per-country view. Same charts, scoped to selection.

### API Changes
- Expand `/api/analytics/top-brands` to accept optional `country` query param
- Return top brands per country (not just overall) — add COUNTRY to GROUP BY when param present
- Keep existing overall query as default

---

## Tab 2: Menu Types

### Story to Tell
Indian cuisine is the global winner (#1 in 7 countries, top 3 in 12/15). Gyros are surprisingly universal. Japan's top seller is Gyros, not Ramen.

### Summary Cards
- "Global #1" — Indian (top 3 in 12/15 countries)
- "Most Universal" — Gyros (top 3 in 9/15 countries)

### Charts
1. **Heatmap matrix** — countries as rows, menu types as columns, cell color intensity = revenue. Instantly reveals patterns and surprises. Highlight cells where the #1 menu type is unexpected (Japan+Gyros, Germany+Ramen).
2. **Country bar chart** (existing, below heatmap) — keep the dropdown + horizontal bars for drilling into a specific country's top 3.

### Surprise Callouts
- Below or overlaid on heatmap, flag 2-3 counter-intuitive findings: "Japan's #1 is Gyros, not Ramen", "Ramen dominates in Germany"

### API Changes
- Expand `/api/analytics/menu-types` to return ALL country x menu type combinations (not just top 3 per country) for the heatmap
- Add a query param `?mode=heatmap` for full matrix, keep default for top-3-only
- Alternatively: single query returning all data, filter client-side

---

## Tab 3: Distribution

### Story to Tell
US has 75 trucks but worst revenue-per-truck ($11.1M). South Korea has only 15 trucks but highest efficiency ($30.5M/truck).

### Summary Cards
- "Highest Efficiency" — South Korea ($30.5M/truck)
- "Most Over-Trucked" — United States ($11.1M/truck)

### Charts
1. **Donut chart** (existing) — switch from orders to revenue. Center label shows total revenue.
2. **Scatter plot** — X = truck count, Y = revenue per truck. Each dot is a country (labeled). Instantly shows the efficiency story.
3. **Revenue-per-truck bar chart** — horizontal bars sorted by efficiency (highest to lowest). Clear ranking.

### API Changes
- Expand `/api/analytics/order-distribution` to include truck count per country
- Source: CITY_KPI_DT already has ACTIVE_TRUCKS — add SUM(ACTIVE_TRUCKS) to the GROUP BY COUNTRY query
- Compute revenue_per_truck server-side or client-side (totalSales / truckCount)

---

## Tab 4: Franchisees

### Story to Tell
October is peak, summer is strong, Jan-Feb are the slow period. Franchisees need support in winter.

### Summary Cards
- "Peak Month" — October
- "Strong Season" — May-Aug
- "Slowest Months" — Jan-Feb

### Charts
1. **Monthly revenue bar chart** — 12 bars (Jan-Dec) showing aggregated revenue across all franchisees. Reveals the seasonal shape (October spike, summer plateau, winter dip).
2. **Top franchisees table** — ranked by total revenue, with inline sparklines showing each franchisee's monthly trend. Shows who's consistent vs volatile.
3. **Best months heatmap** — franchisees as rows, months as columns, color intensity = revenue. Quickly shows if all franchisees peak together or if some have different patterns.

### Filters
- Keep country and year dropdowns (existing)

### API Changes
- Expand `/api/analytics/franchisee-months` to return ALL months per franchisee (not just top 3)
- Add monthly aggregate endpoint or include aggregated monthly totals in the response
- Need: per-franchisee monthly breakdown + overall monthly totals

---

## Data Types (Store Updates)

```typescript
// Top Brands — add country field
interface TopBrandRow {
  year: number
  brand: string
  totalSales: number
  totalOrders: number
  brandRank: number
  country?: string  // new: present when filtered by country
}

// Menu Types — add revenue for heatmap
interface MenuTypeHeatmapRow {
  country: string
  menuType: string
  totalSales: number
}

// Distribution — add truck data
interface OrderDistributionRow {
  country: string
  totalOrders: number
  totalSales: number
  truckCount: number      // new
  revenuePerTruck: number // new
}

// Franchisees — full monthly data
interface FranchiseeMonthRow {
  country: string
  year: number
  franchisee: string
  monthLabel: string
  monthlySales: number
  monthRank: number  // keep for backward compat, but return all months
}
```

---

## What Stays the Same

- Sales Trend tab — just improved, no changes
- Patterns tab — user says it's good, no changes
- AI Insight component — keep on all tabs
- ChartTheme colors and tooltip styles
- TimeSlider — keep as-is (only affects Sales Trend)
- useAnalyticsData hook pattern
- Zustand store architecture

---

## Implementation Order

1. API changes (all 4 endpoints)
2. Store type updates
3. Distribution tab (smallest scope, most visual impact)
4. Top Brands tab
5. Menu Types tab (heatmap is the most complex chart)
6. Franchisees tab (most data, table + heatmap)
