/**
 * Redis Cache Service
 * 
 * Distributed caching with Redis for production environments
 * Falls back to in-memory cache if Redis is not available
 */

import { logger } from '../../_core/logger';

// Lazy load Redis to avoid errors if not installed
let Redis: any;
let redisClient: any = null;

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

export class RedisCacheService {
  private fallbackCache: Map<string, CacheEntry<any>> = new Map();
  private cleanupInterval: NodeJS.Timeout | null = null;
  private useRedis: boolean = false;

  constructor(cleanupIntervalMs: number = 60000) {
    this.initializeRedis();
    
    // Start cleanup interval for fallback cache
    this.cleanupInterval = setInterval(() => {
      if (!this.useRedis) {
        this.cleanup();
      }
    }, cleanupIntervalMs);
  }

  private async initializeRedis() {
    try {
      const redisUrl = process.env.REDIS_URL;
      
      if (!redisUrl) {
        logger.warn('REDIS_URL not configured, using in-memory cache fallback');
        return;
      }

      // Dynamically import ioredis
      const { default: IORedis } = await import('ioredis');
      Redis = IORedis;

      redisClient = new Redis(redisUrl, {
        maxRetriesPerRequest: 3,
        enableReadyCheck: true,
        lazyConnect: true,
      });

      await redisClient.connect();

      redisClient.on('error', (err: Error) => {
        logger.error('Redis connection error', err);
        this.useRedis = false;
      });

      redisClient.on('connect', () => {
        logger.info('Redis connected successfully');
        this.useRedis = true;
      });

      redisClient.on('ready', () => {
        logger.info('Redis ready');
        this.useRedis = true;
      });

      this.useRedis = true;
    } catch (error) {
      logger.warn('Redis not available, using in-memory cache fallback', { error });
      this.useRedis = false;
    }
  }

  /**
   * Set a value in cache with TTL
   */
  async set<T>(key: string, value: T, ttlMs: number = 300000): Promise<void> {
    if (this.useRedis && redisClient) {
      try {
        const ttlSeconds = Math.ceil(ttlMs / 1000);
        await redisClient.setex(key, ttlSeconds, JSON.stringify(value));
        return;
      } catch (error) {
        logger.error('Redis set error, falling back to memory', { error, key });
      }
    }

    // Fallback to in-memory cache
    const expiresAt = Date.now() + ttlMs;
    this.fallbackCache.set(key, { value, expiresAt });
  }

  /**
   * Get a value from cache
   */
  async get<T>(key: string): Promise<T | null> {
    if (this.useRedis && redisClient) {
      try {
        const data = await redisClient.get(key);
        if (data) {
          return JSON.parse(data) as T;
        }
        return null;
      } catch (error) {
        logger.error('Redis get error, falling back to memory', { error, key });
      }
    }

    // Fallback to in-memory cache
    const entry = this.fallbackCache.get(key);
    
    if (!entry) {
      return null;
    }

    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.fallbackCache.delete(key);
      return null;
    }

    return entry.value as T;
  }

  /**
   * Get or set a value (cache-aside pattern)
   */
  async getOrSet<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttlMs: number = 300000
  ): Promise<T> {
    const cached = await this.get<T>(key);
    
    if (cached !== null) {
      return cached;
    }

    const value = await fetcher();
    await this.set(key, value, ttlMs);
    return value;
  }

  /**
   * Delete a value from cache
   */
  async delete(key: string): Promise<void> {
    if (this.useRedis && redisClient) {
      try {
        await redisClient.del(key);
        return;
      } catch (error) {
        logger.error('Redis delete error', { error, key });
      }
    }

    // Fallback to in-memory cache
    this.fallbackCache.delete(key);
  }

  /**
   * Clear all cache
   */
  async clear(): Promise<void> {
    if (this.useRedis && redisClient) {
      try {
        await redisClient.flushdb();
        return;
      } catch (error) {
        logger.error('Redis clear error', { error });
      }
    }

    // Fallback to in-memory cache
    this.fallbackCache.clear();
  }

  /**
   * Invalidate cache entries matching a pattern
   */
  async invalidatePattern(pattern: string): Promise<void> {
    if (this.useRedis && redisClient) {
      try {
        const keys = await redisClient.keys(pattern);
        if (keys.length > 0) {
          await redisClient.del(...keys);
          logger.debug(`Invalidated ${keys.length} cache entries matching pattern ${pattern}`);
        }
        return;
      } catch (error) {
        logger.error('Redis invalidatePattern error', { error, pattern });
      }
    }

    // Fallback to in-memory cache
    const regex = new RegExp(pattern.replace(/\*/g, '.*'));
    const keysToDelete: string[] = [];
    
    for (const key of this.fallbackCache.keys()) {
      if (regex.test(key)) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => this.fallbackCache.delete(key));
    logger.debug(`Invalidated ${keysToDelete.length} cache entries matching pattern ${pattern}`);
  }

  /**
   * Clean up expired entries (for fallback cache)
   */
  private cleanup(): void {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, entry] of this.fallbackCache.entries()) {
      if (now > entry.expiresAt) {
        this.fallbackCache.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      logger.debug(`Cleaned up ${cleaned} expired cache entries`);
    }
  }

  /**
   * Get cache statistics
   */
  async getStats() {
    if (this.useRedis && redisClient) {
      try {
        const info = await redisClient.info('stats');
        const dbsize = await redisClient.dbsize();
        return {
          type: 'redis',
          connected: this.useRedis,
          dbsize,
          info,
        };
      } catch (error) {
        logger.error('Redis getStats error', { error });
      }
    }

    // Fallback stats
    const now = Date.now();
    let expired = 0;
    let active = 0;

    for (const entry of this.fallbackCache.values()) {
      if (now > entry.expiresAt) {
        expired++;
      } else {
        active++;
      }
    }

    return {
      type: 'memory',
      connected: false,
      total: this.fallbackCache.size,
      active,
      expired,
    };
  }

  /**
   * Stop the service
   */
  async stop(): Promise<void> {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }

    if (redisClient) {
      try {
        await redisClient.quit();
      } catch (error) {
        logger.error('Error closing Redis connection', { error });
      }
    }
  }
}

// Export singleton instance
let cacheServiceInstance: RedisCacheService | null = null;

export function getCacheService(): RedisCacheService {
  if (!cacheServiceInstance) {
    cacheServiceInstance = new RedisCacheService();
  }
  return cacheServiceInstance;
}

// Graceful shutdown
process.on('SIGINT', async () => {
  if (cacheServiceInstance) {
    await cacheServiceInstance.stop();
  }
});

process.on('SIGTERM', async () => {
  if (cacheServiceInstance) {
    await cacheServiceInstance.stop();
  }
});

