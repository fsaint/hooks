/**
 * Command health checker
 */

import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import type { ResolvedRuntime } from '../lib/config.js';
import type { HealthChecker, HealthCheckResult } from './types.js';
import { successResult, failureResult } from './types.js';

const execAsync = promisify(exec);

/** Command health checker */
export class CommandChecker implements HealthChecker {
  async check(runtime: ResolvedRuntime): Promise<HealthCheckResult> {
    const config = runtime.config;

    if (config.type !== 'command' || !config.command) {
      return failureResult('Invalid command configuration: missing command');
    }

    const timeout = runtime.timeoutMs;
    const successExitCode = config.successExitCode ?? 0;
    const startTime = Date.now();

    try {
      const { stdout, stderr } = await execAsync(config.command, {
        timeout,
        cwd: runtime.projectPath,
      });

      const responseTimeMs = Date.now() - startTime;

      // Command succeeded (exit code 0)
      return successResult(responseTimeMs, {
        metadata: {
          stdout: stdout.slice(0, 1000),
          stderr: stderr.slice(0, 1000),
        },
      });
    } catch (err) {
      const responseTimeMs = Date.now() - startTime;

      if (err instanceof Error && 'code' in err) {
        const exitCode = err.code as number;

        // Check if this exit code is considered success
        if (exitCode === successExitCode) {
          return successResult(responseTimeMs, {
            metadata: { exitCode },
          });
        }

        return failureResult(`Command exited with code ${exitCode}`, {
          responseTimeMs,
          metadata: { exitCode },
        });
      }

      if (err instanceof Error) {
        if (err.message.includes('ETIMEDOUT') || err.message.includes('timed out')) {
          return failureResult(`Command timed out after ${timeout}ms`, {
            responseTimeMs,
          });
        }
        return failureResult(err.message, { responseTimeMs });
      }

      return failureResult('Unknown error', { responseTimeMs });
    }
  }
}
