import { NextRequest, NextResponse } from 'next/server'
import { executeQuery } from '@/lib/snowflake'
import { withCache } from '@/lib/cache'

const DEMO_DATE = '2025-09-30'

interface MonthlyRow {
  MONTH: string
  TOTAL_ORDERS: number
  TOTAL_SALES: number
}

interface DayOfWeekRow {
  DOW: number
  DOW_NAME: string
  TOTAL_ORDERS: number
  AVG_ORDERS_PER_WEEK: number
}

interface HourRow {
  HOUR: number
  TOTAL_ORDERS: number
}

function formatMonth(row: MonthlyRow) {
  const d = new Date(row.MONTH)
  const month = isNaN(d.getTime())
    ? String(row.MONTH).replace(/"/g, '').slice(0, 7)
    : `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`
  return { month, totalOrders: row.TOTAL_ORDERS, totalSales: row.TOTAL_SALES }
}

export async function GET(request: NextRequest) {
  const days = request.nextUrl.searchParams.get('days')

  try {
    const cacheKey = `order-patterns:${days || 'all'}`
    const result = await withCache(cacheKey, async () => {
      if (days) {
        const dateFilter = `ORDER_TS_DATE >= DATEADD('day', -${parseInt(days)}, '${DEMO_DATE}'::DATE) AND ORDER_TS_DATE <= '${DEMO_DATE}'::DATE`
        const granularity = 'day'
        const [monthly, dow, hourly] = await Promise.all([
          executeQuery<MonthlyRow>(`
            SELECT DATE_TRUNC('${granularity}', ORDER_TS_DATE) AS MONTH,
              COUNT(DISTINCT ORDER_ID) AS TOTAL_ORDERS,
              SUM(PRICE) AS TOTAL_SALES
            FROM TAKEHOME_DB.HARMONIZED.POS_FLATTENED_V
            WHERE ${dateFilter}
            GROUP BY MONTH ORDER BY MONTH
          `),
          executeQuery<DayOfWeekRow>(`
            SELECT DAYOFWEEK(ORDER_TS_DATE) AS DOW,
              DAYNAME(ORDER_TS_DATE) AS DOW_NAME,
              COUNT(DISTINCT ORDER_ID) AS TOTAL_ORDERS,
              ROUND(COUNT(DISTINCT ORDER_ID) / GREATEST(DATEDIFF('week', MIN(ORDER_TS_DATE), MAX(ORDER_TS_DATE)), 1)) AS AVG_ORDERS_PER_WEEK
            FROM TAKEHOME_DB.HARMONIZED.POS_FLATTENED_V
            WHERE ${dateFilter}
            GROUP BY DOW, DOW_NAME ORDER BY DOW
          `),
          executeQuery<HourRow>(`
            SELECT HOUR(ORDER_TS) AS HOUR,
              COUNT(DISTINCT ORDER_ID) AS TOTAL_ORDERS
            FROM TAKEHOME_DB.HARMONIZED.POS_FLATTENED_V
            WHERE ${dateFilter}
            GROUP BY HOUR ORDER BY HOUR
          `),
        ])

        return {
          data: monthly.map(formatMonth),
          dowData: dow.map(row => ({
            dow: row.DOW, dowName: row.DOW_NAME,
            totalOrders: row.TOTAL_ORDERS, avgOrdersPerWeek: row.AVG_ORDERS_PER_WEEK,
          })),
          hourlyData: hourly.map(row => ({
            hour: row.HOUR, totalOrders: row.TOTAL_ORDERS,
          })),
        }
      }

      const [monthly, dow, hourly] = await Promise.all([
        executeQuery<MonthlyRow>(`
          SELECT MONTH, SUM(ORDERS) AS TOTAL_ORDERS, SUM(SALES) AS TOTAL_SALES
          FROM TAKEHOME_DB.ANALYTICS.MONTHLY_TREND_DT
          GROUP BY MONTH ORDER BY MONTH
        `),
        executeQuery<DayOfWeekRow>(`
          SELECT DOW, DOW_NAME, TOTAL_ORDERS, AVG_ORDERS_PER_WEEK
          FROM TAKEHOME_DB.ANALYTICS.ORDER_PATTERNS_DOW_DT
          ORDER BY DOW
        `),
        executeQuery<HourRow>(`
          SELECT HOUR, TOTAL_ORDERS
          FROM TAKEHOME_DB.ANALYTICS.ORDER_PATTERNS_HOUR_DT
          ORDER BY HOUR
        `),
      ])

      return {
        data: monthly.map(formatMonth),
        dowData: dow.map(row => ({
          dow: row.DOW, dowName: row.DOW_NAME,
          totalOrders: row.TOTAL_ORDERS, avgOrdersPerWeek: row.AVG_ORDERS_PER_WEEK,
        })),
        hourlyData: hourly.map(row => ({
          hour: row.HOUR, totalOrders: row.TOTAL_ORDERS,
        })),
      }
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('Failed to fetch order patterns:', error)
    return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 })
  }
}
