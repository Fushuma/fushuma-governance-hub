import rateLimit from 'express-rate-limit';
import { Request } from 'express';

/**
 * Rate limiting middleware to protect against abuse
 * Uses express-rate-limit with in-memory store
 * 
 * IMPORTANT: For production with multiple servers, use Redis store:
 * 
 * import RedisStore from 'rate-limit-redis';
 * import { createClient } from 'redis';
 * 
 * const client = createClient({ url: process.env.REDIS_URL });
 * 
 * const limiter = rateLimit({
 *   store: new RedisStore({
 *     client,
 *     prefix: 'rl:',
 *   }),
 *   // ... other options
 * });
 */

// General API rate limiter
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

// Stricter rate limiter for voting endpoints
export const voteLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5, // Limit to 5 votes per minute
  message: 'Too many votes, please slow down.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiter for submission endpoints (grants, proposals, etc.)
export const submissionLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // Limit to 10 submissions per hour
  message: 'Too many submissions, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiter for authentication endpoints
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // Limit to 20 auth attempts per 15 minutes
  message: 'Too many authentication attempts, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiter for file upload endpoints
export const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20, // Limit to 20 uploads per hour
  message: 'Too many file uploads, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiter for blockchain RPC calls
export const blockchainLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // Limit to 30 blockchain calls per minute
  message: 'Too many blockchain requests, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiter for search/query endpoints
export const searchLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // Limit to 30 searches per minute
  message: 'Too many search requests, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Stricter rate limiter for sensitive operations
export const strictLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // Limit to 5 requests per hour
  message: 'Rate limit exceeded for this operation.',
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Create a custom rate limiter with user-based key
 * Authenticated users get higher limits
 */
export function createUserAwareRateLimiter({
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
  return rateLimit({
    windowMs,
    max: (req: Request) => {
      // Higher limit for authenticated users
      return (req as any).user ? maxAuthenticated : maxAnonymous;
    },
    message,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req: Request) => {
      // Use user ID for authenticated users, IP for anonymous
      const user = (req as any).user;
      return user ? `user:${user.id}` : req.ip || 'unknown';
    },
  });
}

/**
 * Flexible API limiter with user awareness
 */
export const flexibleApiLimiter = createUserAwareRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxAnonymous: 50,
  maxAuthenticated: 200,
  message: 'Too many requests, please try again later.',
});

/**
 * Skip rate limiting for certain conditions
 */
export function skipRateLimit(req: Request): boolean {
  // Skip rate limiting for health checks
  if (req.path === '/health' || req.path === '/metrics') {
    return true;
  }
  
  // Skip for admin users (if implemented)
  const user = (req as any).user;
  if (user?.role === 'admin') {
    return true;
  }
  
  return false;
}

