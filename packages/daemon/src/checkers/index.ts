/**
 * Health checker registry and runner
 */

import type { ResolvedRuntime } from '../lib/config.js';
import type { HealthChecker, HealthCheckResult } from './types.js';
import { failureResult } from './types.js';
import { HttpChecker } from './http.js';
import { TcpChecker } from './tcp.js';
import { ProcessChecker } from './process.js';
import { DockerChecker } from './docker.js';
import { CommandChecker } from './command.js';

export type { HealthCheckResult } from './types.js';

/** Registry of health checkers by type */
const checkers: Record<string, HealthChecker> = {
  http: new HttpChecker(),
  tcp: new TcpChecker(),
  process: new ProcessChecker(),
  docker: new DockerChecker(),
  command: new CommandChecker(),
};

/** Run a health check for a runtime */
export async function runHealthCheck(runtime: ResolvedRuntime): Promise<HealthCheckResult> {
  const checker = checkers[runtime.type];

  if (!checker) {
    return failureResult(`Unknown runtime type: ${runtime.type}`);
  }

  return checker.check(runtime);
}

/** Get available checker types */
export function getAvailableCheckerTypes(): string[] {
  return Object.keys(checkers);
}
