/**
 * TCP health checker
 */

import { createConnection, type Socket } from 'node:net';
import type { ResolvedRuntime } from '../lib/config.js';
import type { HealthChecker, HealthCheckResult } from './types.js';
import { successResult, failureResult } from './types.js';

/** TCP health checker */
export class TcpChecker implements HealthChecker {
  async check(runtime: ResolvedRuntime): Promise<HealthCheckResult> {
    const config = runtime.config;

    if (config.type !== 'tcp' || !config.host || !config.port) {
      return failureResult('Invalid TCP configuration: missing host or port');
    }

    // Extract validated values for TypeScript narrowing
    const host = config.host;
    const port = config.port;
    const timeout = runtime.timeoutMs;
    const startTime = Date.now();

    return new Promise<HealthCheckResult>((resolve) => {
      let socket: Socket | null = null;
      let resolved = false;

      const cleanup = () => {
        if (socket) {
          socket.destroy();
          socket = null;
        }
      };

      const timeoutId = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          cleanup();
          resolve(
            failureResult(`Connection timed out after ${timeout}ms`, {
              responseTimeMs: Date.now() - startTime,
            })
          );
        }
      }, timeout);

      socket = createConnection(
        {
          host,
          port,
        },
        () => {
          if (!resolved) {
            resolved = true;
            clearTimeout(timeoutId);
            const responseTimeMs = Date.now() - startTime;
            cleanup();
            resolve(successResult(responseTimeMs));
          }
        }
      );

      socket.on('error', (err) => {
        if (!resolved) {
          resolved = true;
          clearTimeout(timeoutId);
          cleanup();
          resolve(
            failureResult(err.message, {
              responseTimeMs: Date.now() - startTime,
            })
          );
        }
      });
    });
  }
}
