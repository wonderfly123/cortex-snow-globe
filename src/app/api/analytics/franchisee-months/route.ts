import { NextResponse } from 'next/server'
import { executeQuery } from '@/lib/snowflake'
import { withCache } from '@/lib/cache'

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
    const result = await withCache('franchisee-months', async () => {
      const [franchiseeRows, monthlyRows] = await Promise.all([
        executeQuery<FranchiseeMonthsRow>(`
          SELECT COUNTRY, YEAR, FRANCHISEE_NAME, MONTH_LABEL, MONTHLY_SALES, MONTH_RANK
          FROM TAKEHOME_DB.ANALYTICS.FRANCHISEE_MONTHS_DT
          ORDER BY COUNTRY, YEAR, FRANCHISEE_NAME, MONTH_LABEL
        `),
        executeQuery<MonthlyAggRow>(`
          SELECT MONTH_NUM, MONTH_NAME, TOTAL_SALES, TOTAL_ORDERS
          FROM TAKEHOME_DB.ANALYTICS.FRANCHISEE_MONTHLY_AGG_DT
          ORDER BY MONTH_NUM
        `),
      ])

      return {
        data: franchiseeRows.map(row => ({
          country: row.COUNTRY,
          year: row.YEAR,
          franchisee: row.FRANCHISEE_NAME,
          monthLabel: row.MONTH_LABEL,
          monthlySales: row.MONTHLY_SALES,
          monthRank: row.MONTH_RANK,
        })),
        monthlyAgg: monthlyRows.map(row => ({
          monthNum: row.MONTH_NUM,
          monthName: row.MONTH_NAME,
          totalSales: row.TOTAL_SALES,
          totalOrders: row.TOTAL_ORDERS,
        })),
      }
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('Failed to fetch franchisee months:', error)
    return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 })
  }
}
