import { Request, Response, NextFunction } from "express";
import { verifyToken, extractTokenFromHeader, DecodedToken } from "./jwt";
import * as db from "../db";
import { users } from "../../drizzle/schema";
import { eq } from "drizzle-orm";

/**
 * Authentication Middleware
 */

// Extend Express Request to include user
declare global {
  namespace Express {
    interface Request {
      user?: any;
      token?: DecodedToken;
    }
  }
}

/**
 * Middleware to authenticate requests
 * Verifies JWT token and attaches user to request
 */
export async function authenticate(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Extract token from Authorization header
    const token = extractTokenFromHeader(req.headers.authorization);

    if (!token) {
      res.status(401).json({ error: "No authentication token provided" });
      return;
    }

    // Verify token
    let decoded: DecodedToken;
    try {
      decoded = verifyToken(token);
    } catch (error) {
      res.status(401).json({ error: "Invalid or expired token" });
      return;
    }

    // Get user from database
    const dbInstance = await db.getDb();
    if (!dbInstance) {
      res.status(500).json({ error: "Database not available" });
      return;
    }

    const userResult = await dbInstance
      .select()
      .from(users)
      .where(eq(users.id, decoded.userId))
      .limit(1);

    if (userResult.length === 0) {
      res.status(401).json({ error: "User not found" });
      return;
    }

    const user = userResult[0];

    // Check if user is deleted
    if (user.deletedAt) {
      res.status(401).json({ error: "User account is deactivated" });
      return;
    }

    // Attach user and token to request
    req.user = user;
    req.token = decoded;

    next();
  } catch (error) {
    console.error("[Auth Middleware] Error:", error);
    res.status(500).json({ error: "Authentication failed" });
  }
}

/**
 * Optional authentication middleware
 * Attaches user if token is valid, but doesn't require it
 */
export async function optionalAuthenticate(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const token = extractTokenFromHeader(req.headers.authorization);

    if (!token) {
      next();
      return;
    }

    try {
      const decoded = verifyToken(token);

      const dbInstance = await db.getDb();
      if (dbInstance) {
        const userResult = await dbInstance
          .select()
          .from(users)
          .where(eq(users.id, decoded.userId))
          .limit(1);

        if (userResult.length > 0 && !userResult[0].deletedAt) {
          req.user = userResult[0];
          req.token = decoded;
        }
      }
    } catch (error) {
      // Token invalid, but that's okay for optional auth
    }

    next();
  } catch (error) {
    next();
  }
}

/**
 * Middleware to require admin role
 */
export function requireAdmin(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  if (!req.user) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  if (req.user.role !== "admin") {
    res.status(403).json({ error: "Admin access required" });
    return;
  }

  next();
}

/**
 * Middleware to require specific role
 */
export function requireRole(role: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }

    if (req.user.role !== role) {
      res.status(403).json({ error: `${role} access required` });
      return;
    }

    next();
  };
}

/**
 * Middleware to require email verification
 */
export function requireEmailVerification(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  if (!req.user) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  if (req.user.email && !req.user.emailVerified) {
    res.status(403).json({ 
      error: "Email verification required",
      code: "EMAIL_NOT_VERIFIED"
    });
    return;
  }

  next();
}

/**
 * Middleware to check if user owns resource
 */
export function requireOwnership(resourceUserIdField: string = "userId") {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }

    const resourceUserId = (req as any)[resourceUserIdField] || 
                          (req.body && req.body[resourceUserIdField]) ||
                          (req.params && (req.params as any)[resourceUserIdField]);

    if (!resourceUserId) {
      res.status(400).json({ error: "Resource user ID not found" });
      return;
    }

    if (req.user.id !== parseInt(resourceUserId) && req.user.role !== "admin") {
      res.status(403).json({ error: "Access denied: you don't own this resource" });
      return;
    }

    next();
  };
}

/**
 * Rate limiting middleware (simple in-memory implementation)
 */
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(options: {
  windowMs: number;
  max: number;
  message?: string;
}) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const key = req.ip || "unknown";
    const now = Date.now();

    let record = rateLimitStore.get(key);

    if (!record || now > record.resetAt) {
      record = {
        count: 0,
        resetAt: now + options.windowMs,
      };
      rateLimitStore.set(key, record);
    }

    record.count++;

    if (record.count > options.max) {
      res.status(429).json({
        error: options.message || "Too many requests, please try again later",
      });
      return;
    }

    next();
  };
}

/**
 * Clean up expired rate limit records periodically
 */
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of rateLimitStore.entries()) {
    if (now > record.resetAt) {
      rateLimitStore.delete(key);
    }
  }
}, 60000); // Clean up every minute

