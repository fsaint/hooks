/**
 * HTTP health checker
 */

import type { ResolvedRuntime } from '../lib/config.js';
import type { HealthChecker, HealthCheckResult } from './types.js';
import { successResult, failureResult } from './types.js';

/** HTTP health checker */
export class HttpChecker implements HealthChecker {
  async check(runtime: ResolvedRuntime): Promise<HealthCheckResult> {
    const config = runtime.config;

    if (config.type !== 'http' || !config.url) {
      return failureResult('Invalid HTTP configuration: missing URL');
    }

    const method = config.method ?? 'GET';
    const expectedStatus = config.expectedStatus ?? 200;
    const timeout = runtime.timeoutMs;

    const startTime = Date.now();

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const headers: Record<string, string> = {
        'User-Agent': 'hooks-daemon/1.0',
        ...config.headers,
      };

      const response = await fetch(config.url, {
        method,
        headers,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const responseTimeMs = Date.now() - startTime;

      if (response.status !== expectedStatus) {
        return failureResult(
          `Unexpected status: ${response.status} (expected ${expectedStatus})`,
          { responseTimeMs, statusCode: response.status }
        );
      }

      return successResult(responseTimeMs, { statusCode: response.status });
    } catch (err) {
      const responseTimeMs = Date.now() - startTime;

      if (err instanceof Error) {
        if (err.name === 'AbortError') {
          return failureResult(`Request timed out after ${timeout}ms`, { responseTimeMs });
        }
        return failureResult(err.message, { responseTimeMs });
      }

      return failureResult('Unknown error', { responseTimeMs });
    }
  }
}
