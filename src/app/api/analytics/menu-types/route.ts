import { NextRequest, NextResponse } from 'next/server'
import { executeQuery } from '@/lib/snowflake'
import { withCache } from '@/lib/cache'

const DEMO_DATE = '2025-09-30'

interface MenuTypesRow {
  COUNTRY: string
  YEAR: number
  MENU_TYPE: string
  TOTAL_SALES: number
  TYPE_RANK: number
}

export async function GET(request: NextRequest) {
  const days = request.nextUrl.searchParams.get('days')

  try {
    const cacheKey = `menu-types:${days || 'all'}`
    const result = await withCache(cacheKey, async () => {
      if (days) {
        const rows = await executeQuery<MenuTypesRow>(`
          SELECT COUNTRY, YEAR(ORDER_TS_DATE) AS YEAR, MENU_TYPE,
            SUM(PRICE) AS TOTAL_SALES,
            ROW_NUMBER() OVER (PARTITION BY COUNTRY, YEAR(ORDER_TS_DATE) ORDER BY SUM(PRICE) DESC) AS TYPE_RANK
          FROM TAKEHOME_DB.HARMONIZED.POS_FLATTENED_V
          WHERE ORDER_TS_DATE >= DATEADD('day', -${parseInt(days)}, '${DEMO_DATE}'::DATE)
            AND ORDER_TS_DATE <= '${DEMO_DATE}'::DATE
          GROUP BY COUNTRY, YEAR(ORDER_TS_DATE), MENU_TYPE
          QUALIFY TYPE_RANK <= 3
          ORDER BY COUNTRY, YEAR, TYPE_RANK
        `)
        return { data: rows.map(row => ({
          country: row.COUNTRY, year: row.YEAR,
          menuType: row.MENU_TYPE, totalSales: row.TOTAL_SALES, typeRank: row.TYPE_RANK,
        })) }
      }

      const rows = await executeQuery<MenuTypesRow>(`
        SELECT COUNTRY, YEAR, MENU_TYPE, TOTAL_SALES, TYPE_RANK
        FROM TAKEHOME_DB.ANALYTICS.MENU_TYPES_DT
        WHERE TYPE_RANK <= 3
        ORDER BY COUNTRY, YEAR, TYPE_RANK
      `)
      return {
        data: rows.map(row => ({
          country: row.COUNTRY, year: row.YEAR,
          menuType: row.MENU_TYPE, totalSales: row.TOTAL_SALES, typeRank: row.TYPE_RANK,
        }))
      }
    })
    return NextResponse.json(result)
  } catch (error) {
    console.error('Failed to fetch menu types:', error)
    return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 })
  }
}
