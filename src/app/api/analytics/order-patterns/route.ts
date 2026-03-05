import { NextResponse } from 'next/server'
import { executeQuery } from '@/lib/snowflake'

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
    const [monthly, dow, hourly] = await Promise.all([
      executeQuery<MonthlyRow>(`
        SELECT MONTH, SUM(ORDERS) AS TOTAL_ORDERS, SUM(SALES) AS TOTAL_SALES
        FROM TAKEHOME_DB.ANALYTICS.MONTHLY_TREND_DT
        GROUP BY MONTH ORDER BY MONTH
      `),
      executeQuery<DayOfWeekRow>(`
        SELECT DAYOFWEEK(ORDER_TS_DATE) AS DOW,
          DAYNAME(ORDER_TS_DATE) AS DOW_NAME,
          COUNT(DISTINCT ORDER_ID) AS TOTAL_ORDERS,
          COUNT(DISTINCT ORDER_ID) / NULLIF(COUNT(DISTINCT DATE_TRUNC('WEEK', ORDER_TS_DATE)), 0) AS AVG_ORDERS_PER_WEEK
        FROM TAKEHOME_DB.HARMONIZED.POS_FLATTENED_V
        GROUP BY 1, 2 ORDER BY DOW
      `),
      executeQuery<HourRow>(`
        SELECT HOUR(ORDER_TS) AS HOUR,
          COUNT(DISTINCT ORDER_ID) AS TOTAL_ORDERS
        FROM TAKEHOME_DB.HARMONIZED.POS_FLATTENED_V
        GROUP BY 1 ORDER BY 1
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

    return NextResponse.json({ data: monthlyData, dowData, hourlyData })
  } catch (error) {
    console.error('Failed to fetch order patterns:', error)
    return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 })
  }
}
