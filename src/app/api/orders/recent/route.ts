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

export async function GET(request: NextRequest) {
  const since = request.nextUrl.searchParams.get('since')

  try {
    const rows = await executeQuery<RecentOrderRow>(
      since
        ? `SELECT DISTINCT
            ORDER_ID, ORDER_TS, PRIMARY_CITY, COUNTRY,
            MENU_ITEM_NAME, TRUCK_BRAND_NAME, QUANTITY, PRICE, ORDER_TOTAL
          FROM RAW.RECENT_POS_ORDERS
          WHERE ORDER_TS >?
          ORDER BY ORDER_TS DESC
          LIMIT 50`
        : `SELECT DISTINCT
            ORDER_ID, ORDER_TS, PRIMARY_CITY, COUNTRY,
            MENU_ITEM_NAME, TRUCK_BRAND_NAME, QUANTITY, PRICE, ORDER_TOTAL
          FROM RAW.RECENT_POS_ORDERS
          WHERE ORDER_TS >DATEADD('second', -30, CURRENT_TIMESTAMP())
          ORDER BY ORDER_TS DESC
          LIMIT 50`,
      since ? [since] : undefined
    )

    return NextResponse.json({ orders: rows })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
