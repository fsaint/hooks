/**
 * Docker container health checker
 */

import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import type { ResolvedRuntime } from '../lib/config.js';
import type { HealthChecker, HealthCheckResult } from './types.js';
import { successResult, failureResult } from './types.js';

const execAsync = promisify(exec);

/** Docker health checker */
export class DockerChecker implements HealthChecker {
  async check(runtime: ResolvedRuntime): Promise<HealthCheckResult> {
    const config = runtime.config;

    if (config.type !== 'docker' || !config.container) {
      return failureResult('Invalid Docker configuration: missing container name');
    }

    const timeout = runtime.timeoutMs;
    const startTime = Date.now();

    try {
      // Get container status using docker inspect
      const containerName = config.container;

      // Escape the container name
      const escapedName = containerName.replace(/'/g, "'\\''");

      const { stdout } = await execAsync(
        `docker inspect --format='{{.State.Status}}:{{.State.Health.Status}}' '${escapedName}' 2>/dev/null || docker inspect --format='{{.State.Status}}' '${escapedName}'`,
        { timeout }
      );

      const responseTimeMs = Date.now() - startTime;
      const output = stdout.trim();

      // Parse the status
      const [status, healthStatus] = output.split(':');

      if (status !== 'running') {
        return failureResult(`Container is ${status}`, {
          responseTimeMs,
          metadata: { status, healthStatus },
        });
      }

      // If container has health check, verify it's healthy
      if (healthStatus && healthStatus !== 'healthy' && healthStatus !== '') {
        return failureResult(`Container health check: ${healthStatus}`, {
          responseTimeMs,
          metadata: { status, healthStatus },
        });
      }

      return successResult(responseTimeMs, {
        metadata: { status, healthStatus: healthStatus || 'none' },
      });
    } catch (err) {
      const responseTimeMs = Date.now() - startTime;

      if (err instanceof Error) {
        // Check if container doesn't exist
        if (err.message.includes('No such object') || err.message.includes('not found')) {
          return failureResult(`Container "${config.container}" not found`, {
            responseTimeMs,
          });
        }
        return failureResult(err.message, { responseTimeMs });
      }

      return failureResult('Unknown error', { responseTimeMs });
    }
  }
}
