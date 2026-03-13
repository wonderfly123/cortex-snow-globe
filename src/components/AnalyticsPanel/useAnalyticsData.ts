'use client'

import { useEffect, useState, useRef } from 'react'
import { useGlobeStore } from '@/lib/store'

/**
 * Lazy-fetch hook with Zustand store cache.
 * Supports optional timeframe filtering via `analyticsTimeframe` from the store.
 */
export function useAnalyticsData<T>(
  tabName: string,
  data: T[] | null,
  setter: (rows: T[] | null) => void,
): { data: T[] | null; loading: boolean; error: string | null } {
  const analyticsLoading = useGlobeStore((s) => s.analyticsLoading)
  const setAnalyticsLoading = useGlobeStore((s) => s.setAnalyticsLoading)
  const analyticsTimeframe = useGlobeStore((s) => s.analyticsTimeframe)
  const prevTimeframe = useRef(analyticsTimeframe)

  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // If timeframe changed, clear cached data to force re-fetch
    if (prevTimeframe.current !== analyticsTimeframe) {
      prevTimeframe.current = analyticsTimeframe
      setter(null)
      return
    }

    // Already cached — nothing to do
    if (data !== null) return

    let cancelled = false

    async function fetchData() {
      setAnalyticsLoading(true)
      setError(null)

      try {
        const params = analyticsTimeframe !== null ? `?days=${analyticsTimeframe}` : ''
        const res = await fetch(`/api/analytics/${tabName}${params}`)
        if (!res.ok) {
          throw new Error(`Failed to fetch ${tabName}: ${res.status}`)
        }
        const json = await res.json()
        if (!cancelled) {
          setter(json.data ?? json)
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Unknown error')
        }
      } finally {
        if (!cancelled) {
          setAnalyticsLoading(false)
        }
      }
    }

    fetchData()

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tabName, data, analyticsTimeframe])

  return {
    data,
    loading: analyticsLoading,
    error,
  }
}
