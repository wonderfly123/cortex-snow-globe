'use client'

import { useEffect, useState } from 'react'
import { useGlobeStore } from '@/lib/store'

/**
 * Lazy-fetch hook with Zustand store cache.
 *
 * On first render, if `data` is null, fetches from `/api/analytics/{tabName}`
 * and stores the result via `setter`. Subsequent renders skip the fetch
 * because the store already holds the cached data.
 *
 * @param tabName   API route segment (e.g. 'sales-trend')
 * @param data      Current cached value from the store (null = not yet loaded)
 * @param setter    Store setter for caching the fetched result
 */
export function useAnalyticsData<T>(
  tabName: string,
  data: T[] | null,
  setter: (rows: T[] | null) => void,
): { data: T[] | null; loading: boolean; error: string | null } {
  const analyticsLoading = useGlobeStore((s) => s.analyticsLoading)
  const setAnalyticsLoading = useGlobeStore((s) => s.setAnalyticsLoading)

  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Already cached — nothing to do
    if (data !== null) return

    let cancelled = false

    async function fetchData() {
      setAnalyticsLoading(true)
      setError(null)

      try {
        const res = await fetch(`/api/analytics/${tabName}`)
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
  }, [tabName, data])

  return {
    data,
    loading: analyticsLoading,
    error,
  }
}
