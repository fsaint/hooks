/**
 * Health checker types
 */

import type { ResolvedRuntime } from '../lib/config.js';

/** Health check result */
export interface HealthCheckResult {
  success: boolean;
  responseTimeMs?: number;
  statusCode?: number;
  errorMessage?: string;
  metadata?: Record<string, unknown>;
  timestamp: string;
}

/** Health checker interface */
export interface HealthChecker {
  check(runtime: ResolvedRuntime): Promise<HealthCheckResult>;
}

/** Create a successful result */
export function successResult(
  responseTimeMs: number,
  extra?: Partial<HealthCheckResult>
): HealthCheckResult {
  return {
    success: true,
    responseTimeMs,
    timestamp: new Date().toISOString(),
    ...extra,
  };
}

/** Create a failed result */
export function failureResult(
  errorMessage: string,
  extra?: Partial<HealthCheckResult>
): HealthCheckResult {
  return {
    success: false,
    errorMessage,
    timestamp: new Date().toISOString(),
    ...extra,
  };
}
