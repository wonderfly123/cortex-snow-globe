import { NextResponse } from 'next/server'
import { executeQuery } from '@/lib/snowflake'
import { withCache } from '@/lib/cache'

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
    const cacheKey = `top-brands:${country || 'all'}`

    const result = await withCache(cacheKey, async () => {
      let query: string
      if (country) {
        query = `
          SELECT YEAR, TRUCK_BRAND_NAME, COUNTRY,
            TOTAL_SALES, TOTAL_ORDERS,
            BRAND_RANK_BY_COUNTRY AS BRAND_RANK
          FROM TAKEHOME_DB.ANALYTICS.TOP_BRANDS_DT
          WHERE COUNTRY = ? AND BRAND_RANK_BY_COUNTRY <= 5
          ORDER BY YEAR, BRAND_RANK
        `
      } else {
        query = `
          SELECT YEAR, TRUCK_BRAND_NAME, NULL AS COUNTRY,
            TOTAL_SALES, TOTAL_ORDERS,
            BRAND_RANK_GLOBAL AS BRAND_RANK
          FROM TAKEHOME_DB.ANALYTICS.TOP_BRANDS_DT
          WHERE BRAND_RANK_GLOBAL <= 5
          ORDER BY YEAR, BRAND_RANK
        `
      }

      const rows = await executeQuery<TopBrandsRow>(query, country ? [country] : undefined)
      return {
        data: rows.map(row => ({
          year: row.YEAR,
          brand: row.TRUCK_BRAND_NAME,
          totalSales: row.TOTAL_SALES,
          totalOrders: row.TOTAL_ORDERS,
          brandRank: row.BRAND_RANK,
          country: row.COUNTRY,
        }))
      }
    })
    return NextResponse.json(result)
  } catch (error) {
    console.error('Failed to fetch top brands:', error)
    return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 })
  }
}
