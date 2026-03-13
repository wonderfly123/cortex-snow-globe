'use client'

import React, { useCallback, useMemo } from 'react'
import { useGlobeStore } from '@/lib/store'

/** 21 months: 2024-01 through 2025-09 */
const MONTH_LABELS: string[] = (() => {
  const labels: string[] = []
  for (let year = 2024; year <= 2025; year++) {
    const endMonth = year === 2025 ? 9 : 12
    for (let m = 1; m <= endMonth; m++) {
      labels.push(`${year}-${String(m).padStart(2, '0')}`)
    }
  }
  return labels
})()

const SLIDER_MIN = 0
const SLIDER_MAX = MONTH_LABELS.length - 1 // 22

export default function TimeSlider() {
  const timeRange = useGlobeStore((s) => s.timeRange)
  const setTimeRange = useGlobeStore((s) => s.setTimeRange)

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

  /** Percentage positions for the gradient fill between thumbs */
  const leftPct = useMemo(() => (minVal / SLIDER_MAX) * 100, [minVal])
  const rightPct = useMemo(() => (maxVal / SLIDER_MAX) * 100, [maxVal])

  return (
    <div className="w-full px-1">
      {/* Slider track */}
      <div className="relative h-6">
        {/* Background track */}
        <div className="absolute top-1/2 -translate-y-1/2 left-0 right-0 h-1 rounded-full bg-slate-700" />

        {/* Active range fill */}
        <div
          className="absolute top-1/2 -translate-y-1/2 h-1 rounded-full"
          style={{
            left: `${leftPct}%`,
            width: `${rightPct - leftPct}%`,
            background: 'linear-gradient(90deg, #06b6d4, #00eeff)',
          }}
        />

        {/* Min thumb */}
        <input
          type="range"
          min={SLIDER_MIN}
          max={SLIDER_MAX}
          value={minVal}
          onChange={handleMinChange}
          className="slider-thumb absolute inset-0 w-full"
          style={{ zIndex: minVal === maxVal ? 2 : 1 }}
        />

        {/* Max thumb */}
        <input
          type="range"
          min={SLIDER_MIN}
          max={SLIDER_MAX}
          value={maxVal}
          onChange={handleMaxChange}
          className="slider-thumb absolute inset-0 w-full"
          style={{ zIndex: 2 }}
        />
      </div>

      {/* Labels */}
      <div className="flex justify-between text-xs text-cyan-300 mt-1 font-mono">
        <span>{MONTH_LABELS[minVal]}</span>
        <span>{MONTH_LABELS[maxVal]}</span>
      </div>

      {/* Note: slider thumb styles are in globals.css under .slider-thumb */}
    </div>
  )
}

export { MONTH_LABELS }
