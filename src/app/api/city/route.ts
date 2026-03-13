import { NextResponse } from 'next/server'
import { executeQuery } from '@/lib/snowflake'
import { withCache } from '@/lib/cache'

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

function buildResponse(kpiRows: CityKPIRow[], trendRows: MonthlyTrendRow[], topItemsRows: TopItemRow[]) {
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
    month: String(row.MONTH).replace(/"/g, ''),
    orders: row.ORDERS,
    sales: row.SALES,
  }))

  const topItems = topItemsRows.map(row => ({
    name: row.MENU_ITEM_NAME,
    quantity: row.TOTAL_QUANTITY,
    revenue: row.TOTAL_REVENUE,
    rank: row.ITEM_RANK,
  }))

  return { kpi, trend, topItems }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const cityName = searchParams.get('name')
  const country = searchParams.get('country')
  const days = searchParams.get('days') // null = all time, or 1/7/30/60/90

  if (!cityName) {
    return NextResponse.json(
      { error: 'City name is required' },
      { status: 400 }
    )
  }

  const DEMO_DATE = '2025-09-30'

  try {
    const cacheKey = `city:${cityName}:${country || ''}:${days || 'all'}`
    const result = await withCache(cacheKey, async () => {
      // For timeframe-filtered queries, use the flattened view with date filters
      if (days) {
        const cityFilter = country
          ? 'PRIMARY_CITY = ? AND COUNTRY = ?'
          : 'PRIMARY_CITY = ?'
        const dateFilter = `ORDER_TS_DATE >= DATEADD('day', -${parseInt(days)}, '${DEMO_DATE}'::DATE) AND ORDER_TS_DATE <= '${DEMO_DATE}'::DATE`
        const baseParams = country ? [cityName, country] : [cityName]

        const [kpiRows, trendRows, topItemsRows] = await Promise.all([
          executeQuery<CityKPIRow>(`
            SELECT
              PRIMARY_CITY AS CITY, COUNTRY,
              COUNT(DISTINCT ORDER_ID) AS TOTAL_ORDERS,
              SUM(PRICE) AS TOTAL_SALES,
              ROUND(AVG(ORDER_TOTAL), 2) AS AVG_ORDER_VALUE,
              COUNT(DISTINCT TRUCK_ID) AS ACTIVE_TRUCKS,
              COUNT(DISTINCT MENU_ITEM_NAME) AS UNIQUE_ITEMS_SOLD
            FROM TAKEHOME_DB.HARMONIZED.POS_FLATTENED_V
            WHERE ${cityFilter} AND ${dateFilter}
            GROUP BY PRIMARY_CITY, COUNTRY
          `, baseParams),
          executeQuery<MonthlyTrendRow>(`
            SELECT
              DATE_TRUNC('day', ORDER_TS_DATE) AS MONTH,
              COUNT(DISTINCT ORDER_ID) AS ORDERS,
              SUM(PRICE) AS SALES
            FROM TAKEHOME_DB.HARMONIZED.POS_FLATTENED_V
            WHERE ${cityFilter} AND ${dateFilter}
            GROUP BY MONTH ORDER BY MONTH
          `, baseParams),
          executeQuery<TopItemRow>(`
            SELECT
              MENU_ITEM_NAME,
              SUM(QUANTITY) AS TOTAL_QUANTITY,
              SUM(PRICE) AS TOTAL_REVENUE,
              ROW_NUMBER() OVER (ORDER BY SUM(PRICE) DESC) AS ITEM_RANK
            FROM TAKEHOME_DB.HARMONIZED.POS_FLATTENED_V
            WHERE ${cityFilter} AND ${dateFilter}
            GROUP BY MENU_ITEM_NAME
            ORDER BY TOTAL_REVENUE DESC
            LIMIT 5
          `, baseParams),
        ])

        return buildResponse(kpiRows, trendRows, topItemsRows)
      }

      // All-time: use pre-aggregated DTs
      const [kpiRows, trendRows, topItemsRows] = await Promise.all([
        executeQuery<CityKPIRow>(`
          SELECT
            CITY, COUNTRY, TOTAL_ORDERS, TOTAL_SALES,
            AVG_ORDER_VALUE, ACTIVE_TRUCKS, UNIQUE_ITEMS_SOLD
          FROM TAKEHOME_DB.ANALYTICS.CITY_KPI_DT
          WHERE CITY = ?
          ${country ? 'AND COUNTRY = ?' : ''}
        `, country ? [cityName, country] : [cityName]),
        executeQuery<MonthlyTrendRow>(`
          SELECT MONTH, ORDERS, SALES
          FROM TAKEHOME_DB.ANALYTICS.MONTHLY_TREND_DT
          WHERE CITY = ?
          ${country ? 'AND COUNTRY = ?' : ''}
          ORDER BY MONTH
        `, country ? [cityName, country] : [cityName]),
        executeQuery<TopItemRow>(`
          SELECT MENU_ITEM_NAME, TOTAL_QUANTITY, TOTAL_REVENUE, ITEM_RANK
          FROM TAKEHOME_DB.ANALYTICS.TOP_ITEMS_DT
          WHERE CITY = ?
          ${country ? 'AND COUNTRY = ?' : ''}
          ORDER BY ITEM_RANK
          LIMIT 5
        `, country ? [cityName, country] : [cityName]),
      ])

      return buildResponse(kpiRows, trendRows, topItemsRows)
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('Failed to fetch city data:', error)
    return NextResponse.json(
      { error: 'Failed to fetch city data' },
      { status: 500 }
    )
  }
}
