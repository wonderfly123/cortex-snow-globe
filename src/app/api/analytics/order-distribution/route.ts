import { NextResponse } from 'next/server'
import { executeQuery } from '@/lib/snowflake'
import { withCache } from '@/lib/cache'

interface OrderDistributionRow {
  COUNTRY: string
  TOTAL_ORDERS: number
  TOTAL_SALES: number
  TRUCK_COUNT: number
}

export async function GET() {
  try {
    const result = await withCache('order-distribution', async () => {
      const rows = await executeQuery<OrderDistributionRow>(`
        SELECT COUNTRY,
          SUM(TOTAL_ORDERS) AS TOTAL_ORDERS,
          SUM(TOTAL_SALES) AS TOTAL_SALES,
          SUM(ACTIVE_TRUCKS) AS TRUCK_COUNT
        FROM TAKEHOME_DB.ANALYTICS.CITY_KPI_DT
        GROUP BY COUNTRY ORDER BY TOTAL_SALES DESC
      `)
      return {
        data: rows.map(row => ({
          country: row.COUNTRY,
          totalOrders: row.TOTAL_ORDERS,
          totalSales: row.TOTAL_SALES,
          truckCount: row.TRUCK_COUNT,
          revenuePerTruck: row.TRUCK_COUNT > 0 ? Math.round(row.TOTAL_SALES / row.TRUCK_COUNT) : 0,
        }))
      }
    })
    return NextResponse.json(result)
  } catch (error) {
    console.error('Failed to fetch order distribution:', error)
    return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 })
  }
}
