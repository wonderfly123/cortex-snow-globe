import { NextResponse } from 'next/server'
import { executeQuery } from '@/lib/snowflake'

interface OrderDistributionRow {
  COUNTRY: string
  TOTAL_ORDERS: number
  TOTAL_SALES: number
}

export async function GET() {
  try {
    const rows = await executeQuery<OrderDistributionRow>(`
      SELECT COUNTRY, SUM(TOTAL_ORDERS) AS TOTAL_ORDERS, SUM(TOTAL_SALES) AS TOTAL_SALES
      FROM TAKEHOME_DB.ANALYTICS.CITY_KPI_DT
      GROUP BY COUNTRY ORDER BY TOTAL_ORDERS DESC
    `)
    const data = rows.map(row => ({
      country: row.COUNTRY,
      totalOrders: row.TOTAL_ORDERS,
      totalSales: row.TOTAL_SALES,
    }))
    return NextResponse.json({ data })
  } catch (error) {
    console.error('Failed to fetch order distribution:', error)
    return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 })
  }
}
