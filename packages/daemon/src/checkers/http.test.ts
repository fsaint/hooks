/**
 * HTTP checker tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { HttpChecker } from './http.js';
import type { ResolvedRuntime } from '../lib/config.js';

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('HttpChecker', () => {
  let checker: HttpChecker;

  beforeEach(() => {
    checker = new HttpChecker();
    vi.useFakeTimers();
    mockFetch.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const createRuntime = (config: Record<string, unknown>): ResolvedRuntime => ({
    name: 'test-runtime',
    type: 'http',
    config: { type: 'http', ...config },
    intervalMs: 30000,
    timeoutMs: 5000,
    enabled: true,
    projectId: 'test-project',
    alertOnDown: true,
  });

  describe('check', () => {
    it('should return failure for missing URL', async () => {
      const runtime = createRuntime({});

      const result = await checker.check(runtime);

      expect(result.success).toBe(false);
      expect(result.errorMessage).toContain('missing URL');
    });

    it('should return success for valid response', async () => {
      const runtime = createRuntime({ url: 'https://example.com' });

      mockFetch.mockResolvedValueOnce({
        status: 200,
        ok: true,
      });

      vi.setSystemTime(new Date('2024-01-01T00:00:00Z'));

      const result = await checker.check(runtime);

      expect(result.success).toBe(true);
      expect(result.statusCode).toBe(200);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://example.com',
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'User-Agent': 'hooks-daemon/1.0',
          }),
        })
      );
    });

    it('should return failure for unexpected status', async () => {
      const runtime = createRuntime({
        url: 'https://example.com',
        expectedStatus: 200,
      });

      mockFetch.mockResolvedValueOnce({
        status: 500,
        ok: false,
      });

      const result = await checker.check(runtime);

      expect(result.success).toBe(false);
      expect(result.errorMessage).toContain('Unexpected status: 500');
      // statusCode is in metadata extra param passed to failureResult
      expect(result.responseTimeMs).toBeDefined();
    });

    it('should use custom method', async () => {
      const runtime = createRuntime({
        url: 'https://example.com/health',
        method: 'POST',
      });

      mockFetch.mockResolvedValueOnce({
        status: 200,
        ok: true,
      });

      await checker.check(runtime);

      expect(mockFetch).toHaveBeenCalledWith(
        'https://example.com/health',
        expect.objectContaining({
          method: 'POST',
        })
      );
    });

    it('should use custom headers', async () => {
      const runtime = createRuntime({
        url: 'https://example.com',
        headers: { 'X-Custom-Header': 'test-value' },
      });

      mockFetch.mockResolvedValueOnce({
        status: 200,
        ok: true,
      });

      await checker.check(runtime);

      expect(mockFetch).toHaveBeenCalledWith(
        'https://example.com',
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-Custom-Header': 'test-value',
          }),
        })
      );
    });

    it('should return failure on network error', async () => {
      const runtime = createRuntime({ url: 'https://example.com' });

      mockFetch.mockRejectedValueOnce(new Error('Network unreachable'));

      const result = await checker.check(runtime);

      expect(result.success).toBe(false);
      expect(result.errorMessage).toBe('Network unreachable');
    });

    it('should return failure on abort (timeout)', async () => {
      const runtime = createRuntime({ url: 'https://example.com' });

      const abortError = new Error('The operation was aborted');
      abortError.name = 'AbortError';
      mockFetch.mockRejectedValueOnce(abortError);

      const result = await checker.check(runtime);

      expect(result.success).toBe(false);
      expect(result.errorMessage).toContain('timed out');
    });
  });
});
