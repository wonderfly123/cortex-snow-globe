const cache = new Map<string, { data: unknown; timestamp: number }>()
const DEFAULT_TTL = 60 * 60 * 1000 // 60 minutes

export function getCached<T>(key: string, ttl = DEFAULT_TTL): T | null {
  const entry = cache.get(key)
  if (entry && Date.now() - entry.timestamp < ttl) {
    return entry.data as T
  }
  if (entry) cache.delete(key)
  return null
}

export function setCache(key: string, data: unknown): void {
  cache.set(key, { data, timestamp: Date.now() })
}

export async function withCache<T>(key: string, fn: () => Promise<T>, ttl = DEFAULT_TTL): Promise<T> {
  const cached = getCached<T>(key, ttl)
  if (cached !== null) return cached
  const data = await fn()
  setCache(key, data)
  return data
}
