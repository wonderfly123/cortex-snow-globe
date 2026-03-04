import { NextResponse } from 'next/server'
import { executeQuery } from '@/lib/snowflake'

interface CityRow {
  CITY: string
  COUNTRY: string
  LATITUDE: number
  LONGITUDE: number
  TOTAL_SALES: number
  TOTAL_ORDERS: number
}

export async function GET() {
  try {
    const cities = await executeQuery<CityRow>(`
      SELECT 
        c.CITY,
        c.COUNTRY,
        c.LATITUDE,
        c.LONGITUDE,
        k.TOTAL_SALES,
        k.TOTAL_ORDERS
      FROM TAKEHOME_DB.ANALYTICS.CITY_COORDINATES c
      LEFT JOIN TAKEHOME_DB.ANALYTICS.CITY_KPI_DT k ON c.CITY = k.CITY
      ORDER BY k.TOTAL_SALES DESC NULLS LAST
    `)
    
    const formattedCities = cities.map(city => ({
      city: city.CITY,
      country: city.COUNTRY,
      latitude: city.LATITUDE,
      longitude: city.LONGITUDE,
      totalSales: city.TOTAL_SALES,
      totalOrders: city.TOTAL_ORDERS,
    }))
    
    return NextResponse.json({ cities: formattedCities })
  } catch (error) {
    console.error('Failed to fetch cities:', error)
    return NextResponse.json(
      { error: 'Failed to fetch cities' },
      { status: 500 }
    )
  }
}
