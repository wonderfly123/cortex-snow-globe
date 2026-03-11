// src/app/api/pos/config/route.ts
import { NextResponse } from 'next/server'
import { executeQuery } from '@/lib/snowflake'
import { withCache } from '@/lib/cache'

interface TruckRow {
  TRUCK_ID: number
  PRIMARY_CITY: string
  COUNTRY: string
  FRANCHISE_ID: number
}

interface MenuItemRow {
  MENU_ITEM_ID: number
  MENU_ITEM_NAME: string
  SALE_PRICE_USD: number
}

export async function GET() {
  try {
    const result = await withCache('pos-config', async () => {
      const [trucks, menuItems] = await Promise.all([
        executeQuery<TruckRow>(`
          SELECT DISTINCT t.TRUCK_ID, t.PRIMARY_CITY, t.COUNTRY, t.FRANCHISE_ID
          FROM RAW.TRUCK t
          WHERE t.MENU_TYPE_ID = 5
          ORDER BY t.PRIMARY_CITY
        `),
        executeQuery<MenuItemRow>(`
          SELECT DISTINCT MENU_ITEM_ID, MENU_ITEM_NAME, SALE_PRICE_USD
          FROM RAW.MENU
          WHERE MENU_TYPE_ID = 5 AND TRUCK_BRAND_NAME = 'Kitakata Ramen Bar'
          ORDER BY SALE_PRICE_USD DESC, MENU_ITEM_NAME
        `),
      ])
      return { trucks, menuItems }
    })

    return NextResponse.json(result)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
