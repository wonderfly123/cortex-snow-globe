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
