import { NextResponse } from 'next/server'
import { executeQuery } from '@/lib/snowflake'

interface FranchiseeMonthsRow {
  COUNTRY: string
  YEAR: number
  FRANCHISEE_NAME: string
  MONTH_LABEL: string
  MONTHLY_SALES: number
  MONTH_RANK: number
}

interface MonthlyAggRow {
  MONTH_NUM: number
  MONTH_NAME: string
  TOTAL_SALES: number
  TOTAL_ORDERS: number
}

export async function GET() {
  try {
    const [franchiseeRows, monthlyRows] = await Promise.all([
      executeQuery<FranchiseeMonthsRow>(`
        SELECT COUNTRY, YEAR(ORDER_TS_DATE) AS YEAR, FRANCHISEE_NAME,
          TO_CHAR(ORDER_TS_DATE, 'YYYY-MM') AS MONTH_LABEL,
          SUM(PRICE) AS MONTHLY_SALES,
          RANK() OVER (PARTITION BY COUNTRY, YEAR(ORDER_TS_DATE), FRANCHISEE_NAME ORDER BY SUM(PRICE) DESC) AS MONTH_RANK
        FROM TAKEHOME_DB.HARMONIZED.POS_FLATTENED_V
        WHERE FRANCHISE_FLAG = 1
        GROUP BY 1, 2, 3, 4
        ORDER BY COUNTRY, YEAR, FRANCHISEE_NAME, MONTH_LABEL
      `),
      executeQuery<MonthlyAggRow>(`
        SELECT MONTH(ORDER_TS_DATE) AS MONTH_NUM,
          MONTHNAME(ORDER_TS_DATE) AS MONTH_NAME,
          SUM(PRICE) AS TOTAL_SALES,
          COUNT(DISTINCT ORDER_ID) AS TOTAL_ORDERS
        FROM TAKEHOME_DB.HARMONIZED.POS_FLATTENED_V
        WHERE FRANCHISE_FLAG = 1
        GROUP BY 1, 2
        ORDER BY 1
      `),
    ])

    const data = franchiseeRows.map(row => ({
      country: row.COUNTRY,
      year: row.YEAR,
      franchisee: row.FRANCHISEE_NAME,
      monthLabel: row.MONTH_LABEL,
      monthlySales: row.MONTHLY_SALES,
      monthRank: row.MONTH_RANK,
    }))

    const monthlyAgg = monthlyRows.map(row => ({
      monthNum: row.MONTH_NUM,
      monthName: row.MONTH_NAME,
      totalSales: row.TOTAL_SALES,
      totalOrders: row.TOTAL_ORDERS,
    }))

    return NextResponse.json({ data, monthlyAgg })
  } catch (error) {
    console.error('Failed to fetch franchisee months:', error)
    return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 })
  }
}
