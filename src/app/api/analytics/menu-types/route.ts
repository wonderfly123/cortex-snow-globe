import { NextResponse } from 'next/server'
import { executeQuery } from '@/lib/snowflake'
import { withCache } from '@/lib/cache'

interface MenuTypesRow {
  COUNTRY: string
  YEAR: number
  MENU_TYPE: string
  TOTAL_SALES: number
  TYPE_RANK: number
}

export async function GET() {
  try {
    const result = await withCache('menu-types', async () => {
      const rows = await executeQuery<MenuTypesRow>(`
        SELECT COUNTRY, YEAR, MENU_TYPE, TOTAL_SALES, TYPE_RANK
        FROM TAKEHOME_DB.ANALYTICS.MENU_TYPES_DT
        WHERE TYPE_RANK <= 3
        ORDER BY COUNTRY, YEAR, TYPE_RANK
      `)
      return {
        data: rows.map(row => ({
          country: row.COUNTRY,
          year: row.YEAR,
          menuType: row.MENU_TYPE,
          totalSales: row.TOTAL_SALES,
          typeRank: row.TYPE_RANK,
        }))
      }
    })
    return NextResponse.json(result)
  } catch (error) {
    console.error('Failed to fetch menu types:', error)
    return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 })
  }
}
