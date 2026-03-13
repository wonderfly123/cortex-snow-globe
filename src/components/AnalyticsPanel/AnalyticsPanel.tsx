'use client'

import React, { useEffect, useRef, useCallback, useState } from 'react'
import { motion } from 'framer-motion'
import { useGlobeStore } from '@/lib/store'
import type { AnalyticsTab } from '@/lib/store'
import { AnalyticsTabBar } from './AnalyticsTabBar'
import SalesTrendTab from './tabs/SalesTrendTab'
import TopBrandsTab from './tabs/TopBrandsTab'
import MenuTypesTab from './tabs/MenuTypesTab'
import FranchiseeTab from './tabs/FranchiseeTab'
import OrderDistributionTab from './tabs/OrderDistributionTab'
import OrderPatternsTab from './tabs/OrderPatternsTab'

const tabComponents: Record<AnalyticsTab, React.ComponentType> = {
  'sales-trend': SalesTrendTab,
  'top-brands': TopBrandsTab,
  'menu-types': MenuTypesTab,
  franchisees: FranchiseeTab,
  distribution: OrderDistributionTab,
  patterns: OrderPatternsTab,
}

const MIN_HEIGHT = 0
const MAX_HEIGHT_RATIO = 0.85
const TAB_BAR_HEIGHT = 48

const TIMEFRAMES = [
  { label: '1D', days: 1 },
  { label: '7D', days: 7 },
  { label: '30D', days: 30 },
  { label: '60D', days: 60 },
  { label: '90D', days: 90 },
  { label: 'All', days: null },
] as const

export function AnalyticsPanel() {
  const analyticsOpen = useGlobeStore((s) => s.analyticsOpen)
  const setAnalyticsOpen = useGlobeStore((s) => s.setAnalyticsOpen)
  const analyticsTab = useGlobeStore((s) => s.analyticsTab)
  const analyticsTimeframe = useGlobeStore((s) => s.analyticsTimeframe)
  const setAnalyticsTimeframe = useGlobeStore((s) => s.setAnalyticsTimeframe)
  const clearAnalyticsCache = useGlobeStore((s) => s.clearAnalyticsCache)

  const [contentHeight, setContentHeight] = useState(0)
  const dragging = useRef(false)
  const didDrag = useRef(false)
  const startY = useRef(0)
  const startH = useRef(0)

  useEffect(() => {
    if (analyticsOpen) {
      setContentHeight(Math.round(window.innerHeight * 0.4))
    } else {
      setContentHeight(0)
    }
  }, [analyticsOpen])

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    dragging.current = true
    didDrag.current = false
    startY.current = e.clientY
    startH.current = contentHeight
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
  }, [contentHeight])

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragging.current) return
    const moved = Math.abs(e.clientY - startY.current)
    if (moved > 5) didDrag.current = true
    const delta = startY.current - e.clientY
    const maxH = Math.round(window.innerHeight * MAX_HEIGHT_RATIO) - TAB_BAR_HEIGHT
    const newH = Math.max(MIN_HEIGHT, Math.min(maxH, startH.current + delta))
    setContentHeight(newH)
  }, [])

  const onPointerUp = useCallback(() => {
    if (!dragging.current) return
    dragging.current = false

    if (!didDrag.current) {
      if (contentHeight > 0) {
        setContentHeight(0)
        setAnalyticsOpen(false)
      } else {
        setContentHeight(Math.round(window.innerHeight * 0.4))
        setAnalyticsOpen(true)
      }
      return
    }

    if (contentHeight < 80) {
      setContentHeight(0)
      setAnalyticsOpen(false)
    } else if (!analyticsOpen) {
      setAnalyticsOpen(true)
    }
  }, [contentHeight, analyticsOpen, setAnalyticsOpen])

  const handleTimeframeChange = useCallback((days: number | null) => {
    setAnalyticsTimeframe(days)
    clearAnalyticsCache()
  }, [setAnalyticsTimeframe, clearAnalyticsCache])

  const TabContent = tabComponents[analyticsTab]
  const isOpen = contentHeight > 0

  return (
    <div className="fixed bottom-0 left-0 right-0 z-30 glass rounded-t-2xl border-t border-white/10">
      {/* Drag handle */}
      <div
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        className="flex items-center justify-center py-2 cursor-ns-resize select-none touch-none"
      >
        <div className="w-10 h-1 rounded-full bg-slate-600" />
      </div>

      {/* Tab bar + timeframe filter */}
      <div className="border-b border-white/10 flex items-center">
        <div className="flex-1">
          <AnalyticsTabBar />
        </div>
        <div className="flex gap-1 px-4">
          {TIMEFRAMES.map((tf) => (
            <button
              key={tf.label}
              onClick={() => handleTimeframeChange(tf.days)}
              className={`px-2 py-1 rounded text-[10px] font-mono transition-colors cursor-pointer ${
                analyticsTimeframe === tf.days
                  ? 'bg-cyan-500/30 text-cyan-300 border border-cyan-500/40'
                  : 'bg-white/5 text-slate-400 border border-white/10 hover:bg-white/10'
              }`}
            >
              {tf.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content area */}
      <motion.div
        animate={{ height: contentHeight }}
        transition={dragging.current ? { duration: 0 } : { type: 'spring', damping: 25, stiffness: 200 }}
        className="overflow-hidden"
      >
        {isOpen && (
          <div className="h-full overflow-y-auto p-6">
            <TabContent />
          </div>
        )}
      </motion.div>
    </div>
  )
}
