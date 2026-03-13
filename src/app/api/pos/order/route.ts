// src/app/api/pos/order/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { executeQuery } from '@/lib/snowflake'

interface OrderItem {
  menuItemId: number
  menuItemName: string
  quantity: number
  unitPrice: number
}

interface OrderPayload {
  truckId: number
  items: OrderItem[]
}

export async function POST(request: NextRequest) {
  try {
    const body: OrderPayload = await request.json()
    const { truckId, items } = body

    if (!truckId || !items || items.length === 0) {
      return NextResponse.json({ error: 'Missing truckId or items' }, { status: 400 })
    }

    // Get next ORDER_ID from sequence
    const [{ NEXTVAL: orderId }] = await executeQuery<{ NEXTVAL: number }>(
      `SELECT RAW.ORDER_ID_SEQ.NEXTVAL AS NEXTVAL`
    )

    // Calculate totals (matching existing data patterns)
    const orderAmount = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0)
    // Real data has NULL tax/discount — match that pattern
    const orderTotal = orderAmount

    // Get truck details for denormalized inserts
    interface TruckDetail {
      TRUCK_ID: number
      PRIMARY_CITY: string
      REGION: string
      COUNTRY: string
      FRANCHISE_FLAG: number
      FRANCHISE_ID: number
    }
    const [truck] = await executeQuery<TruckDetail>(
      `SELECT TRUCK_ID, PRIMARY_CITY, REGION, COUNTRY, FRANCHISE_FLAG, FRANCHISE_ID
       FROM RAW.TRUCK WHERE TRUCK_ID = ?`,
      [truckId]
    )

    // Get franchisee name
    let franchiseeName = ''
    if (truck.FRANCHISE_ID) {
      const franchise = await executeQuery<{ FIRST_NAME: string; LAST_NAME: string }>(
        `SELECT FIRST_NAME, LAST_NAME FROM RAW.FRANCHISE
         WHERE FRANCHISE_ID = ? LIMIT 1`,
        [truck.FRANCHISE_ID]
      )
      if (franchise.length > 0) {
        franchiseeName = `${franchise[0].FIRST_NAME} ${franchise[0].LAST_NAME}`
      }
    }

    // Get a valid LOCATION_ID for this truck
    const locations = await executeQuery<{ LOCATION_ID: number }>(
      `SELECT LOCATION_ID FROM RAW.ORDER_HEADER WHERE TRUCK_ID = ? LIMIT 1`,
      [truckId]
    )
    const locationId = locations.length > 0 ? locations[0].LOCATION_ID : 1

    // Get the latest ORDER_TS so new orders always come after it
    const [{ MAX_TS: maxTs }] = await executeQuery<{ MAX_TS: string }>(
      `SELECT COALESCE(MAX(ORDER_TS), '2025-09-30 18:00:00'::TIMESTAMP) AS MAX_TS FROM RAW.RECENT_POS_ORDERS`
    )

    // INSERT ORDER_HEADER
    // ORDER_TAX_AMOUNT and ORDER_DISCOUNT_AMOUNT are TEXT columns, NULL in real data
    await executeQuery(
      `INSERT INTO RAW.ORDER_HEADER (
        ORDER_ID, TRUCK_ID, LOCATION_ID, ORDER_TS,
        ORDER_AMOUNT, ORDER_TAX_AMOUNT, ORDER_DISCOUNT_AMOUNT, ORDER_TOTAL
      ) SELECT ?, ?, ?, DATEADD('second', UNIFORM(1, 30, RANDOM()), ?::TIMESTAMP), ?, NULL, NULL, ?`,
      [orderId, truckId, locationId, maxTs, orderAmount, orderTotal]
    )

    // INSERT ORDER_DETAIL rows (LINE_NUMBER starts at 0)
    for (let i = 0; i < items.length; i++) {
      const item = items[i]
      const [{ NEXTVAL: detailId }] = await executeQuery<{ NEXTVAL: number }>(
        `SELECT RAW.ORDER_DETAIL_ID_SEQ.NEXTVAL AS NEXTVAL`
      )
      const linePrice = item.unitPrice * item.quantity

      await executeQuery(
        `INSERT INTO RAW.ORDER_DETAIL (
          ORDER_DETAIL_ID, ORDER_ID, MENU_ITEM_ID, LINE_NUMBER,
          QUANTITY, UNIT_PRICE, PRICE
        ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [detailId, orderId, item.menuItemId, i, item.quantity, item.unitPrice, linePrice]
      )

      // Also write to RECENT_POS_ORDERS for instant globe polling
      await executeQuery(
        `INSERT INTO RAW.RECENT_POS_ORDERS (
          ORDER_ID, TRUCK_ID, ORDER_TS, ORDER_TS_DATE, ORDER_YEAR, ORDER_MONTH,
          ORDER_DETAIL_ID, LINE_NUMBER, TRUCK_BRAND_NAME, MENU_TYPE,
          PRIMARY_CITY, REGION, COUNTRY, FRANCHISE_FLAG, FRANCHISE_ID,
          FRANCHISEE_NAME, LOCATION_ID, MENU_ITEM_ID, MENU_ITEM_NAME,
          QUANTITY, UNIT_PRICE, PRICE, ORDER_AMOUNT,
          ORDER_TAX_AMOUNT, ORDER_DISCOUNT_AMOUNT, ORDER_TOTAL
        ) SELECT ?, ?, DATEADD('second', UNIFORM(1, 30, RANDOM()), ?::TIMESTAMP), '2025-09-30'::DATE,
          2025, 9,
          ?, ?, 'Kitakata Ramen Bar', 'Ramen',
          ?, ?, ?, ?, ?,
          ?, ?, ?, ?,
          ?, ?, ?, ?,
          NULL, NULL, ?`,
        [
          orderId, truckId, maxTs,
          detailId, i,
          truck.PRIMARY_CITY, truck.REGION, truck.COUNTRY, truck.FRANCHISE_FLAG, truck.FRANCHISE_ID,
          franchiseeName, locationId, item.menuItemId, item.menuItemName,
          item.quantity, item.unitPrice, linePrice, orderAmount,
          orderTotal
        ]
      )
    }

    return NextResponse.json({
      success: true,
      orderId,
      orderTotal,
      itemCount: items.length,
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('Order submission error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
