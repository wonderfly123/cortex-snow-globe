import { NextResponse } from 'next/server'
import { executeQuery } from '@/lib/snowflake'

interface CortexResult {
  AI_NARRATIVE: string
}

interface CityKPIRow {
  CITY: string
  COUNTRY: string
  TOTAL_ORDERS: number
  TOTAL_SALES: number
  AVG_ORDER_VALUE: number
}

interface TopItemRow {
  MENU_ITEM_NAME: string
}

// In-memory cache: 1 hour TTL, clears on server restart
const narrativeCache = new Map<string, { narrative: string; timestamp: number }>()
const CACHE_TTL_MS = 60 * 60 * 1000

export async function POST(request: Request) {
  try {
    const { city, country } = await request.json()

    if (!city) {
      return NextResponse.json(
        { error: 'City is required' },
        { status: 400 }
      )
    }

    const cacheKey = `${city}|${country || ''}`
    const cached = narrativeCache.get(cacheKey)
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return NextResponse.json({ narrative: cached.narrative })
    }

    // Fetch city KPIs for context
    const kpiRows = await executeQuery<CityKPIRow>(`
      SELECT CITY, COUNTRY, TOTAL_ORDERS, TOTAL_SALES, AVG_ORDER_VALUE
      FROM TAKEHOME_DB.ANALYTICS.CITY_KPI_DT
      WHERE CITY = ?
      ${country ? 'AND COUNTRY = ?' : ''}
    `, country ? [city, country] : [city])
    
    // Fetch top item
    const topItemRows = await executeQuery<TopItemRow>(`
      SELECT MENU_ITEM_NAME
      FROM TAKEHOME_DB.ANALYTICS.TOP_ITEMS_DT
      WHERE CITY = ? AND ITEM_RANK = 1
      ${country ? 'AND COUNTRY = ?' : ''}
    `, country ? [city, country] : [city])
    
    if (kpiRows.length === 0) {
      return NextResponse.json({ narrative: 'No data available for this city.' })
    }
    
    const kpi = kpiRows[0]
    const topItem = topItemRows[0]?.MENU_ITEM_NAME || 'N/A'
    
    // Format currency for prompt
    const formatCurrency = (val: number) => {
      if (val >= 1000000000) return `$${(val / 1000000000).toFixed(2)}B`
      if (val >= 1000000) return `$${(val / 1000000).toFixed(1)}M`
      if (val >= 1000) return `$${(val / 1000).toFixed(1)}K`
      return `$${val.toFixed(2)}`
    }

    // Call Cortex Complete
    const prompt = `You are a food truck business analyst. Analyze this city's performance data and provide a 2-3 sentence insight highlighting key patterns and one actionable recommendation.

City: ${kpi.CITY}, ${kpi.COUNTRY}
Total Sales: ${formatCurrency(kpi.TOTAL_SALES)}
Total Orders: ${kpi.TOTAL_ORDERS.toLocaleString()}
Average Order Value: ${formatCurrency(kpi.AVG_ORDER_VALUE)}
Top Selling Item: ${topItem}

Provide a concise, data-driven insight:`

    const result = await executeQuery<CortexResult>(`
      SELECT SNOWFLAKE.CORTEX.COMPLETE('mistral-large2', ?) AS AI_NARRATIVE
    `, [prompt])
    
    let narrative = result[0]?.AI_NARRATIVE || 'Unable to generate insight.'
    
    // Clean up any markdown or extra formatting
    narrative = narrative.replace(/```[\s\S]*?```/g, '').trim()

    // Cache the result
    narrativeCache.set(cacheKey, { narrative, timestamp: Date.now() })

    return NextResponse.json({ narrative })
  } catch (error) {
    console.error('Cortex Complete error:', error)
    return NextResponse.json(
      { narrative: 'Unable to generate AI insight at this time.' },
      { status: 500 }
    )
  }
}
