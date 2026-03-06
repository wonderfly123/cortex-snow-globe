// Shared recharts theming constants

import type React from 'react'

export const COLORS = {
  primary: '#06b6d4',
  secondary: '#00eeff',
  tertiary: '#8b5cf6',
  quaternary: '#f59e0b',
  text: '#94a3b8',
  grid: 'rgba(148,163,184,0.1)',
} as const

/** Ordered color palette for mapping over data series */
export const CHART_COLORS = [
  '#06b6d4',
  '#22d3ee',
  '#67e8f9',
  '#a78bfa',
  '#818cf8',
] as const

/** Recharts tooltip content style — dark glass background */
export const tooltipStyle: React.CSSProperties = {
  backgroundColor: 'rgba(15, 23, 42, 0.85)',
  backdropFilter: 'blur(12px)',
  border: 'none',
  borderRadius: '8px',
  color: '#ffffff',
  fontSize: '13px',
  padding: '10px 14px',
}

/** Recharts axis tick style */
export const axisStyle = {
  fill: COLORS.text,
  fontSize: 12,
} as const
