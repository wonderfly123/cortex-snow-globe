'use client'

import { useEffect } from 'react'
import { useGlobeStore } from '@/lib/store'

export function TabInsight({ tab }: { tab: string }) {
  const insight = useGlobeStore((s) => s.tabInsights[tab])
  const loading = useGlobeStore((s) => s.tabInsightLoading[tab])
  const setTabInsight = useGlobeStore((s) => s.setTabInsight)
  const setTabInsightLoading = useGlobeStore((s) => s.setTabInsightLoading)

  useEffect(() => {
    // Already cached
    if (insight) return

    setTabInsightLoading(tab, true)

    fetch('/api/cortex/tab-insight', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tab }),
    })
      .then((r) => r.json())
      .then((data) => setTabInsight(tab, data.insight || 'Unable to generate insight.'))
      .catch(() => setTabInsight(tab, 'Unable to generate AI insight.'))
      .finally(() => setTabInsightLoading(tab, false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab])

  if (!insight && !loading) return null

  return (
    <div className="border-b border-white/10 pb-4">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
        <span className="text-[9px] uppercase tracking-widest text-cyan-400 font-mono">AI Insight</span>
      </div>
      {loading ? (
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" strokeDasharray="32" strokeLinecap="round" />
          </svg>
          Generating insight...
        </div>
      ) : (
        <p className="text-xs text-slate-300 leading-relaxed">{insight}</p>
      )}
    </div>
  )
}
