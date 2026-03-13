'use client'

import { useEffect, useRef, useCallback } from 'react'
import { useGlobeStore, RecentOrder, RecentOrderItem } from '@/lib/store'

const POLL_INTERVAL = 2000
const TOAST_TTL = 10000 // 10 seconds

export function useOrderFeed() {
  const addRecentOrders = useGlobeStore((s) => s.addRecentOrders)
  const lastPollTimestamp = useGlobeStore((s) => s.lastPollTimestamp)
  const setLastPollTimestamp = useGlobeStore((s) => s.setLastPollTimestamp)
  const addPoppingCity = useGlobeStore((s) => s.addPoppingCity)
  const removePoppingCity = useGlobeStore((s) => s.removePoppingCity)
  const expireRecentOrders = useGlobeStore((s) => s.expireRecentOrders)
  const lastPollRef = useRef(lastPollTimestamp)
  lastPollRef.current = lastPollTimestamp

  const poll = useCallback(async () => {
    // Expire old toasts on every poll cycle
    expireRecentOrders(TOAST_TTL)

    try {
      const url = lastPollRef.current
        ? `/api/orders/recent?since=${encodeURIComponent(lastPollRef.current)}`
        : '/api/orders/recent'

      const res = await fetch(url)
      if (!res.ok) return
      const data = await res.json()

      if (data.orders && data.orders.length > 0) {
        // Group line items by ORDER_ID
        const orderMap = new Map<number, RecentOrder>()
        const now = Date.now()

        for (const o of data.orders) {
          const orderId = o.ORDER_ID as number
          const item: RecentOrderItem = {
            menuItemName: o.MENU_ITEM_NAME as string,
            quantity: o.QUANTITY as number,
            price: o.PRICE as number,
          }

          if (orderMap.has(orderId)) {
            orderMap.get(orderId)!.items.push(item)
          } else {
            orderMap.set(orderId, {
              orderId,
              orderTs: o.ORDER_TS as string,
              city: o.PRIMARY_CITY as string,
              country: o.COUNTRY as string,
              brandName: o.TRUCK_BRAND_NAME as string,
              orderTotal: o.ORDER_TOTAL as number,
              items: [item],
              receivedAt: now,
            })
          }
        }

        const orders = [...orderMap.values()]
        addRecentOrders(orders)
        setLastPollTimestamp(orders[0].orderTs)

        // Trigger pop for each city with new orders
        const cities = [...new Set(orders.map((o) => o.city))]
        cities.forEach((city) => {
          addPoppingCity(city)
          setTimeout(() => removePoppingCity(city), 3000)
        })
      }
    } catch {
      // Silent fail, retries on next interval
    }
  }, [addRecentOrders, setLastPollTimestamp, addPoppingCity, removePoppingCity, expireRecentOrders])

  useEffect(() => {
    const interval = setInterval(poll, POLL_INTERVAL)
    return () => clearInterval(interval)
  }, [poll])
}
