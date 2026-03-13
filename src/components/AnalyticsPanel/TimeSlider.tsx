'use client'

import React, { useCallback, useMemo, useEffect } from 'react'
import { useGlobeStore } from '@/lib/store'

export default function TimeSlider() {
  const timeRange = useGlobeStore((s) => s.timeRange)
  const setTimeRange = useGlobeStore((s) => s.setTimeRange)
  const salesTrendData = useGlobeStore((s) => s.salesTrendData)

  // Derive labels from actual data
  const labels = useMemo(() => {
    if (!salesTrendData || salesTrendData.length === 0) return []
    const unique = [...new Set(salesTrendData.map((r) => r.month))].sort()
    return unique
  }, [salesTrendData])

  const sliderMax = Math.max(labels.length - 1, 0)

  // Reset timeRange when labels change
  useEffect(() => {
    if (labels.length > 0) {
      setTimeRange([0, labels.length - 1])
    }
  }, [labels.length, setTimeRange])

  const [minVal, maxVal] = timeRange

  const handleMinChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = Math.min(Number(e.target.value), maxVal)
      setTimeRange([val, maxVal])
    },
    [maxVal, setTimeRange],
  )

  const handleMaxChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = Math.max(Number(e.target.value), minVal)
      setTimeRange([minVal, val])
    },
    [minVal, setTimeRange],
  )

  const leftPct = useMemo(() => (sliderMax > 0 ? (minVal / sliderMax) * 100 : 0), [minVal, sliderMax])
  const rightPct = useMemo(() => (sliderMax > 0 ? (maxVal / sliderMax) * 100 : 100), [maxVal, sliderMax])

  if (labels.length === 0) return null

  return (
    <div className="w-full px-1">
      <div className="relative h-6">
        <div className="absolute top-1/2 -translate-y-1/2 left-0 right-0 h-1 rounded-full bg-slate-700" />
        <div
          className="absolute top-1/2 -translate-y-1/2 h-1 rounded-full"
          style={{
            left: `${leftPct}%`,
            width: `${rightPct - leftPct}%`,
            background: 'linear-gradient(90deg, #06b6d4, #00eeff)',
          }}
        />
        <input
          type="range"
          min={0}
          max={sliderMax}
          value={Math.min(minVal, sliderMax)}
          onChange={handleMinChange}
          className="slider-thumb absolute inset-0 w-full"
          style={{ zIndex: minVal === maxVal ? 2 : 1 }}
        />
        <input
          type="range"
          min={0}
          max={sliderMax}
          value={Math.min(maxVal, sliderMax)}
          onChange={handleMaxChange}
          className="slider-thumb absolute inset-0 w-full"
          style={{ zIndex: 2 }}
        />
      </div>
      <div className="flex justify-between text-xs text-cyan-300 mt-1 font-mono">
        <span>{labels[Math.min(minVal, sliderMax)] ?? ''}</span>
        <span>{labels[Math.min(maxVal, sliderMax)] ?? ''}</span>
      </div>
    </div>
  )
}

/** Export labels getter for SalesTrendTab filtering */
export function useTimeLabels(): string[] {
  const salesTrendData = useGlobeStore((s) => s.salesTrendData)
  return useMemo(() => {
    if (!salesTrendData || salesTrendData.length === 0) return []
    return [...new Set(salesTrendData.map((r) => r.month))].sort()
  }, [salesTrendData])
}
