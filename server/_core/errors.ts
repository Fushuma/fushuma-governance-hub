/**
 * Custom error classes for the Fushuma Governance Hub
 * Provides structured error handling with proper error codes and messages
 */

export enum ErrorCode {
  // Authentication & Authorization
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  INVALID_TOKEN = 'INVALID_TOKEN',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  
  // Validation
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  INVALID_INPUT = 'INVALID_INPUT',
  MISSING_REQUIRED_FIELD = 'MISSING_REQUIRED_FIELD',
  
  // Database
  DATABASE_ERROR = 'DATABASE_ERROR',
  RECORD_NOT_FOUND = 'RECORD_NOT_FOUND',
  DUPLICATE_RECORD = 'DUPLICATE_RECORD',
  
  // Blockchain
  BLOCKCHAIN_ERROR = 'BLOCKCHAIN_ERROR',
  TRANSACTION_FAILED = 'TRANSACTION_FAILED',
  INVALID_ADDRESS = 'INVALID_ADDRESS',
  INSUFFICIENT_BALANCE = 'INSUFFICIENT_BALANCE',
  
  // Business Logic
  PROPOSAL_NOT_FOUND = 'PROPOSAL_NOT_FOUND',
  VOTING_CLOSED = 'VOTING_CLOSED',
  ALREADY_VOTED = 'ALREADY_VOTED',
  INSUFFICIENT_VOTING_POWER = 'INSUFFICIENT_VOTING_POWER',
  
  // External Services
  EXTERNAL_SERVICE_ERROR = 'EXTERNAL_SERVICE_ERROR',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  
  // General
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  NOT_IMPLEMENTED = 'NOT_IMPLEMENTED',
  BAD_REQUEST = 'BAD_REQUEST',
}

/**
 * Base application error class
 */
export class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly context?: Record<string, unknown>;

  constructor(
    message: string,
    code: ErrorCode = ErrorCode.INTERNAL_ERROR,
    statusCode: number = 500,
    isOperational: boolean = true,
    context?: Record<string, unknown>
  ) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.context = context;

    Error.captureStackTrace(this, this.constructor);
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      statusCode: this.statusCode,
      context: this.context,
    };
  }
}

/**
 * Authentication error
 */
export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication failed', context?: Record<string, unknown>) {
    super(message, ErrorCode.UNAUTHORIZED, 401, true, context);
  }
}

/**
 * Authorization error
 */
export class AuthorizationError extends AppError {
  constructor(message: string = 'Access forbidden', context?: Record<string, unknown>) {
    super(message, ErrorCode.FORBIDDEN, 403, true, context);
  }
}

/**
 * Validation error
 */
export class ValidationError extends AppError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, ErrorCode.VALIDATION_ERROR, 400, true, context);
  }
}

/**
 * Not found error
 */
export class NotFoundError extends AppError {
  constructor(resource: string = 'Resource', context?: Record<string, unknown>) {
    super(`${resource} not found`, ErrorCode.RECORD_NOT_FOUND, 404, true, context);
  }
}

/**
 * Database error
 */
export class DatabaseError extends AppError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, ErrorCode.DATABASE_ERROR, 500, true, context);
  }
}

/**
 * Blockchain error
 */
export class BlockchainError extends AppError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, ErrorCode.BLOCKCHAIN_ERROR, 500, true, context);
  }
}

/**
 * Rate limit error
 */
export class RateLimitError extends AppError {
  constructor(message: string = 'Rate limit exceeded', context?: Record<string, unknown>) {
    super(message, ErrorCode.RATE_LIMIT_EXCEEDED, 429, true, context);
  }
}

/**
 * External service error
 */
export class ExternalServiceError extends AppError {
  constructor(service: string, message: string, context?: Record<string, unknown>) {
    super(`${service}: ${message}`, ErrorCode.EXTERNAL_SERVICE_ERROR, 502, true, context);
  }
}

/**
 * Business logic error
 */
export class BusinessLogicError extends AppError {
  constructor(message: string, code: ErrorCode, context?: Record<string, unknown>) {
    super(message, code, 400, true, context);
  }
}

/**
 * Check if error is operational (expected) or programming error
 */
export function isOperationalError(error: Error): boolean {
  if (error instanceof AppError) {
    return error.isOperational;
  }
  return false;
}

/**
 * Format error for client response
 */
export function formatErrorResponse(error: Error) {
  if (error instanceof AppError) {
    return {
      success: false,
      error: {
        message: error.message,
        code: error.code,
        ...(process.env.NODE_ENV === 'development' && { context: error.context }),
      },
    };
  }

  // Don't expose internal error details in production
  if (process.env.NODE_ENV === 'production') {
    return {
      success: false,
      error: {
        message: 'An unexpected error occurred',
        code: ErrorCode.INTERNAL_ERROR,
      },
    };
  }

  return {
    success: false,
    error: {
      message: error.message,
      code: ErrorCode.INTERNAL_ERROR,
    },
  };
}

