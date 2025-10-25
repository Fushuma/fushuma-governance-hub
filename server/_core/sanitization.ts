/**
 * Input sanitization utilities for the Fushuma Governance Hub
 * Provides functions to clean and validate user inputs
 */

import { isAddress } from 'viem';

/**
 * Sanitize string input by removing potentially dangerous characters
 */
export function sanitizeString(input: string, maxLength: number = 1000): string {
  if (typeof input !== 'string') {
    throw new Error('Input must be a string');
  }

  // Trim whitespace
  let sanitized = input.trim();

  // Limit length
  if (sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength);
  }

  // Remove null bytes
  sanitized = sanitized.replace(/\0/g, '');

  // Remove control characters except newlines and tabs
  sanitized = sanitized.replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, '');

  return sanitized;
}

/**
 * Sanitize HTML by escaping special characters
 */
export function sanitizeHtml(input: string): string {
  const htmlEscapeMap: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;',
  };

  return input.replace(/[&<>"'/]/g, (char) => htmlEscapeMap[char]);
}

/**
 * Sanitize and validate Ethereum address
 */
export function sanitizeAddress(address: string): string {
  if (!address || typeof address !== 'string') {
    throw new Error('Invalid address format');
  }

  const trimmed = address.trim().toLowerCase();

  if (!isAddress(trimmed)) {
    throw new Error('Invalid Ethereum address');
  }

  return trimmed;
}

/**
 * Sanitize URL
 */
export function sanitizeUrl(url: string, allowedProtocols: string[] = ['http', 'https', 'ipfs']): string {
  if (!url || typeof url !== 'string') {
    throw new Error('Invalid URL format');
  }

  const trimmed = url.trim();

  try {
    const parsed = new URL(trimmed);
    
    if (!allowedProtocols.includes(parsed.protocol.replace(':', ''))) {
      throw new Error(`Protocol ${parsed.protocol} not allowed`);
    }

    return trimmed;
  } catch (error) {
    throw new Error('Invalid URL format');
  }
}

/**
 * Sanitize number input
 */
export function sanitizeNumber(input: any, min?: number, max?: number): number {
  const num = Number(input);

  if (isNaN(num) || !isFinite(num)) {
    throw new Error('Invalid number format');
  }

  if (min !== undefined && num < min) {
    throw new Error(`Number must be at least ${min}`);
  }

  if (max !== undefined && num > max) {
    throw new Error(`Number must be at most ${max}`);
  }

  return num;
}

/**
 * Sanitize integer input
 */
export function sanitizeInteger(input: any, min?: number, max?: number): number {
  const num = sanitizeNumber(input, min, max);

  if (!Number.isInteger(num)) {
    throw new Error('Input must be an integer');
  }

  return num;
}

/**
 * Sanitize boolean input
 */
export function sanitizeBoolean(input: any): boolean {
  if (typeof input === 'boolean') {
    return input;
  }

  if (typeof input === 'string') {
    const lower = input.toLowerCase();
    if (lower === 'true' || lower === '1' || lower === 'yes') {
      return true;
    }
    if (lower === 'false' || lower === '0' || lower === 'no') {
      return false;
    }
  }

  if (typeof input === 'number') {
    return input !== 0;
  }

  throw new Error('Invalid boolean format');
}

/**
 * Sanitize email address
 */
export function sanitizeEmail(email: string): string {
  if (!email || typeof email !== 'string') {
    throw new Error('Invalid email format');
  }

  const trimmed = email.trim().toLowerCase();

  // Basic email validation regex
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailRegex.test(trimmed)) {
    throw new Error('Invalid email format');
  }

  return trimmed;
}

/**
 * Sanitize JSON input
 */
export function sanitizeJson<T = any>(input: string, maxSize: number = 1024 * 100): T {
  if (!input || typeof input !== 'string') {
    throw new Error('Invalid JSON format');
  }

  if (input.length > maxSize) {
    throw new Error(`JSON input too large (max ${maxSize} bytes)`);
  }

  try {
    return JSON.parse(input);
  } catch (error) {
    throw new Error('Invalid JSON format');
  }
}

/**
 * Sanitize array input
 */
export function sanitizeArray<T>(
  input: any,
  itemSanitizer: (item: any) => T,
  maxLength: number = 1000
): T[] {
  if (!Array.isArray(input)) {
    throw new Error('Input must be an array');
  }

  if (input.length > maxLength) {
    throw new Error(`Array too large (max ${maxLength} items)`);
  }

  return input.map(itemSanitizer);
}

/**
 * Sanitize object keys to prevent prototype pollution
 */
export function sanitizeObjectKeys<T extends Record<string, any>>(
  obj: T,
  allowedKeys: string[]
): Partial<T> {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) {
    throw new Error('Input must be an object');
  }

  const sanitized: Partial<T> = {};

  for (const key of allowedKeys) {
    if (key in obj && obj[key] !== undefined) {
      // Prevent prototype pollution
      if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
        continue;
      }
      sanitized[key as keyof T] = obj[key];
    }
  }

  return sanitized;
}

/**
 * Sanitize file name
 */
export function sanitizeFileName(fileName: string, maxLength: number = 255): string {
  if (!fileName || typeof fileName !== 'string') {
    throw new Error('Invalid file name');
  }

  let sanitized = fileName.trim();

  // Remove path traversal attempts
  sanitized = sanitized.replace(/\.\./g, '');
  sanitized = sanitized.replace(/[\/\\]/g, '');

  // Remove potentially dangerous characters
  sanitized = sanitized.replace(/[<>:"|?*\x00-\x1F]/g, '');

  // Limit length
  if (sanitized.length > maxLength) {
    const ext = sanitized.split('.').pop();
    const name = sanitized.substring(0, maxLength - (ext ? ext.length + 1 : 0));
    sanitized = ext ? `${name}.${ext}` : name;
  }

  if (!sanitized) {
    throw new Error('Invalid file name after sanitization');
  }

  return sanitized;
}

/**
 * Sanitize markdown content (basic sanitization, not full XSS protection)
 */
export function sanitizeMarkdown(content: string, maxLength: number = 50000): string {
  if (!content || typeof content !== 'string') {
    throw new Error('Invalid markdown content');
  }

  let sanitized = content.trim();

  // Limit length
  if (sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength);
  }

  // Remove null bytes and control characters
  sanitized = sanitized.replace(/\0/g, '');
  sanitized = sanitized.replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, '');

  // Remove script tags (basic protection)
  sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');

  return sanitized;
}

/**
 * Rate limit key sanitization
 */
export function sanitizeRateLimitKey(key: string): string {
  if (!key || typeof key !== 'string') {
    throw new Error('Invalid rate limit key');
  }

  // Only allow alphanumeric, hyphens, underscores, and dots
  const sanitized = key.replace(/[^a-zA-Z0-9\-_.]/g, '');

  if (!sanitized) {
    throw new Error('Invalid rate limit key after sanitization');
  }

  return sanitized;
}

