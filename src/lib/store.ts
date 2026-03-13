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

// Analytics data types
export interface SalesTrendRow {
  month: string
  country: string
  totalSales: number
  totalOrders: number
}

export interface TopBrandRow {
  year: number
  brand: string
  totalSales: number
  totalOrders: number
  brandRank: number
  country?: string | null
}

export interface MenuTypeRow {
  country: string
  year: number
  menuType: string
  totalSales: number
  typeRank: number
}

export interface FranchiseeMonthRow {
  country: string
  year: number
  franchisee: string
  monthLabel: string
  monthlySales: number
  monthRank: number
}

export interface OrderDistributionRow {
  country: string
  totalOrders: number
  totalSales: number
  truckCount: number
  revenuePerTruck: number
}

export interface OrderPatternRow {
  month: string
  totalOrders: number
  totalSales: number
}

export interface DowPatternRow {
  dow: number
  dowName: string
  totalOrders: number
  avgOrdersPerWeek: number
}

export interface HourPatternRow {
  hour: number
  totalOrders: number
}

export interface RecentOrderItem {
  menuItemName: string
  quantity: number
  price: number
}

export interface RecentOrder {
  orderId: number
  orderTs: string
  city: string
  country: string
  brandName: string
  orderTotal: number
  items: RecentOrderItem[]
  receivedAt: number // Date.now() for TTL
}

export type AnalyticsTab = 'sales-trend' | 'top-brands' | 'menu-types' | 'franchisees' | 'distribution' | 'patterns'

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

  // City timeframe filter
  cityTimeframe: number | null // null = all time, or days (1, 7, 30, 60, 90)
  setCityTimeframe: (days: number | null) => void

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

  // Analytics panel
  analyticsOpen: boolean
  setAnalyticsOpen: (open: boolean) => void
  analyticsTab: AnalyticsTab
  setAnalyticsTab: (tab: AnalyticsTab) => void
  timeRange: [number, number]
  setTimeRange: (range: [number, number]) => void
  analyticsLoading: boolean
  setAnalyticsLoading: (loading: boolean) => void
  analyticsTimeframe: number | null // null = all time, or days (1, 7, 30, 60, 90)
  setAnalyticsTimeframe: (days: number | null) => void
  clearAnalyticsCache: () => void

  // Analytics data cache
  salesTrendData: SalesTrendRow[] | null
  setSalesTrendData: (data: SalesTrendRow[] | null) => void
  topBrandsData: TopBrandRow[] | null
  setTopBrandsData: (data: TopBrandRow[] | null) => void
  menuTypesData: MenuTypeRow[] | null
  setMenuTypesData: (data: MenuTypeRow[] | null) => void
  franchiseeData: FranchiseeMonthRow[] | null
  setFranchiseeData: (data: FranchiseeMonthRow[] | null) => void
  orderDistributionData: OrderDistributionRow[] | null
  setOrderDistributionData: (data: OrderDistributionRow[] | null) => void
  orderPatternsData: OrderPatternRow[] | null
  setOrderPatternsData: (data: OrderPatternRow[] | null) => void
  dowPatternsData: DowPatternRow[] | null
  setDowPatternsData: (data: DowPatternRow[] | null) => void
  hourPatternsData: HourPatternRow[] | null
  setHourPatternsData: (data: HourPatternRow[] | null) => void

  // Tab AI insights cache
  tabInsights: Record<string, string>
  setTabInsight: (tab: string, insight: string) => void
  tabInsightLoading: Record<string, boolean>
  setTabInsightLoading: (tab: string, loading: boolean) => void

  // Real-time order feed
  recentOrders: RecentOrder[]
  addRecentOrders: (orders: RecentOrder[]) => void
  expireRecentOrders: (ttl: number) => void
  lastPollTimestamp: string | null
  setLastPollTimestamp: (ts: string) => void
  poppingCities: Set<string>
  addPoppingCity: (city: string) => void
  removePoppingCity: (city: string) => void
}

export const useGlobeStore = create<GlobeStore>((set) => ({
  cities: [],
  setCities: (cities) => set({ cities }),

  selectedCity: null,
  selectedCountry: null,
  selectCity: (city, country = null) => set({ selectedCity: city, selectedCountry: country, cityTimeframe: null }),

  cityKPI: null,
  setCityKPI: (kpi) => set({ cityKPI: kpi }),
  monthlyTrend: [],
  setMonthlyTrend: (trend) => set({ monthlyTrend: trend }),
  topItems: [],
  setTopItems: (items) => set({ topItems: items }),

  cityTimeframe: null,
  setCityTimeframe: (days) => set({ cityTimeframe: days }),

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

  // Analytics panel
  analyticsOpen: false,
  setAnalyticsOpen: (open) => set({ analyticsOpen: open }),
  analyticsTab: 'sales-trend' as AnalyticsTab,
  setAnalyticsTab: (tab) => set({ analyticsTab: tab }),
  timeRange: [0, 20] as [number, number],
  setTimeRange: (range) => set({ timeRange: range }),
  analyticsLoading: false,
  setAnalyticsLoading: (loading) => set({ analyticsLoading: loading }),
  analyticsTimeframe: null,
  setAnalyticsTimeframe: (days) => set({ analyticsTimeframe: days }),
  clearAnalyticsCache: () => set({
    salesTrendData: null,
    topBrandsData: null,
    menuTypesData: null,
    franchiseeData: null,
    orderDistributionData: null,
    orderPatternsData: null,
    dowPatternsData: null,
    hourPatternsData: null,
  }),

  // Analytics data cache
  salesTrendData: null,
  setSalesTrendData: (data) => set({ salesTrendData: data }),
  topBrandsData: null,
  setTopBrandsData: (data) => set({ topBrandsData: data }),
  menuTypesData: null,
  setMenuTypesData: (data) => set({ menuTypesData: data }),
  franchiseeData: null,
  setFranchiseeData: (data) => set({ franchiseeData: data }),
  orderDistributionData: null,
  setOrderDistributionData: (data) => set({ orderDistributionData: data }),
  orderPatternsData: null,
  setOrderPatternsData: (data) => set({ orderPatternsData: data }),
  dowPatternsData: null,
  setDowPatternsData: (data) => set({ dowPatternsData: data }),
  hourPatternsData: null,
  setHourPatternsData: (data) => set({ hourPatternsData: data }),

  tabInsights: {},
  setTabInsight: (tab, insight) => set((s) => ({ tabInsights: { ...s.tabInsights, [tab]: insight } })),
  tabInsightLoading: {},
  setTabInsightLoading: (tab, loading) => set((s) => ({ tabInsightLoading: { ...s.tabInsightLoading, [tab]: loading } })),

  // Real-time order feed
  recentOrders: [],
  addRecentOrders: (orders) => set((s) => {
    // Dedupe by orderId — don't re-add orders already in the list
    const existingIds = new Set(s.recentOrders.map((o) => o.orderId))
    const newOrders = orders.filter((o) => !existingIds.has(o.orderId))
    return { recentOrders: [...newOrders, ...s.recentOrders].slice(0, 20) }
  }),
  expireRecentOrders: (ttl) => set((s) => {
    const cutoff = Date.now() - ttl
    return { recentOrders: s.recentOrders.filter((o) => o.receivedAt > cutoff) }
  }),
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
}))
