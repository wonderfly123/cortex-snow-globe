'use client'

import { useGlobeStore } from '@/lib/store'
import { AnimatePresence, motion } from 'framer-motion'

export function OrderToast() {
  const recentOrders = useGlobeStore((s) => s.recentOrders)
  const visible = recentOrders.slice(0, 3)

  return (
    <div className="fixed bottom-24 right-6 z-30 flex flex-col gap-2 pointer-events-none">
      <AnimatePresence mode="popLayout">
        {visible.map((order) => (
          <motion.div
            key={order.orderId}
            initial={{ opacity: 0, x: 40, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 40, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            className="glass rounded-lg px-4 py-3 min-w-[260px] max-w-[320px]"
          >
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs font-semibold text-emerald-400">New Order</span>
              <span className="text-[10px] text-slate-500 ml-auto">
                {order.city}, {order.country}
              </span>
            </div>
            <div className="mt-1 space-y-0.5">
              {order.items.map((item, i) => (
                <div key={i} className="text-sm text-white font-medium">
                  {item.quantity}x {item.menuItemName}
                </div>
              ))}
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              ${order.orderTotal.toFixed(2)} &middot; {order.brandName}
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}
