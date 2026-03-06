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
}

export interface MenuTypeRow {
  country: string
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

  // Analytics panel
  analyticsOpen: false,
  setAnalyticsOpen: (open) => set({ analyticsOpen: open }),
  analyticsTab: 'sales-trend' as AnalyticsTab,
  setAnalyticsTab: (tab) => set({ analyticsTab: tab }),
  timeRange: [0, 22] as [number, number],
  setTimeRange: (range) => set({ timeRange: range }),
  analyticsLoading: false,
  setAnalyticsLoading: (loading) => set({ analyticsLoading: loading }),

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
}))
