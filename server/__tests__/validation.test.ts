import { describe, it, expect } from 'vitest';
import { sanitizeString, sanitizeAddress, sanitizeNumber, sanitizeEmail, sanitizeUrl } from '../_core/sanitization';

describe('Input Sanitization', () => {
  describe('sanitizeString', () => {
    it('should trim whitespace', () => {
      expect(sanitizeString('  hello  ')).toBe('hello');
    });

    it('should remove null bytes', () => {
      expect(sanitizeString('hello\0world')).toBe('helloworld');
    });

    it('should limit string length', () => {
      const longString = 'a'.repeat(2000);
      const result = sanitizeString(longString, 100);
      expect(result.length).toBe(100);
    });

    it('should remove control characters', () => {
      expect(sanitizeString('hello\x00\x01world')).toBe('helloworld');
    });

    it('should throw error for non-string input', () => {
      expect(() => sanitizeString(123 as any)).toThrow('Input must be a string');
    });
  });

  describe('sanitizeAddress', () => {
    it('should accept valid Ethereum address', () => {
      const address = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0';
      const result = sanitizeAddress(address);
      expect(result).toBe(address.toLowerCase());
    });

    it('should reject invalid address', () => {
      expect(() => sanitizeAddress('invalid')).toThrow('Invalid Ethereum address');
    });

    it('should reject empty address', () => {
      expect(() => sanitizeAddress('')).toThrow('Invalid address format');
    });
  });

  describe('sanitizeNumber', () => {
    it('should parse valid number', () => {
      expect(sanitizeNumber('123')).toBe(123);
      expect(sanitizeNumber(456)).toBe(456);
    });

    it('should enforce minimum value', () => {
      expect(() => sanitizeNumber(5, 10)).toThrow('Number must be at least 10');
    });

    it('should enforce maximum value', () => {
      expect(() => sanitizeNumber(100, 0, 50)).toThrow('Number must be at most 50');
    });

    it('should reject NaN', () => {
      expect(() => sanitizeNumber('invalid')).toThrow('Invalid number format');
    });

    it('should reject Infinity', () => {
      expect(() => sanitizeNumber(Infinity)).toThrow('Invalid number format');
    });
  });

  describe('sanitizeEmail', () => {
    it('should accept valid email', () => {
      expect(sanitizeEmail('test@example.com')).toBe('test@example.com');
    });

    it('should convert to lowercase', () => {
      expect(sanitizeEmail('Test@Example.COM')).toBe('test@example.com');
    });

    it('should reject invalid email', () => {
      expect(() => sanitizeEmail('invalid')).toThrow('Invalid email format');
      expect(() => sanitizeEmail('test@')).toThrow('Invalid email format');
      expect(() => sanitizeEmail('@example.com')).toThrow('Invalid email format');
    });
  });

  describe('sanitizeUrl', () => {
    it('should accept valid HTTP URL', () => {
      const url = 'https://example.com';
      expect(sanitizeUrl(url)).toBe(url);
    });

    it('should accept IPFS URL', () => {
      const url = 'ipfs://QmHash';
      expect(sanitizeUrl(url)).toBe(url);
    });

    it('should reject invalid protocol', () => {
      expect(() => sanitizeUrl('ftp://example.com')).toThrow();
    });

    it('should reject invalid URL format', () => {
      expect(() => sanitizeUrl('not a url')).toThrow('Invalid URL format');
    });
  });
});

