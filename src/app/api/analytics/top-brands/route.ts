import { NextResponse } from 'next/server'
import { executeQuery } from '@/lib/snowflake'

interface TopBrandsRow {
  YEAR: number
  TRUCK_BRAND_NAME: string
  TOTAL_SALES: number
  TOTAL_ORDERS: number
  BRAND_RANK: number
  COUNTRY: string | null
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const country = searchParams.get('country')

    let query: string
    if (country) {
      query = `
        SELECT YEAR(ORDER_TS_DATE) AS YEAR, TRUCK_BRAND_NAME, COUNTRY,
          SUM(PRICE) AS TOTAL_SALES, COUNT(DISTINCT ORDER_ID) AS TOTAL_ORDERS,
          RANK() OVER (PARTITION BY YEAR(ORDER_TS_DATE) ORDER BY SUM(PRICE) DESC) AS BRAND_RANK
        FROM TAKEHOME_DB.HARMONIZED.POS_FLATTENED_V
        WHERE COUNTRY = ?
        GROUP BY 1, 2, 3 QUALIFY BRAND_RANK <= 5 ORDER BY YEAR, BRAND_RANK
      `
    } else {
      query = `
        SELECT YEAR(ORDER_TS_DATE) AS YEAR, TRUCK_BRAND_NAME, NULL AS COUNTRY,
          SUM(PRICE) AS TOTAL_SALES, COUNT(DISTINCT ORDER_ID) AS TOTAL_ORDERS,
          RANK() OVER (PARTITION BY YEAR(ORDER_TS_DATE) ORDER BY SUM(PRICE) DESC) AS BRAND_RANK
        FROM TAKEHOME_DB.HARMONIZED.POS_FLATTENED_V
        GROUP BY 1, 2 QUALIFY BRAND_RANK <= 5 ORDER BY YEAR, BRAND_RANK
      `
    }

    const rows = await executeQuery<TopBrandsRow>(query, country ? [country] : undefined)
    const data = rows.map(row => ({
      year: row.YEAR,
      brand: row.TRUCK_BRAND_NAME,
      totalSales: row.TOTAL_SALES,
      totalOrders: row.TOTAL_ORDERS,
      brandRank: row.BRAND_RANK,
      country: row.COUNTRY,
    }))
    return NextResponse.json({ data })
  } catch (error) {
    console.error('Failed to fetch top brands:', error)
    return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 })
  }
}
