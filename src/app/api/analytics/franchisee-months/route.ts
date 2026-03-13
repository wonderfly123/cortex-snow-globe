import { NextRequest, NextResponse } from 'next/server'
import { executeQuery } from '@/lib/snowflake'
import { withCache } from '@/lib/cache'

const DEMO_DATE = '2025-09-30'

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

export async function GET(request: NextRequest) {
  const days = request.nextUrl.searchParams.get('days')

  try {
    const cacheKey = `franchisee-months:${days || 'all'}`
    const result = await withCache(cacheKey, async () => {
      if (days) {
        const dateFilter = `ORDER_TS_DATE >= DATEADD('day', -${parseInt(days)}, '${DEMO_DATE}'::DATE) AND ORDER_TS_DATE <= '${DEMO_DATE}'::DATE`
        const [franchiseeRows, monthlyRows] = await Promise.all([
          executeQuery<FranchiseeMonthsRow>(`
            SELECT COUNTRY, YEAR(ORDER_TS_DATE) AS YEAR, FRANCHISEE_NAME,
              TO_CHAR(ORDER_TS_DATE, 'YYYY-MM') AS MONTH_LABEL,
              SUM(PRICE) AS MONTHLY_SALES,
              ROW_NUMBER() OVER (PARTITION BY COUNTRY, YEAR(ORDER_TS_DATE), FRANCHISEE_NAME ORDER BY SUM(PRICE) DESC) AS MONTH_RANK
            FROM TAKEHOME_DB.HARMONIZED.POS_FLATTENED_V
            WHERE ${dateFilter} AND FRANCHISE_FLAG = 1
            GROUP BY COUNTRY, YEAR(ORDER_TS_DATE), FRANCHISEE_NAME, TO_CHAR(ORDER_TS_DATE, 'YYYY-MM')
            ORDER BY COUNTRY, YEAR, FRANCHISEE_NAME, MONTH_LABEL
          `),
          executeQuery<MonthlyAggRow>(`
            SELECT MONTH(ORDER_TS_DATE) AS MONTH_NUM,
              MONTHNAME(ORDER_TS_DATE) AS MONTH_NAME,
              SUM(PRICE) AS TOTAL_SALES,
              COUNT(DISTINCT ORDER_ID) AS TOTAL_ORDERS
            FROM TAKEHOME_DB.HARMONIZED.POS_FLATTENED_V
            WHERE ${dateFilter}
            GROUP BY MONTH_NUM, MONTH_NAME
            ORDER BY MONTH_NUM
          `),
        ])

        return {
          data: franchiseeRows.map(row => ({
            country: row.COUNTRY, year: row.YEAR,
            franchisee: row.FRANCHISEE_NAME, monthLabel: row.MONTH_LABEL,
            monthlySales: row.MONTHLY_SALES, monthRank: row.MONTH_RANK,
          })),
          monthlyAgg: monthlyRows.map(row => ({
            monthNum: row.MONTH_NUM, monthName: row.MONTH_NAME,
            totalSales: row.TOTAL_SALES, totalOrders: row.TOTAL_ORDERS,
          })),
        }
      }

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
          country: row.COUNTRY, year: row.YEAR,
          franchisee: row.FRANCHISEE_NAME, monthLabel: row.MONTH_LABEL,
          monthlySales: row.MONTHLY_SALES, monthRank: row.MONTH_RANK,
        })),
        monthlyAgg: monthlyRows.map(row => ({
          monthNum: row.MONTH_NUM, monthName: row.MONTH_NAME,
          totalSales: row.TOTAL_SALES, totalOrders: row.TOTAL_ORDERS,
        })),
      }
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('Failed to fetch franchisee months:', error)
    return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 })
  }
}
