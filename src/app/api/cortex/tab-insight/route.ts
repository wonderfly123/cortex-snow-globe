import { NextResponse } from 'next/server'
import { executeQuery } from '@/lib/snowflake'

interface CortexResult {
  AI_NARRATIVE: string
}

// In-memory cache: 1 hour TTL
const insightCache = new Map<string, { insight: string; timestamp: number }>()
const CACHE_TTL_MS = 60 * 60 * 1000

const TAB_QUERIES: Record<string, string | string[]> = {
  'sales-trend': [
    // Overall monthly trend (all countries combined)
    `SELECT MONTH, SUM(SALES) AS TOTAL_SALES, SUM(ORDERS) AS TOTAL_ORDERS
     FROM TAKEHOME_DB.ANALYTICS.MONTHLY_TREND_DT
     GROUP BY MONTH ORDER BY MONTH`,
    // Country-level totals
    `SELECT COUNTRY, SUM(SALES) AS TOTAL_SALES, SUM(ORDERS) AS TOTAL_ORDERS
     FROM TAKEHOME_DB.ANALYTICS.MONTHLY_TREND_DT
     GROUP BY COUNTRY ORDER BY TOTAL_SALES DESC`,
  ],
  'top-brands': `
    SELECT YEAR(ORDER_TS_DATE) AS YEAR, TRUCK_BRAND_NAME,
      SUM(PRICE) AS TOTAL_SALES,
      RANK() OVER (PARTITION BY YEAR(ORDER_TS_DATE) ORDER BY SUM(PRICE) DESC) AS BRAND_RANK
    FROM TAKEHOME_DB.HARMONIZED.POS_FLATTENED_V
    GROUP BY 1, 2
    QUALIFY BRAND_RANK <= 3
    ORDER BY YEAR, BRAND_RANK
  `,
  'menu-types': `
    SELECT COUNTRY, MENU_TYPE, SUM(PRICE) AS TOTAL_SALES,
      RANK() OVER (PARTITION BY COUNTRY ORDER BY SUM(PRICE) DESC) AS TYPE_RANK
    FROM TAKEHOME_DB.HARMONIZED.POS_FLATTENED_V
    GROUP BY 1, 2
    QUALIFY TYPE_RANK <= 3
    ORDER BY COUNTRY, TYPE_RANK
  `,
  'franchisees': [
    // Summary: top franchisees by total sales per country/year
    `SELECT COUNTRY, YEAR(ORDER_TS_DATE) AS YEAR, FRANCHISEE_NAME,
       SUM(PRICE) AS TOTAL_SALES, COUNT(DISTINCT ORDER_ID) AS TOTAL_ORDERS
     FROM TAKEHOME_DB.HARMONIZED.POS_FLATTENED_V
     WHERE FRANCHISE_FLAG = 1
     GROUP BY 1, 2, 3
     ORDER BY COUNTRY, YEAR, TOTAL_SALES DESC`,
    // Sample of best months (top performers only)
    `SELECT COUNTRY, YEAR(ORDER_TS_DATE) AS YEAR, FRANCHISEE_NAME,
       TO_CHAR(ORDER_TS_DATE, 'YYYY-MM') AS MONTH,
       SUM(PRICE) AS MONTHLY_SALES,
       RANK() OVER (PARTITION BY COUNTRY, YEAR(ORDER_TS_DATE), FRANCHISEE_NAME ORDER BY SUM(PRICE) DESC) AS MONTH_RANK
     FROM TAKEHOME_DB.HARMONIZED.POS_FLATTENED_V
     WHERE FRANCHISE_FLAG = 1
     GROUP BY 1, 2, 3, 4
     QUALIFY MONTH_RANK = 1
     ORDER BY MONTHLY_SALES DESC`,
  ],
  'distribution': `
    SELECT COUNTRY, SUM(TOTAL_ORDERS) AS TOTAL_ORDERS, SUM(TOTAL_SALES) AS TOTAL_SALES
    FROM TAKEHOME_DB.ANALYTICS.CITY_KPI_DT
    GROUP BY COUNTRY
    ORDER BY TOTAL_ORDERS DESC
  `,
  'patterns': [
    `SELECT MONTH, SUM(ORDERS) AS TOTAL_ORDERS, SUM(SALES) AS TOTAL_SALES
     FROM TAKEHOME_DB.ANALYTICS.MONTHLY_TREND_DT
     GROUP BY MONTH ORDER BY MONTH`,
    `SELECT DAYOFWEEK(ORDER_TS_DATE) AS DOW, DAYNAME(ORDER_TS_DATE) AS DAY_NAME,
       COUNT(DISTINCT ORDER_ID) AS TOTAL_ORDERS
     FROM TAKEHOME_DB.HARMONIZED.POS_FLATTENED_V
     GROUP BY 1, 2 ORDER BY 1`,
    `SELECT HOUR(ORDER_TS) AS HOUR, COUNT(DISTINCT ORDER_ID) AS TOTAL_ORDERS
     FROM TAKEHOME_DB.HARMONIZED.POS_FLATTENED_V
     GROUP BY 1 ORDER BY 1`,
  ],
}

