/**
 * Process health checker
 */

import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import type { ResolvedRuntime } from '../lib/config.js';
import type { HealthChecker, HealthCheckResult } from './types.js';
import { successResult, failureResult } from './types.js';

const execAsync = promisify(exec);

/** Process health checker */
export class ProcessChecker implements HealthChecker {
  async check(runtime: ResolvedRuntime): Promise<HealthCheckResult> {
    const config = runtime.config;

    if (config.type !== 'process' || !config.match) {
      return failureResult('Invalid process configuration: missing match pattern');
    }

    const timeout = runtime.timeoutMs;
    const startTime = Date.now();

    try {
      // Use pgrep to find matching processes
      const pattern = config.match;

      // Escape the pattern for use in shell
      const escapedPattern = pattern.replace(/'/g, "'\\''");

      const { stdout } = await execAsync(`pgrep -f '${escapedPattern}'`, {
        timeout,
      });

      const responseTimeMs = Date.now() - startTime;
      const pids = stdout.trim().split('\n').filter(Boolean);

      if (pids.length === 0) {
        return failureResult(`No process matching "${pattern}" found`, {
          responseTimeMs,
        });
      }

      return successResult(responseTimeMs, {
        metadata: { pids, count: pids.length },
      });
    } catch (err) {
      const responseTimeMs = Date.now() - startTime;

      // pgrep returns exit code 1 when no processes match
      if (err instanceof Error && 'code' in err && err.code === 1) {
        return failureResult(`No process matching "${config.match}" found`, {
          responseTimeMs,
        });
      }

      if (err instanceof Error) {
        return failureResult(err.message, { responseTimeMs });
      }

      return failureResult('Unknown error', { responseTimeMs });
    }
  }
}
