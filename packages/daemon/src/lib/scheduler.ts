/**
 * Health check scheduler
 */

import { type ResolvedRuntime, collectRuntimes } from './config.js';
import { createLogger } from './logger.js';
import type { HealthCheckResult } from '../checkers/types.js';
import { runHealthCheck } from '../checkers/index.js';

const log = createLogger('scheduler');

/** Scheduled check with timing info */
interface ScheduledCheck {
  runtime: ResolvedRuntime;
  nextRunAt: number;
  timerId?: NodeJS.Timeout;
  running: boolean;
}

/** Check result handler */
export type CheckResultHandler = (
  runtime: ResolvedRuntime,
  result: HealthCheckResult
) => Promise<void>;

/** Scheduler for health checks */
export class Scheduler {
  private checks: Map<string, ScheduledCheck> = new Map();
  private running = false;
  private resultHandler?: CheckResultHandler;

  /** Start the scheduler */
  start(onResult?: CheckResultHandler): void {
    if (this.running) {
      log.warn('Scheduler already running');
      return;
    }

    this.running = true;
    this.resultHandler = onResult;

    log.info('Starting scheduler');
    this.loadRuntimes();
  }

  /** Stop the scheduler */
  stop(): void {
    if (!this.running) {
      return;
    }

    log.info('Stopping scheduler');
    this.running = false;

    // Clear all timers
    for (const check of this.checks.values()) {
      if (check.timerId) {
        clearTimeout(check.timerId);
      }
    }

    this.checks.clear();
  }

  /** Reload runtime configurations */
  reload(): void {
    log.info('Reloading runtime configurations');

    // Stop existing timers
    for (const check of this.checks.values()) {
      if (check.timerId) {
        clearTimeout(check.timerId);
      }
    }

    this.checks.clear();
    this.loadRuntimes();
  }

  /** Load runtimes and schedule checks */
  private loadRuntimes(): void {
    const runtimes = collectRuntimes();

    log.info(`Found ${runtimes.length} runtimes to monitor`);

    for (const runtime of runtimes) {
      if (!runtime.enabled) {
        log.debug(`Skipping disabled runtime: ${runtime.name}`);
        continue;
      }

      this.scheduleCheck(runtime);
    }
  }

  /** Schedule a health check for a runtime */
  private scheduleCheck(runtime: ResolvedRuntime): void {
    const key = `${runtime.projectPath}:${runtime.name}`;

    const check: ScheduledCheck = {
      runtime,
      nextRunAt: Date.now(),
      running: false,
    };

    this.checks.set(key, check);

    // Run immediately, then schedule recurring
    this.runCheck(key);
  }

  /** Run a health check */
  private async runCheck(key: string): Promise<void> {
    const check = this.checks.get(key);
    if (!check || !this.running) {
      return;
    }

    // Prevent concurrent runs
    if (check.running) {
      log.debug(`Check already running for ${check.runtime.name}, skipping`);
      this.scheduleNext(key);
      return;
    }

    check.running = true;

    const runtime = check.runtime;
    log.debug(`Running health check for ${runtime.name} (${runtime.type})`);

    try {
      const result = await runHealthCheck(runtime);

      log.debug(
        `Health check result for ${runtime.name}: ${result.success ? 'healthy' : 'unhealthy'}`,
        { responseTimeMs: result.responseTimeMs }
      );

      // Call result handler
      if (this.resultHandler) {
        try {
          await this.resultHandler(runtime, result);
        } catch (err) {
          log.error(`Error in result handler for ${runtime.name}`, err);
        }
      }
    } catch (err) {
      log.error(`Error running health check for ${runtime.name}`, err);
    } finally {
      check.running = false;
      this.scheduleNext(key);
    }
  }

  /** Schedule the next run for a check */
  private scheduleNext(key: string): void {
    const check = this.checks.get(key);
    if (!check || !this.running) {
      return;
    }

    check.nextRunAt = Date.now() + check.runtime.intervalMs;

    check.timerId = setTimeout(() => {
      this.runCheck(key);
    }, check.runtime.intervalMs);
  }

  /** Get scheduler status */
  getStatus(): {
    running: boolean;
    checks: Array<{
      project: string;
      runtime: string;
      type: string;
      intervalMs: number;
      nextRunAt: number;
      isRunning: boolean;
    }>;
  } {
    const checks = Array.from(this.checks.values()).map((check) => ({
      project: check.runtime.projectName,
      runtime: check.runtime.name,
      type: check.runtime.type,
      intervalMs: check.runtime.intervalMs,
      nextRunAt: check.nextRunAt,
      isRunning: check.running,
    }));

    return {
      running: this.running,
      checks,
    };
  }

  /** Run all checks once (for testing) */
  async runOnce(): Promise<Map<string, HealthCheckResult>> {
    const runtimes = collectRuntimes();
    const results = new Map<string, HealthCheckResult>();

    for (const runtime of runtimes) {
      if (!runtime.enabled) {
        continue;
      }

      const key = `${runtime.projectPath}:${runtime.name}`;

      try {
        const result = await runHealthCheck(runtime);
        results.set(key, result);

        if (this.resultHandler) {
          await this.resultHandler(runtime, result);
        }
      } catch (err) {
        log.error(`Error running health check for ${runtime.name}`, err);
        results.set(key, {
          success: false,
          errorMessage: err instanceof Error ? err.message : 'Unknown error',
          timestamp: new Date().toISOString(),
        });
      }
    }

    return results;
  }
}
