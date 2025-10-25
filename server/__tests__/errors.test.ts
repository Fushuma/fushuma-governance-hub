import { describe, it, expect } from 'vitest';
import {
  AppError,
  AuthenticationError,
  AuthorizationError,
  ValidationError,
  NotFoundError,
  DatabaseError,
  BlockchainError,
  RateLimitError,
  ErrorCode,
  isOperationalError,
  formatErrorResponse,
} from '../_core/errors';

describe('Error Classes', () => {
  describe('AppError', () => {
    it('should create error with correct properties', () => {
      const error = new AppError('Test error', ErrorCode.INTERNAL_ERROR, 500, true, { key: 'value' });
      
      expect(error.message).toBe('Test error');
      expect(error.code).toBe(ErrorCode.INTERNAL_ERROR);
      expect(error.statusCode).toBe(500);
      expect(error.isOperational).toBe(true);
      expect(error.context).toEqual({ key: 'value' });
    });

    it('should serialize to JSON', () => {
      const error = new AppError('Test error', ErrorCode.INTERNAL_ERROR);
      const json = error.toJSON();
      
      expect(json).toHaveProperty('name');
      expect(json).toHaveProperty('message');
      expect(json).toHaveProperty('code');
      expect(json).toHaveProperty('statusCode');
    });
  });

  describe('AuthenticationError', () => {
    it('should create authentication error with correct status code', () => {
      const error = new AuthenticationError();
      
      expect(error.statusCode).toBe(401);
      expect(error.code).toBe(ErrorCode.UNAUTHORIZED);
      expect(error.message).toBe('Authentication failed');
    });

    it('should accept custom message', () => {
      const error = new AuthenticationError('Invalid credentials');
      expect(error.message).toBe('Invalid credentials');
    });
  });

  describe('AuthorizationError', () => {
    it('should create authorization error with correct status code', () => {
      const error = new AuthorizationError();
      
      expect(error.statusCode).toBe(403);
      expect(error.code).toBe(ErrorCode.FORBIDDEN);
    });
  });

  describe('ValidationError', () => {
    it('should create validation error with correct status code', () => {
      const error = new ValidationError('Invalid input');
      
      expect(error.statusCode).toBe(400);
      expect(error.code).toBe(ErrorCode.VALIDATION_ERROR);
      expect(error.message).toBe('Invalid input');
    });
  });

  describe('NotFoundError', () => {
    it('should create not found error with default message', () => {
      const error = new NotFoundError();
      
      expect(error.statusCode).toBe(404);
      expect(error.code).toBe(ErrorCode.RECORD_NOT_FOUND);
      expect(error.message).toBe('Resource not found');
    });

    it('should accept custom resource name', () => {
      const error = new NotFoundError('Proposal');
      expect(error.message).toBe('Proposal not found');
    });
  });

  describe('DatabaseError', () => {
    it('should create database error', () => {
      const error = new DatabaseError('Connection failed');
      
      expect(error.statusCode).toBe(500);
      expect(error.code).toBe(ErrorCode.DATABASE_ERROR);
    });
  });

  describe('BlockchainError', () => {
    it('should create blockchain error', () => {
      const error = new BlockchainError('Transaction failed');
      
      expect(error.statusCode).toBe(500);
      expect(error.code).toBe(ErrorCode.BLOCKCHAIN_ERROR);
    });
  });

  describe('RateLimitError', () => {
    it('should create rate limit error', () => {
      const error = new RateLimitError();
      
      expect(error.statusCode).toBe(429);
      expect(error.code).toBe(ErrorCode.RATE_LIMIT_EXCEEDED);
    });
  });

  describe('isOperationalError', () => {
    it('should return true for operational errors', () => {
      const error = new ValidationError('Test');
      expect(isOperationalError(error)).toBe(true);
    });

    it('should return false for non-operational errors', () => {
      const error = new Error('Test');
      expect(isOperationalError(error)).toBe(false);
    });
  });

  describe('formatErrorResponse', () => {
    it('should format AppError correctly', () => {
      const error = new ValidationError('Invalid input', { field: 'email' });
      const response = formatErrorResponse(error);
      
      expect(response.success).toBe(false);
      expect(response.error.message).toBe('Invalid input');
      expect(response.error.code).toBe(ErrorCode.VALIDATION_ERROR);
    });

    it('should hide internal errors in production', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      
      const error = new Error('Internal error');
      const response = formatErrorResponse(error);
      
      expect(response.error.message).toBe('An unexpected error occurred');
      expect(response.error.code).toBe(ErrorCode.INTERNAL_ERROR);
      
      process.env.NODE_ENV = originalEnv;
    });
  });
});

