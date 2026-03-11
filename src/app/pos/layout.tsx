// src/app/pos/layout.tsx
import type { Metadata } from 'next'
import '../globals.css'

export const metadata: Metadata = {
  title: 'Kitakata Ramen Bar — POS Terminal',
  description: 'Point of Sale Terminal',
}

export default function POSLayout({ children }: { children: React.ReactNode }) {
  return children
}
