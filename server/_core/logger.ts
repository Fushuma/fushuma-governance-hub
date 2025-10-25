import winston from 'winston';
import { ENV } from './env';
import { randomUUID } from 'crypto';

/**
 * Structured logging utility using Winston
 * Provides different log levels and formats for development and production
 */

const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    let metaStr = '';
    if (Object.keys(meta).length > 0) {
      metaStr = '\n' + JSON.stringify(meta, null, 2);
    }
    return `${timestamp} [${level}]: ${message}${metaStr}`;
  })
);

// Create logger instance
export const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: logFormat,
  defaultMeta: { service: 'fushuma-governance-hub' },
  transports: [
    // Write all logs with level 'error' and below to error.log
    new winston.transports.File({ 
      filename: 'logs/error.log', 
      level: 'error',
      maxsize: 10485760, // 10MB
      maxFiles: 5,
    }),
    // Write all logs to combined.log
    new winston.transports.File({ 
      filename: 'logs/combined.log',
      maxsize: 10485760, // 10MB
      maxFiles: 10,
    }),
  ],
});

// Add console transport for non-production environments
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: consoleFormat,
  }));
} else {
  // In production, also log to console but with JSON format
  logger.add(new winston.transports.Console({
    format: logFormat,
  }));
}

/**
 * Generate correlation ID for request tracking
 */
export function generateCorrelationId(): string {
  return randomUUID();
}

/**
 * Request logger middleware for Express with correlation ID
 */
export function requestLogger(req: any, res: any, next: any) {
  const start = Date.now();
  const correlationId = req.headers['x-correlation-id'] || generateCorrelationId();
  
  // Attach correlation ID to request for use in other middleware
  req.correlationId = correlationId;
  
  // Add correlation ID to response headers
  res.setHeader('X-Correlation-ID', correlationId);
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info('HTTP Request', {
      correlationId,
      method: req.method,
      url: req.url,
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.get('user-agent'),
      userId: req.user?.id,
    });
  });
  
  next();
}

/**
 * Error logger middleware for Express with correlation ID
 */
export function errorLogger(err: any, req: any, res: any, next: any) {
  logger.error('HTTP Error', {
    correlationId: req.correlationId,
    method: req.method,
    url: req.url,
    error: err.message,
    stack: err.stack,
    code: err.code,
    statusCode: err.statusCode,
    ip: req.ip || req.connection.remoteAddress,
    userId: req.user?.id,
  });
  
  next(err);
}

/**
 * Helper functions for common logging scenarios
 */
export const log = {
  info: (message: string, meta?: any) => logger.info(message, meta),
  error: (message: string, error?: any, meta?: any) => {
    logger.error(message, { 
      error: error?.message || error, 
      stack: error?.stack,
      ...meta 
    });
  },
  warn: (message: string, meta?: any) => logger.warn(message, meta),
  debug: (message: string, meta?: any) => logger.debug(message, meta),
  
  // Specific logging functions
  auth: (action: string, userId?: number, meta?: any) => {
    logger.info('Auth Event', { action, userId, ...meta });
  },
  
  database: (operation: string, table: string, meta?: any) => {
    logger.debug('Database Operation', { operation, table, ...meta });
  },
  
  security: (event: string, meta?: any) => {
    logger.warn('Security Event', { event, ...meta });
  },
  
  vote: (userId: number, proposalType: string, proposalId: number, choice: string) => {
    logger.info('Vote Cast', { userId, proposalType, proposalId, choice });
  },
  
  submission: (type: string, userId: number, itemId: number, meta?: any) => {
    logger.info('Submission Created', { type, userId, itemId, ...meta });
  },
  
  blockchain: (event: string, meta?: any) => {
    logger.info('Blockchain Event', { event, ...meta });
  },
  
  performance: (operation: string, duration: number, meta?: any) => {
    logger.debug('Performance Metric', { operation, duration, ...meta });
  },
};

// Create logs directory if it doesn't exist
import { existsSync, mkdirSync } from 'fs';
const logsDir = 'logs';
if (!existsSync(logsDir)) {
  mkdirSync(logsDir, { recursive: true });
}

