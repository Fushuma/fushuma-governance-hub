import rateLimit from 'express-rate-limit';
import { Request } from 'express';
import { logger } from './logger';

/**
 * Redis-based rate limiting for distributed environments
 * Falls back to in-memory if Redis is not available
 */

let RedisStore: any;
let redisClient: any;

async function initializeRedisStore() {
  try {
    const redisUrl = process.env.REDIS_URL;
    
    if (!redisUrl) {
      logger.warn('REDIS_URL not configured for rate limiting, using in-memory store');
      return null;
    }

    // Dynamically import Redis modules
    const { default: IORedis } = await import('ioredis');
    const RedisStoreModule = await import('rate-limit-redis');
    
    RedisStore = RedisStoreModule.default;
    
    redisClient = new IORedis(redisUrl, {
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
    });

    redisClient.on('error', (err: Error) => {
      logger.error('Redis rate limit store error', err);
    });

    redisClient.on('connect', () => {
      logger.info('Redis rate limit store connected');
    });

    return new RedisStore({
      // @ts-expect-error - rate-limit-redis types
      client: redisClient,
      prefix: 'rl:',
    });
  } catch (error) {
    logger.warn('Redis not available for rate limiting, using in-memory store', { error });
    return null;
  }
}

// Initialize store
let storePromise: Promise<any> | null = null;

function getStore() {
  if (!storePromise) {
    storePromise = initializeRedisStore();
  }
  return storePromise;
}

// General API rate limiter
export async function createApiLimiter() {
  const store = await getStore();
  
  return rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
    message: 'Too many requests from this IP, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
    ...(store && { store }),
  });
}

// Stricter rate limiter for voting endpoints
export async function createVoteLimiter() {
  const store = await getStore();
  
  return rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 5,
    message: 'Too many votes, please slow down.',
    standardHeaders: true,
    legacyHeaders: false,
    ...(store && { store }),
  });
}

// Rate limiter for submission endpoints
export async function createSubmissionLimiter() {
  const store = await getStore();
  
  return rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10,
    message: 'Too many submissions, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
    ...(store && { store }),
  });
}

// Rate limiter for authentication endpoints
export async function createAuthLimiter() {
  const store = await getStore();
  
  return rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 20,
    message: 'Too many authentication attempts, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
    ...(store && { store }),
  });
}

/**
 * Create a custom rate limiter with user-based key
 */
export async function createUserAwareRateLimiter({
  windowMs,
  maxAnonymous,
  maxAuthenticated,
  message,
}: {
  windowMs: number;
  maxAnonymous: number;
  maxAuthenticated: number;
  message: string;
}) {
  const store = await getStore();
  
  return rateLimit({
    windowMs,
    max: (req: Request) => {
      return (req as any).user ? maxAuthenticated : maxAnonymous;
    },
    message,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req: Request) => {
      const user = (req as any).user;
      return user ? `user:${user.id}` : req.ip || 'unknown';
    },
    ...(store && { store }),
  });
}

/**
 * Flexible API limiter with user awareness
 */
export async function createFlexibleApiLimiter() {
  return createUserAwareRateLimiter({
    windowMs: 15 * 60 * 1000,
    maxAnonymous: 50,
    maxAuthenticated: 200,
    message: 'Too many requests, please try again later.',
  });
}

/**
 * Skip rate limiting for certain conditions
 */
export function skipRateLimit(req: Request): boolean {
  if (req.path === '/health' || req.path === '/metrics') {
    return true;
  }
  
  const user = (req as any).user;
  if (user?.role === 'admin') {
    return true;
  }
  
  return false;
}

// Graceful shutdown
process.on('SIGINT', async () => {
  if (redisClient) {
    await redisClient.quit();
  }
});

process.on('SIGTERM', async () => {
  if (redisClient) {
    await redisClient.quit();
  }
});