const TAB_QUESTIONS: Record<string, string> = {
  'sales-trend':
    'Question: What is the overall trend in sales across all countries? Analyze the monthly sales data below. Identify growth trends, seasonal patterns, which countries drive the most revenue, and any notable changes over time. Also calculate and comment on the average order value (AOV = TOTAL_SALES / TOTAL_ORDERS) trend — is it rising, falling, or stable?',
  'top-brands':
    'Question: Which are the top 3 selling truck brand names each year? Analyze the data below. Discuss brand consistency, any shifts in rankings between years, and what this suggests about brand performance and customer loyalty.',
  'menu-types':
    'Question: Which are the top 3 menu types in each country? Analyze the data below. Discuss regional food preferences, which cuisines dominate globally vs locally, and what this means for menu strategy and expansion decisions.',
  'franchisees':
    'Question: What were the best 3 months for each franchisee, in each year, in each country? Analyze the sample data below. Discuss seasonal patterns, which franchisees are top performers, and what peak months reveal about local market dynamics.',
  'distribution':
    'Question: Using the COUNTRY column, analyze order distribution across countries. What does this help you understand? Analyze the data below. Discuss market concentration, geographic diversification, revenue efficiency, and where growth opportunities exist.',
  'patterns':
    'Question: Using ORDER_TS or ORDER_TS_DATE, study order patterns over time. What does this help you understand? Analyze the data below. Discuss monthly volume trends, what day-of-week and hour-of-day patterns reveal about customer behavior, and how this informs operations.',
}

function formatDataForPrompt(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return 'No data available.'
  const cols = Object.keys(rows[0])
  const header = cols.join(' | ')
  const lines = rows.slice(0, 120).map(r => cols.map(c => String(r[c] ?? '')).join(' | '))
  return [header, '-'.repeat(header.length), ...lines].join('\n')
}

export async function POST(request: Request) {
  try {
    const { tab } = await request.json()

    if (!tab || !TAB_QUERIES[tab]) {
      return NextResponse.json({ error: 'Invalid tab' }, { status: 400 })
    }

    // Check cache
    const cached = insightCache.get(tab)
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return NextResponse.json({ insight: cached.insight })
    }

    // Fetch summary data for this tab
    const queries = TAB_QUERIES[tab]
    let dataStr: string

    if (Array.isArray(queries)) {
      const results = await Promise.all(
        queries.map(q => executeQuery<Record<string, unknown>>(q))
      )
      dataStr = results.map((rows, i) => `Dataset ${i + 1}:\n${formatDataForPrompt(rows)}`).join('\n\n')
    } else {
      const rows = await executeQuery<Record<string, unknown>>(queries)
      dataStr = formatDataForPrompt(rows)
    }

    const prompt = `You are a senior business analyst for a global food truck company. ${TAB_QUESTIONS[tab]}

DATA:
${dataStr}

Provide a 3-4 sentence insight that directly answers the question above. Be specific with numbers and percentages from the data. Include one actionable business recommendation. Do not use bullet points or markdown formatting — write in flowing prose.`

    const result = await executeQuery<CortexResult>(`
      SELECT SNOWFLAKE.CORTEX.COMPLETE('mistral-7b', ?) AS AI_NARRATIVE
    `, [prompt])

    let insight = result[0]?.AI_NARRATIVE || 'Unable to generate insight.'
    insight = insight.replace(/```[\s\S]*?```/g, '').replace(/[*#]/g, '').trim()

    // Cache
    insightCache.set(tab, { insight, timestamp: Date.now() })

    return NextResponse.json({ insight })
  } catch (error) {
    console.error('Tab insight error:', error)
    return NextResponse.json(
      { insight: 'Unable to generate AI insight at this time.' },
      { status: 500 },
    )
  }
}
