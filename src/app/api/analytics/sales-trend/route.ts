import { NextRequest, NextResponse } from 'next/server'
import { executeQuery } from '@/lib/snowflake'
import { withCache } from '@/lib/cache'

const DEMO_DATE = '2025-09-30'

interface SalesTrendRow {
  MONTH: string
  COUNTRY: string
  TOTAL_SALES: number
  TOTAL_ORDERS: number
}

function formatRows(rows: SalesTrendRow[], daily = false) {
  return rows.map(row => {
    const d = new Date(row.MONTH)
    let month: string
    if (isNaN(d.getTime())) {
      month = String(row.MONTH).replace(/"/g, '').slice(0, daily ? 10 : 7)
    } else if (daily) {
      month = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`
    } else {
      month = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`
    }
    return {
      month,
      country: row.COUNTRY,
      totalSales: row.TOTAL_SALES,
      totalOrders: row.TOTAL_ORDERS,
    }
  })
}

export async function GET(request: NextRequest) {
  const days = request.nextUrl.searchParams.get('days')

  try {
    const cacheKey = `sales-trend:${days || 'all'}`
    const result = await withCache(cacheKey, async () => {
      if (days) {
        const granularity = 'day'
        const rows = await executeQuery<SalesTrendRow>(`
          SELECT DATE_TRUNC('${granularity}', ORDER_TS_DATE) AS MONTH,
            COUNTRY, SUM(PRICE) AS TOTAL_SALES,
            COUNT(DISTINCT ORDER_ID) AS TOTAL_ORDERS
          FROM TAKEHOME_DB.HARMONIZED.POS_FLATTENED_V
          WHERE ORDER_TS_DATE >= DATEADD('day', -${parseInt(days)}, '${DEMO_DATE}'::DATE)
            AND ORDER_TS_DATE <= '${DEMO_DATE}'::DATE
          GROUP BY MONTH, COUNTRY ORDER BY MONTH, COUNTRY
        `)
        return { data: formatRows(rows, true) }
      }

      const rows = await executeQuery<SalesTrendRow>(`
        SELECT MONTH, COUNTRY, SUM(SALES) AS TOTAL_SALES, SUM(ORDERS) AS TOTAL_ORDERS
        FROM TAKEHOME_DB.ANALYTICS.MONTHLY_TREND_DT
        GROUP BY MONTH, COUNTRY ORDER BY MONTH, COUNTRY
      `)
      return { data: formatRows(rows, false) }
    })
    return NextResponse.json(result)
  } catch (error) {
    console.error('Failed to fetch sales trend:', error)
    return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 })
  }
}
