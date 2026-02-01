/**
 * Health checker types tests
 */

import { describe, it, expect } from 'vitest';
import { successResult, failureResult } from './types.js';

describe('Health Check Result Helpers', () => {
  describe('successResult', () => {
    it('should create a success result', () => {
      const result = successResult(150);

      expect(result.success).toBe(true);
      expect(result.responseTimeMs).toBe(150);
      expect(result.timestamp).toBeDefined();
    });

    it('should include extra fields', () => {
      const result = successResult(100, {
        statusCode: 200,
        metadata: { server: 'nginx' },
      });

      expect(result.success).toBe(true);
      expect(result.responseTimeMs).toBe(100);
      expect(result.statusCode).toBe(200);
      expect(result.metadata).toEqual({ server: 'nginx' });
    });
  });

  describe('failureResult', () => {
    it('should create a failure result', () => {
      const result = failureResult('Connection refused');

      expect(result.success).toBe(false);
      expect(result.errorMessage).toBe('Connection refused');
      expect(result.timestamp).toBeDefined();
    });

    it('should include extra fields', () => {
      const result = failureResult('Timeout', {
        responseTimeMs: 5000,
        metadata: { host: 'example.com' },
      });

      expect(result.success).toBe(false);
      expect(result.errorMessage).toBe('Timeout');
      expect(result.responseTimeMs).toBe(5000);
      expect(result.metadata).toEqual({ host: 'example.com' });
    });
  });
});
