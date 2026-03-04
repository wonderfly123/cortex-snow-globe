import { NextResponse } from 'next/server'
import { executeQuery } from '@/lib/snowflake'

interface CityKPIRow {
  CITY: string
  COUNTRY: string
  TOTAL_ORDERS: number
  TOTAL_SALES: number
  AVG_ORDER_VALUE: number
  ACTIVE_TRUCKS: number
  UNIQUE_ITEMS_SOLD: number
}

interface MonthlyTrendRow {
  MONTH: string
  ORDERS: number
  SALES: number
}

interface TopItemRow {
  MENU_ITEM_NAME: string
  TOTAL_QUANTITY: number
  TOTAL_REVENUE: number
  ITEM_RANK: number
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const cityName = searchParams.get('name')
  const country = searchParams.get('country')
  
  if (!cityName) {
    return NextResponse.json(
      { error: 'City name is required' },
      { status: 400 }
    )
  }

  try {
    // Fetch KPIs
    const kpiRows = await executeQuery<CityKPIRow>(`
      SELECT 
        CITY, COUNTRY, TOTAL_ORDERS, TOTAL_SALES, 
        AVG_ORDER_VALUE, ACTIVE_TRUCKS, UNIQUE_ITEMS_SOLD
      FROM TAKEHOME_DB.ANALYTICS.CITY_KPI_DT
      WHERE CITY = ?
      ${country ? 'AND COUNTRY = ?' : ''}
    `, country ? [cityName, country] : [cityName])
    
    // Fetch monthly trend
    const trendRows = await executeQuery<MonthlyTrendRow>(`
      SELECT MONTH, ORDERS, SALES
      FROM TAKEHOME_DB.ANALYTICS.MONTHLY_TREND_DT
      WHERE CITY = ?
      ${country ? 'AND COUNTRY = ?' : ''}
      ORDER BY MONTH
    `, country ? [cityName, country] : [cityName])
    
    // Fetch top items
    const topItemsRows = await executeQuery<TopItemRow>(`
      SELECT MENU_ITEM_NAME, TOTAL_QUANTITY, TOTAL_REVENUE, ITEM_RANK
      FROM TAKEHOME_DB.ANALYTICS.TOP_ITEMS_DT
      WHERE CITY = ?
      ${country ? 'AND COUNTRY = ?' : ''}
      ORDER BY ITEM_RANK
      LIMIT 5
    `, country ? [cityName, country] : [cityName])

    // Format response
    const kpi = kpiRows[0] ? {
      city: kpiRows[0].CITY,
      country: kpiRows[0].COUNTRY,
      totalOrders: kpiRows[0].TOTAL_ORDERS,
      totalSales: kpiRows[0].TOTAL_SALES,
      avgOrderValue: kpiRows[0].AVG_ORDER_VALUE,
      activeTrucks: kpiRows[0].ACTIVE_TRUCKS,
      uniqueItemsSold: kpiRows[0].UNIQUE_ITEMS_SOLD,
    } : null

    const trend = trendRows.map(row => ({
      month: String(row.MONTH).replace(/"/g, ''),  // Convert to string and clean up
      orders: row.ORDERS,
      sales: row.SALES,
    }))

    const topItems = topItemsRows.map(row => ({
      name: row.MENU_ITEM_NAME,
      quantity: row.TOTAL_QUANTITY,
      revenue: row.TOTAL_REVENUE,
      rank: row.ITEM_RANK,
    }))

    return NextResponse.json({ kpi, trend, topItems })
  } catch (error) {
    console.error('Failed to fetch city data:', error)
    return NextResponse.json(
      { error: 'Failed to fetch city data' },
      { status: 500 }
    )
  }
}
