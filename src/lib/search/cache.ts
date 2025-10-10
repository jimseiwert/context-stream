/**
 * Search Cache
 * Caches search results using Redis for improved performance
 */

import Redis from 'ioredis'
import * as crypto from 'crypto'
import { OptimizedResult } from './optimizer'

const CACHE_TTL = 3600 // 1 hour

let redisInstance: Redis | null = null

function getRedis(): Redis | null {
  if (redisInstance) return redisInstance

  // Check if Redis is configured
  const host = process.env.REDIS_HOST || 'localhost'
  const port = parseInt(process.env.REDIS_PORT || '6379')

  try {
    redisInstance = new Redis({
      host,
      port,
      password: process.env.REDIS_PASSWORD,
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
      lazyConnect: true, // Don't connect until first command
    })

    // Test connection
    redisInstance.on('error', (err) => {
      console.error('[SearchCache] Redis connection error:', err.message)
    })

    return redisInstance
  } catch (error) {
    console.error('[SearchCache] Failed to initialize Redis:', error)
    return null
  }
}

export class SearchCache {
  private redis: Redis | null

  constructor() {
    this.redis = getRedis()
  }

  /**
   * Check if caching is enabled
   */
  isEnabled(): boolean {
    return this.redis !== null
  }

  /**
   * Generate cache key from query parameters
   */
  generateKey(
    query: string,
    sourceIds: string[],
    filters?: Record<string, any>
  ): string {
    const data = JSON.stringify({
      query: query.toLowerCase().trim(),
      sourceIds: sourceIds.sort(), // Sort for consistency
      filters: filters || {},
    })

    return crypto.createHash('md5').update(data).digest('hex')
  }

  /**
   * Get cached results
   */
  async get(
    query: string,
    sourceIds: string[],
    filters?: Record<string, any>
  ): Promise<OptimizedResult[] | null> {
    if (!this.redis) return null

    try {
      const key = this.generateKey(query, sourceIds, filters)
      const cached = await this.redis.get(`search:${key}`)

      if (cached) {
        console.log(`[SearchCache] HIT for query: "${query}"`)
        return JSON.parse(cached) as OptimizedResult[]
      }

      console.log(`[SearchCache] MISS for query: "${query}"`)
      return null
    } catch (error) {
      console.error('[SearchCache] Get error:', error)
      return null
    }
  }

  /**
   * Cache search results
   */
  async set(
    query: string,
    sourceIds: string[],
    results: OptimizedResult[],
    filters?: Record<string, any>,
    ttl: number = CACHE_TTL
  ): Promise<void> {
    if (!this.redis) return

    try {
      const key = this.generateKey(query, sourceIds, filters)
      await this.redis.setex(`search:${key}`, ttl, JSON.stringify(results))

      console.log(
        `[SearchCache] SET for query: "${query}" (${results.length} results, TTL: ${ttl}s)`
      )
    } catch (error) {
      console.error('[SearchCache] Set error:', error)
    }
  }

  /**
   * Invalidate cache for a specific source
   * When a source is updated, we need to clear related caches
   */
  async invalidateSource(sourceId: string): Promise<void> {
    if (!this.redis) return

    try {
      // Get all cache keys
      const keys = await this.redis.keys('search:*')

      // Filter keys that contain this source
      // Note: This is not efficient for large-scale apps
      // For production, consider using Redis SCAN or cache tags
      for (const key of keys) {
        const cached = await this.redis.get(key)
        if (cached) {
          try {
            // Check if any result is from this source
            const results = JSON.parse(cached) as OptimizedResult[]
            const hasSource = results.some(
              (r) => r.sourceUrl && r.sourceUrl.includes(sourceId)
            )

            if (hasSource) {
              await this.redis.del(key)
            }
          } catch {
            // Invalid JSON, delete the key
            await this.redis.del(key)
          }
        }
      }

      console.log(`[SearchCache] Invalidated cache for source: ${sourceId}`)
    } catch (error) {
      console.error('[SearchCache] Invalidate error:', error)
    }
  }

  /**
   * Clear all cached searches
   */
  async clear(): Promise<void> {
    if (!this.redis) return

    try {
      const keys = await this.redis.keys('search:*')
      if (keys.length > 0) {
        await this.redis.del(...keys)
        console.log(`[SearchCache] Cleared ${keys.length} cached searches`)
      }
    } catch (error) {
      console.error('[SearchCache] Clear error:', error)
    }
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<{
    totalKeys: number
    estimatedSize: number
  } | null> {
    if (!this.redis) return null

    try {
      const keys = await this.redis.keys('search:*')
      return {
        totalKeys: keys.length,
        estimatedSize: keys.length * 5000, // Rough estimate: 5KB per cached result
      }
    } catch (error) {
      console.error('[SearchCache] Stats error:', error)
      return null
    }
  }

  /**
   * Warm cache with popular queries
   */
  async warmCache(
    popularQueries: Array<{
      query: string
      sourceIds: string[]
      results: OptimizedResult[]
    }>,
    ttl: number = CACHE_TTL * 2 // Longer TTL for popular queries
  ): Promise<void> {
    if (!this.redis) return

    try {
      for (const item of popularQueries) {
        await this.set(item.query, item.sourceIds, item.results, undefined, ttl)
      }

      console.log(
        `[SearchCache] Warmed cache with ${popularQueries.length} popular queries`
      )
    } catch (error) {
      console.error('[SearchCache] Warm cache error:', error)
    }
  }
}

// Export singleton instance
export const searchCache = new SearchCache()
