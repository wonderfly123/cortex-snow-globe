import { NextResponse } from 'next/server'
import { executeQuery } from '@/lib/snowflake'
import { withCache } from '@/lib/cache'

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

export async function GET() {
  try {
    const result = await withCache('order-patterns', async () => {
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

      const monthlyData = monthly.map(row => {
        const d = new Date(row.MONTH)
        const month = isNaN(d.getTime())
          ? String(row.MONTH).replace(/"/g, '').slice(0, 7)
          : `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`
        return { month, totalOrders: row.TOTAL_ORDERS, totalSales: row.TOTAL_SALES }
      })

      const dowData = dow.map(row => ({
        dow: row.DOW,
        dowName: row.DOW_NAME,
        totalOrders: row.TOTAL_ORDERS,
        avgOrdersPerWeek: row.AVG_ORDERS_PER_WEEK,
      }))

      const hourlyData = hourly.map(row => ({
        hour: row.HOUR,
        totalOrders: row.TOTAL_ORDERS,
      }))

      return { data: monthlyData, dowData, hourlyData }
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('Failed to fetch order patterns:', error)
    return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 })
  }
}
