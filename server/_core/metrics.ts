/**
 * Prometheus metrics collection for the Fushuma Governance Hub
 * Provides performance monitoring and operational insights
 */

import { register, collectDefaultMetrics, Counter, Histogram, Gauge } from 'prom-client';
import { Request, Response } from 'express';

// Collect default metrics (CPU, memory, etc.)
collectDefaultMetrics({ prefix: 'fushuma_' });

/**
 * HTTP request metrics
 */
export const httpRequestDuration = new Histogram({
  name: 'fushuma_http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 5],
});

export const httpRequestTotal = new Counter({
  name: 'fushuma_http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
});

/**
 * Database metrics
 */
export const dbQueryDuration = new Histogram({
  name: 'fushuma_db_query_duration_seconds',
  help: 'Duration of database queries in seconds',
  labelNames: ['operation', 'table'],
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1],
});

export const dbQueryTotal = new Counter({
  name: 'fushuma_db_queries_total',
  help: 'Total number of database queries',
  labelNames: ['operation', 'table', 'status'],
});

export const dbConnectionsActive = new Gauge({
  name: 'fushuma_db_connections_active',
  help: 'Number of active database connections',
});

/**
 * Blockchain metrics
 */
export const blockchainRequestDuration = new Histogram({
  name: 'fushuma_blockchain_request_duration_seconds',
  help: 'Duration of blockchain RPC requests in seconds',
  labelNames: ['method'],
  buckets: [0.1, 0.5, 1, 2, 5, 10],
});

export const blockchainRequestTotal = new Counter({
  name: 'fushuma_blockchain_requests_total',
  help: 'Total number of blockchain RPC requests',
  labelNames: ['method', 'status'],
});

export const blockchainEventsProcessed = new Counter({
  name: 'fushuma_blockchain_events_processed_total',
  help: 'Total number of blockchain events processed',
  labelNames: ['event_type', 'contract'],
});

/**
 * Governance metrics
 */
export const proposalsTotal = new Gauge({
  name: 'fushuma_proposals_total',
  help: 'Total number of proposals',
  labelNames: ['status', 'type'],
});

export const votesTotal = new Counter({
  name: 'fushuma_votes_total',
  help: 'Total number of votes cast',
  labelNames: ['proposal_type'],
});

export const delegationsTotal = new Gauge({
  name: 'fushuma_delegations_total',
  help: 'Total number of active delegations',
});

/**
 * Cache metrics
 */
export const cacheHits = new Counter({
  name: 'fushuma_cache_hits_total',
  help: 'Total number of cache hits',
  labelNames: ['cache_key'],
});

export const cacheMisses = new Counter({
  name: 'fushuma_cache_misses_total',
  help: 'Total number of cache misses',
  labelNames: ['cache_key'],
});

/**
 * Error metrics
 */
export const errorsTotal = new Counter({
  name: 'fushuma_errors_total',
  help: 'Total number of errors',
  labelNames: ['error_type', 'error_code'],
});

/**
 * Middleware to collect HTTP metrics
 */
export function metricsMiddleware(req: Request, res: Response, next: Function) {
  const start = Date.now();

  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    const route = req.route?.path || req.path;
    const statusCode = res.statusCode.toString();

    httpRequestDuration.labels(req.method, route, statusCode).observe(duration);
    httpRequestTotal.labels(req.method, route, statusCode).inc();
  });

  next();
}

/**
 * Metrics endpoint handler
 */
export async function metricsHandler(req: Request, res: Response) {
  try {
    res.set('Content-Type', register.contentType);
    const metrics = await register.metrics();
    res.end(metrics);
  } catch (error) {
    res.status(500).end(error);
  }
}

/**
 * Helper functions for recording metrics
 */
export const metrics = {
  /**
   * Record database query
   */
  recordDbQuery: (operation: string, table: string, duration: number, success: boolean) => {
    dbQueryDuration.labels(operation, table).observe(duration / 1000);
    dbQueryTotal.labels(operation, table, success ? 'success' : 'error').inc();
  },

  /**
   * Record blockchain request
   */
  recordBlockchainRequest: (method: string, duration: number, success: boolean) => {
    blockchainRequestDuration.labels(method).observe(duration / 1000);
    blockchainRequestTotal.labels(method, success ? 'success' : 'error').inc();
  },

  /**
   * Record blockchain event processed
   */
  recordBlockchainEvent: (eventType: string, contract: string) => {
    blockchainEventsProcessed.labels(eventType, contract).inc();
  },

  /**
   * Update proposal count
   */
  updateProposalCount: (status: string, type: string, count: number) => {
    proposalsTotal.labels(status, type).set(count);
  },

  /**
   * Record vote
   */
  recordVote: (proposalType: string) => {
    votesTotal.labels(proposalType).inc();
  },

  /**
   * Update delegation count
   */
  updateDelegationCount: (count: number) => {
    delegationsTotal.set(count);
  },

  /**
   * Record cache hit
   */
  recordCacheHit: (cacheKey: string) => {
    cacheHits.labels(cacheKey).inc();
  },

  /**
   * Record cache miss
   */
  recordCacheMiss: (cacheKey: string) => {
    cacheMisses.labels(cacheKey).inc();
  },

  /**
   * Record error
   */
  recordError: (errorType: string, errorCode: string) => {
    errorsTotal.labels(errorType, errorCode).inc();
  },
};

/**
 * Reset all metrics (useful for testing)
 */
export function resetMetrics() {
  register.clear();
}

