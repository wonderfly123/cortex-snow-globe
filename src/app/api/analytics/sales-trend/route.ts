import { NextResponse } from 'next/server'
import { executeQuery } from '@/lib/snowflake'

interface SalesTrendRow {
  MONTH: string
  COUNTRY: string
  TOTAL_SALES: number
  TOTAL_ORDERS: number
}

export async function GET() {
  try {
    const rows = await executeQuery<SalesTrendRow>(`
      SELECT MONTH, COUNTRY, SUM(SALES) AS TOTAL_SALES, SUM(ORDERS) AS TOTAL_ORDERS
      FROM TAKEHOME_DB.ANALYTICS.MONTHLY_TREND_DT
      GROUP BY MONTH, COUNTRY ORDER BY MONTH, COUNTRY
    `)
    const data = rows.map(row => {
      const d = new Date(row.MONTH)
      const month = isNaN(d.getTime())
        ? String(row.MONTH).replace(/"/g, '').slice(0, 7)
        : `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`
      return {
        month,
        country: row.COUNTRY,
        totalSales: row.TOTAL_SALES,
        totalOrders: row.TOTAL_ORDERS,
      }
    })
    return NextResponse.json({ data })
  } catch (error) {
    console.error('Failed to fetch sales trend:', error)
    return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 })
  }
}
