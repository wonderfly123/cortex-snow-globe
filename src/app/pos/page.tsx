'use client'

import { useState, useEffect, useCallback } from 'react'

interface Truck {
  TRUCK_ID: number
  PRIMARY_CITY: string
  COUNTRY: string
  FRANCHISE_ID: number
}

interface MenuItem {
  MENU_ITEM_ID: number
  MENU_ITEM_NAME: string
  SALE_PRICE_USD: number
}

interface CartItem {
  menuItem: MenuItem
  quantity: number
}

export default function POSPage() {
  const [trucks, setTrucks] = useState<Truck[]>([])
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [selectedTruck, setSelectedTruck] = useState<Truck | null>(null)
  const [cart, setCart] = useState<CartItem[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [lastOrder, setLastOrder] = useState<{ orderId: number; total: number } | null>(null)
  const [orderCount, setOrderCount] = useState(0)

  useEffect(() => {
    fetch('/api/pos/config')
      .then((r) => r.json())
      .then((data) => {
        setTrucks(data.trucks || [])
        setMenuItems(data.menuItems || [])
        if (data.trucks?.length > 0) setSelectedTruck(data.trucks[0])
      })
      .catch(console.error)
  }, [])

  const addToCart = useCallback((item: MenuItem) => {
    setCart((prev) => {
      const existing = prev.find((c) => c.menuItem.MENU_ITEM_ID === item.MENU_ITEM_ID)
      if (existing) {
        return prev.map((c) =>
          c.menuItem.MENU_ITEM_ID === item.MENU_ITEM_ID
            ? { ...c, quantity: c.quantity + 1 }
            : c
        )
      }
      return [...prev, { menuItem: item, quantity: 1 }]
    })
  }, [])

  const removeFromCart = useCallback((menuItemId: number) => {
    setCart((prev) => {
      const existing = prev.find((c) => c.menuItem.MENU_ITEM_ID === menuItemId)
      if (existing && existing.quantity > 1) {
        return prev.map((c) =>
          c.menuItem.MENU_ITEM_ID === menuItemId ? { ...c, quantity: c.quantity - 1 } : c
        )
      }
      return prev.filter((c) => c.menuItem.MENU_ITEM_ID !== menuItemId)
    })
  }, [])

  const subtotal = cart.reduce((sum, c) => sum + c.menuItem.SALE_PRICE_USD * c.quantity, 0)
  const total = subtotal // Matching real data pattern: no tax in existing orders

  const submitOrder = useCallback(async () => {
    if (!selectedTruck || cart.length === 0) return
    setSubmitting(true)
    try {
      const res = await fetch('/api/pos/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          truckId: selectedTruck.TRUCK_ID,
          items: cart.map((c) => ({
            menuItemId: c.menuItem.MENU_ITEM_ID,
            menuItemName: c.menuItem.MENU_ITEM_NAME,
            quantity: c.quantity,
            unitPrice: c.menuItem.SALE_PRICE_USD,
          })),
        }),
      })
      const data = await res.json()
      if (data.success) {
        setLastOrder({ orderId: data.orderId, total: data.orderTotal })
        setOrderCount((c) => c + 1)
        setCart([])
      }
    } catch (err) {
      console.error('Order failed:', err)
    } finally {
      setSubmitting(false)
    }
  }, [selectedTruck, cart])

  return (
    <div className="min-h-screen bg-[#1a1a2e] text-white flex flex-col">
      {/* Header */}
      <header className="bg-[#0f0f23] border-b border-[#c0392b]/30 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="text-2xl font-bold">
            <span className="text-[#c0392b]">Kitakata</span>{' '}
            <span className="text-[#d4a017]">Ramen Bar</span>
          </div>
          <div className="text-xs text-slate-500 border-l border-slate-700 pl-4">POS Terminal</div>
        </div>
        <div className="flex items-center gap-4">
          {selectedTruck && (
            <div className="text-xs text-slate-400">
              Truck #{selectedTruck.TRUCK_ID} &middot; {selectedTruck.PRIMARY_CITY}, {selectedTruck.COUNTRY}
            </div>
          )}
          <div className="text-xs text-emerald-400 font-mono">
            Orders today: {orderCount}
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Left: Truck selector + Menu Grid */}
        <div className="flex-1 p-6 overflow-y-auto">
          <div className="mb-6">
            <label className="text-xs text-slate-400 uppercase tracking-wider mb-2 block">
              Select Truck Location
            </label>
            <select
              value={selectedTruck?.TRUCK_ID || ''}
              onChange={(e) => {
                const truck = trucks.find((t) => t.TRUCK_ID === Number(e.target.value))
                if (truck) setSelectedTruck(truck)
              }}
              className="bg-[#0f0f23] border border-slate-700 rounded-lg px-4 py-2 text-sm text-white w-full max-w-md focus:border-[#c0392b] focus:outline-none"
            >
              {trucks.map((t) => (
                <option key={t.TRUCK_ID} value={t.TRUCK_ID}>
                  #{t.TRUCK_ID} — {t.PRIMARY_CITY}, {t.COUNTRY}
                </option>
              ))}
            </select>
          </div>

          <h2 className="text-sm text-slate-400 uppercase tracking-wider mb-4">Menu</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {menuItems.map((item) => (
              <button
                key={item.MENU_ITEM_ID}
                onClick={() => addToCart(item)}
                className="bg-[#0f0f23] border border-slate-700/50 rounded-xl p-4 text-left
                  hover:border-[#c0392b]/50 hover:bg-[#c0392b]/5 transition-all group"
              >
                <div className="text-sm font-medium text-white group-hover:text-[#d4a017] transition-colors">
                  {item.MENU_ITEM_NAME}
                </div>
                <div className="text-lg font-bold text-[#d4a017] mt-2">
                  ${item.SALE_PRICE_USD.toFixed(2)}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Right: Cart */}
        <div className="w-[380px] bg-[#0f0f23] border-l border-slate-800 flex flex-col">
          <div className="p-6 flex-1 overflow-y-auto">
            <h2 className="text-sm text-slate-400 uppercase tracking-wider mb-4">Current Order</h2>

            {cart.length === 0 ? (
              <div className="text-sm text-slate-600 text-center py-12">
                Tap menu items to add to order
              </div>
            ) : (
              <div className="space-y-3">
                {cart.map((c) => (
                  <div
                    key={c.menuItem.MENU_ITEM_ID}
                    className="flex items-center justify-between bg-[#1a1a2e] rounded-lg p-3"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{c.menuItem.MENU_ITEM_NAME}</div>
                      <div className="text-xs text-slate-400">
                        ${c.menuItem.SALE_PRICE_USD.toFixed(2)} each
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-2">
                      <button
                        onClick={() => removeFromCart(c.menuItem.MENU_ITEM_ID)}
                        className="w-7 h-7 rounded-full bg-slate-800 text-slate-400 hover:bg-[#c0392b] hover:text-white transition-colors flex items-center justify-center text-sm"
                      >
                        -
                      </button>
                      <span className="text-sm font-mono w-6 text-center">{c.quantity}</span>
                      <button
                        onClick={() => addToCart(c.menuItem)}
                        className="w-7 h-7 rounded-full bg-slate-800 text-slate-400 hover:bg-emerald-600 hover:text-white transition-colors flex items-center justify-center text-sm"
                      >
                        +
                      </button>
                    </div>
                    <div className="text-sm font-bold text-[#d4a017] ml-3 w-16 text-right">
                      ${(c.menuItem.SALE_PRICE_USD * c.quantity).toFixed(2)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Totals + Submit */}
          <div className="border-t border-slate-800 p-6">
            <div className="flex justify-between text-white text-lg font-bold mb-4">
              <span>Total</span>
              <span className="text-[#d4a017]">${total.toFixed(2)}</span>
            </div>

            <button
              onClick={submitOrder}
              disabled={cart.length === 0 || submitting}
              className="w-full py-4 rounded-xl font-bold text-white text-lg transition-all
                bg-gradient-to-r from-[#c0392b] to-[#e74c3c]
                hover:from-[#e74c3c] hover:to-[#c0392b]
                disabled:opacity-30 disabled:cursor-not-allowed
                active:scale-[0.98]"
            >
              {submitting ? 'Submitting...' : `Place Order — $${total.toFixed(2)}`}
            </button>

            {lastOrder && (
              <div className="mt-4 bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3 text-center">
                <div className="text-xs text-emerald-400 font-semibold">Order Confirmed</div>
                <div className="text-[10px] text-slate-400 mt-1">
                  #{lastOrder.orderId} &middot; ${lastOrder.total.toFixed(2)}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
