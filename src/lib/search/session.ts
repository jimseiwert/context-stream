/**
 * Session Management
 * Tracks search sessions to prevent duplicate results and enable progressive refinement
 */

import Redis from 'ioredis'

export interface SearchSession {
  id: string
  userId: string
  workspaceId: string
  shownPageIds: string[]
  queries: QueryHistory[]
  createdAt: string
  lastActivityAt: string
}

export interface QueryHistory {
  query: string
  timestamp: string
  resultCount: number
  clickedPageIds: string[]
}

const SESSION_TTL = 3600 // 1 hour

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
      console.error('[Session] Redis connection error:', err.message)
    })

    return redisInstance
  } catch (error) {
    console.error('[Session] Failed to initialize Redis:', error)
    return null
  }
}

export class SessionManager {
  private redis: Redis | null

  constructor() {
    this.redis = getRedis()
  }

  /**
   * Check if session tracking is enabled
   */
  isEnabled(): boolean {
    return this.redis !== null
  }

  /**
   * Get or create a search session
   */
  async getOrCreateSession(
    userId: string,
    workspaceId: string,
    sessionId?: string
  ): Promise<SearchSession> {
    // If Redis is not configured, return in-memory session
    if (!this.redis) {
      return this.createMemorySession(userId, workspaceId, sessionId)
    }

    if (sessionId) {
      const existing = await this.getSession(sessionId)
      if (existing) {
        // Update last activity
        existing.lastActivityAt = new Date().toISOString()
        await this.saveSession(existing)
        return existing
      }
    }

    // Create new session
    const newSession: SearchSession = {
      id: sessionId || crypto.randomUUID(),
      userId,
      workspaceId,
      shownPageIds: [],
      queries: [],
      createdAt: new Date().toISOString(),
      lastActivityAt: new Date().toISOString(),
    }

    await this.saveSession(newSession)
    return newSession
  }

  /**
   * Get a session by ID
   */
  async getSession(sessionId: string): Promise<SearchSession | null> {
    if (!this.redis) return null

    try {
      const data = await this.redis.get(`search_session:${sessionId}`)
      if (!data) return null

      return JSON.parse(data) as SearchSession
    } catch (error) {
      console.error('[Session] Failed to get session:', error)
      return null
    }
  }

  /**
   * Save a session
   */
  async saveSession(session: SearchSession): Promise<void> {
    if (!this.redis) return

    try {
      await this.redis.setex(
        `search_session:${session.id}`,
        SESSION_TTL,
        JSON.stringify(session)
      )
    } catch (error) {
      console.error('[Session] Failed to save session:', error)
    }
  }

  /**
   * Add shown pages to session
   */
  async addShownPages(sessionId: string, pageIds: string[]): Promise<void> {
    if (!this.redis || pageIds.length === 0) return

    try {
      const session = await this.getSession(sessionId)
      if (!session) return

      // Add new page IDs (avoiding duplicates)
      const uniqueIds = new Set([...session.shownPageIds, ...pageIds])
      session.shownPageIds = Array.from(uniqueIds)
      session.lastActivityAt = new Date().toISOString()

      await this.saveSession(session)
    } catch (error) {
      console.error('[Session] Failed to add shown pages:', error)
    }
  }

  /**
   * Add a query to session history
   */
  async addQuery(
    sessionId: string,
    query: string,
    resultCount: number
  ): Promise<void> {
    if (!this.redis) return

    try {
      const session = await this.getSession(sessionId)
      if (!session) return

      session.queries.push({
        query,
        timestamp: new Date().toISOString(),
        resultCount,
        clickedPageIds: [],
      })

      // Keep only last 20 queries
      if (session.queries.length > 20) {
        session.queries = session.queries.slice(-20)
      }

      session.lastActivityAt = new Date().toISOString()

      await this.saveSession(session)
    } catch (error) {
      console.error('[Session] Failed to add query:', error)
    }
  }

  /**
   * Track a page click in the session
   */
  async trackClick(sessionId: string, pageId: string): Promise<void> {
    if (!this.redis) return

    try {
      const session = await this.getSession(sessionId)
      if (!session || session.queries.length === 0) return

      // Add to the most recent query
      const lastQuery = session.queries[session.queries.length - 1]
      if (!lastQuery.clickedPageIds.includes(pageId)) {
        lastQuery.clickedPageIds.push(pageId)
      }

      session.lastActivityAt = new Date().toISOString()

      await this.saveSession(session)
    } catch (error) {
      console.error('[Session] Failed to track click:', error)
    }
  }

  /**
   * Get session statistics
   */
  async getStats(sessionId: string): Promise<{
    totalQueries: number
    totalResults: number
    uniquePagesShown: number
    totalClicks: number
  } | null> {
    if (!this.redis) return null

    const session = await this.getSession(sessionId)
    if (!session) return null

    return {
      totalQueries: session.queries.length,
      totalResults: session.queries.reduce(
        (sum, q) => sum + q.resultCount,
        0
      ),
      uniquePagesShown: session.shownPageIds.length,
      totalClicks: session.queries.reduce(
        (sum, q) => sum + q.clickedPageIds.length,
        0
      ),
    }
  }

  /**
   * Delete a session
   */
  async deleteSession(sessionId: string): Promise<void> {
    if (!this.redis) return

    try {
      await this.redis.del(`search_session:${sessionId}`)
    } catch (error) {
      console.error('[Session] Failed to delete session:', error)
    }
  }

  /**
   * Create an in-memory session (fallback when Redis is not available)
   */
  private createMemorySession(
    userId: string,
    workspaceId: string,
    sessionId?: string
  ): SearchSession {
    return {
      id: sessionId || crypto.randomUUID(),
      userId,
      workspaceId,
      shownPageIds: [],
      queries: [],
      createdAt: new Date().toISOString(),
      lastActivityAt: new Date().toISOString(),
    }
  }
}

// Export singleton instance
export const sessionManager = new SessionManager()
