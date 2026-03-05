import { NextResponse } from 'next/server'
import { executeQuery } from '@/lib/snowflake'

interface MenuTypesRow {
  COUNTRY: string
  MENU_TYPE: string
  TOTAL_SALES: number
  TYPE_RANK: number
}

export async function GET() {
  try {
    const rows = await executeQuery<MenuTypesRow>(`
      SELECT COUNTRY, MENU_TYPE, SUM(PRICE) AS TOTAL_SALES,
        RANK() OVER (PARTITION BY COUNTRY ORDER BY SUM(PRICE) DESC) AS TYPE_RANK
      FROM TAKEHOME_DB.HARMONIZED.POS_FLATTENED_V
      GROUP BY 1, 2 QUALIFY TYPE_RANK <= 3 ORDER BY COUNTRY, TYPE_RANK
    `)
    const data = rows.map(row => ({
      country: row.COUNTRY,
      menuType: row.MENU_TYPE,
      totalSales: row.TOTAL_SALES,
      typeRank: row.TYPE_RANK,
    }))
    return NextResponse.json({ data })
  } catch (error) {
    console.error('Failed to fetch menu types:', error)
    return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 })
  }
}
