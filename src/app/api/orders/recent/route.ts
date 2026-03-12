// src/app/api/orders/recent/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { executeQuery } from '@/lib/snowflake'

interface RecentOrderRow {
  ORDER_ID: number
  ORDER_TS: string
  PRIMARY_CITY: string
  COUNTRY: string
  MENU_ITEM_NAME: string
  TRUCK_BRAND_NAME: string
  QUANTITY: number
  PRICE: number
  ORDER_TOTAL: number
}

// Cache recent orders for 10 seconds to avoid hammering Snowflake
let cachedOrders: { rows: RecentOrderRow[]; timestamp: number } | null = null
const CACHE_TTL = 10_000

export async function GET(request: NextRequest) {
  const since = request.nextUrl.searchParams.get('since')

  try {
    // For non-since requests, use cache
    if (!since && cachedOrders && Date.now() - cachedOrders.timestamp < CACHE_TTL) {
      return NextResponse.json({ orders: cachedOrders.rows })
    }

    const rows = await executeQuery<RecentOrderRow>(
      since
        ? `SELECT DISTINCT
            ORDER_ID, ORDER_TS, PRIMARY_CITY, COUNTRY,
            MENU_ITEM_NAME, TRUCK_BRAND_NAME, QUANTITY, PRICE, ORDER_TOTAL
          FROM RAW.RECENT_POS_ORDERS
          WHERE ORDER_TS > ?
          ORDER BY ORDER_TS DESC
          LIMIT 50`
        : `SELECT DISTINCT
            ORDER_ID, ORDER_TS, PRIMARY_CITY, COUNTRY,
            MENU_ITEM_NAME, TRUCK_BRAND_NAME, QUANTITY, PRICE, ORDER_TOTAL
          FROM RAW.RECENT_POS_ORDERS
          WHERE ORDER_TS > DATEADD('second', -30, CURRENT_TIMESTAMP())
          ORDER BY ORDER_TS DESC
          LIMIT 50`,
      since ? [since] : undefined
    )

    if (!since) {
      cachedOrders = { rows, timestamp: Date.now() }
    }

    return NextResponse.json({ orders: rows })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
