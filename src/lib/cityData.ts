// Pre-fetched city data from Snowflake TAKEHOME_DB.ANALYTICS
// This avoids auth issues with EXTERNALBROWSER in API routes

export interface CityData {
  city: string
  country: string
  latitude: number
  longitude: number
  totalSales: number
  totalOrders: number
  avgOrderValue: number
  activeTrucks: number
}

export const CITIES: CityData[] = [
  { city: "Cape Town", country: "South Africa", latitude: -33.9249, longitude: 18.4241, totalSales: 1975269766.50, totalOrders: 10839620, avgOrderValue: 51.30, activeTrucks: 15 },
  { city: "Delhi", country: "India", latitude: 28.6139, longitude: 77.209, totalSales: 1643948213.25, totalOrders: 11304218, avgOrderValue: 53.52, activeTrucks: 15 },
  { city: "New York City", country: "United States", latitude: 40.7128, longitude: -74.006, totalSales: 1639471130.50, totalOrders: 11299257, avgOrderValue: 48.65, activeTrucks: 15 },
  { city: "Seoul", country: "South Korea", latitude: 37.5665, longitude: 126.978, totalSales: 1602420205.75, totalOrders: 11375634, avgOrderValue: 51.72, activeTrucks: 15 },
  { city: "Sao Paulo", country: "Brazil", latitude: -23.5505, longitude: -46.6333, totalSales: 1559997413.00, totalOrders: 10737196, avgOrderValue: 53.50, activeTrucks: 15 },
  { city: "Sydney", country: "Australia", latitude: -33.8688, longitude: 151.2093, totalSales: 1484264938.50, totalOrders: 10430281, avgOrderValue: 52.38, activeTrucks: 15 },
  { city: "Mumbai", country: "India", latitude: 19.076, longitude: 72.8777, totalSales: 1450905274.00, totalOrders: 9774609, avgOrderValue: 54.91, activeTrucks: 15 },
  { city: "Melbourne", country: "Australia", latitude: -37.8136, longitude: 144.9631, totalSales: 1449454374.75, totalOrders: 10086430, avgOrderValue: 53.71, activeTrucks: 15 },
  { city: "London", country: "England", latitude: 51.5074, longitude: -0.1278, totalSales: 1441126352.50, totalOrders: 9878605, avgOrderValue: 53.84, activeTrucks: 15 },
  { city: "Tokyo", country: "Japan", latitude: 35.6762, longitude: 139.6503, totalSales: 1438054704.25, totalOrders: 10134328, avgOrderValue: 52.40, activeTrucks: 15 },
  { city: "Berlin", country: "Germany", latitude: 52.52, longitude: 13.405, totalSales: 1347136051.75, totalOrders: 9142012, avgOrderValue: 54.40, activeTrucks: 15 },
  { city: "Rio de Janeiro", country: "Brazil", latitude: -22.9068, longitude: -43.1729, totalSales: 1331586909.25, totalOrders: 9887958, avgOrderValue: 49.15, activeTrucks: 15 },
  { city: "Madrid", country: "Spain", latitude: 40.4168, longitude: -3.7038, totalSales: 1322557344.50, totalOrders: 9617418, avgOrderValue: 50.80, activeTrucks: 15 },
  { city: "Toronto", country: "Canada", latitude: 43.6532, longitude: -79.3832, totalSales: 1242309267.00, totalOrders: 9104153, avgOrderValue: 50.54, activeTrucks: 15 },
  { city: "Paris", country: "France", latitude: 48.8566, longitude: 2.3522, totalSales: 1054890662.00, totalOrders: 7157677, avgOrderValue: 52.15, activeTrucks: 15 },
  { city: "Warsaw", country: "Poland", latitude: 52.2297, longitude: 21.0122, totalSales: 1040674395.75, totalOrders: 7362250, avgOrderValue: 52.56, activeTrucks: 15 },
  { city: "Barcelona", country: "Spain", latitude: 41.3851, longitude: 2.1734, totalSales: 1012397052.50, totalOrders: 7143226, avgOrderValue: 52.26, activeTrucks: 15 },
  { city: "Montreal", country: "Canada", latitude: 45.5017, longitude: -73.5673, totalSales: 854343057.00, totalOrders: 5757977, avgOrderValue: 52.27, activeTrucks: 15 },
  { city: "Hamburg", country: "Germany", latitude: 53.5511, longitude: 9.9937, totalSales: 842241113.75, totalOrders: 5989050, avgOrderValue: 51.17, activeTrucks: 15 },
  { city: "Munich", country: "Germany", latitude: 48.1351, longitude: 11.582, totalSales: 786866078.50, totalOrders: 5513502, avgOrderValue: 52.93, activeTrucks: 15 },
  { city: "Cairo", country: "Egypt", latitude: 30.0444, longitude: 31.2357, totalSales: 645002530.75, totalOrders: 4698142, avgOrderValue: 51.04, activeTrucks: 15 },
  { city: "Stockholm", country: "Sweden", latitude: 59.3293, longitude: 18.0686, totalSales: 549377746.25, totalOrders: 3721352, avgOrderValue: 53.69, activeTrucks: 15 },
  { city: "Boston", country: "United States", latitude: 42.3601, longitude: -71.0589, totalSales: 482871675.00, totalOrders: 2773080, avgOrderValue: 49.24, activeTrucks: 15 },
  { city: "Seattle", country: "United States", latitude: 47.6062, longitude: -122.3321, totalSales: 479901885.50, totalOrders: 3119158, avgOrderValue: 50.85, activeTrucks: 15 },
  { city: "Denver", country: "United States", latitude: 39.7392, longitude: -104.9903, totalSales: 476693117.50, totalOrders: 3298790, avgOrderValue: 53.38, activeTrucks: 15 },
  { city: "Vancouver", country: "Canada", latitude: 49.2827, longitude: -123.1207, totalSales: 455986460.00, totalOrders: 3037348, avgOrderValue: 51.51, activeTrucks: 15 },
  { city: "Krakow", country: "Poland", latitude: 50.0647, longitude: 19.945, totalSales: 444231388.00, totalOrders: 3140459, avgOrderValue: 52.50, activeTrucks: 15 },
  { city: "Manchester", country: "England", latitude: 53.4808, longitude: -2.2426, totalSales: 298592921.00, totalOrders: 2040219, avgOrderValue: 53.69, activeTrucks: 15 },
  { city: "Nice", country: "France", latitude: 43.7102, longitude: 7.262, totalSales: 197829102.75, totalOrders: 1337073, avgOrderValue: 51.34, activeTrucks: 15 },
  { city: "San Mateo", country: "United States", latitude: 37.563, longitude: -122.3255, totalSales: 64703654.25, totalOrders: 471718, avgOrderValue: 50.49, activeTrucks: 15 },
]

export function formatCurrency(value: number): string {
  if (value >= 1000000000) {
    return `$${(value / 1000000000).toFixed(2)}B`
  } else if (value >= 1000000) {
    return `$${(value / 1000000).toFixed(1)}M`
  } else if (value >= 1000) {
    return `$${(value / 1000).toFixed(1)}K`
  }
  return `$${value.toFixed(2)}`
}

export function formatNumber(value: number): string {
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`
  } else if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}K`
  }
  return value.toLocaleString()
}
