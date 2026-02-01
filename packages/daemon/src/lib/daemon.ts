/**
 * Main daemon class
 */

import { watch, type FSWatcher } from 'node:fs';
import { join } from 'node:path';
import { CONFIG_FILES, type ReportRuntimeStatusRequest } from '@hooks/shared';
import { type ResolvedRuntime, findProjectPaths, getGlobalConfigDir } from './config.js';
import { configureLogger, info, error, warn, debug } from './logger.js';
import { acquirePidFile, removePidFile, isDaemonRunning } from './pid.js';
import { Scheduler } from './scheduler.js';
import { getApiClient, resetApiClient } from './api-client.js';
import type { HealthCheckResult } from '../checkers/types.js';

/** Daemon options */
export interface DaemonOptions {
  logLevel?: 'debug' | 'info' | 'warn' | 'error';
  logToConsole?: boolean;
  watchConfig?: boolean;
}

/** Daemon status */
export interface DaemonStatus {
  running: boolean;
  pid?: number;
  uptime?: number;
  checksScheduled: number;
  lastCheck?: string;
}

/** The main daemon class */
export class Daemon {
  private scheduler: Scheduler;
  private startTime?: number;
  private lastCheckTime?: string;
  private configWatchers: FSWatcher[] = [];
  private shutdownRequested = false;
  private options: DaemonOptions;

  constructor(options: DaemonOptions = {}) {
    this.options = {
      logLevel: 'info',
      logToConsole: true,
      watchConfig: true,
      ...options,
    };

    this.scheduler = new Scheduler();
  }

  /** Start the daemon */
  async start(): Promise<boolean> {
    // Configure logging
    configureLogger({
      level: this.options.logLevel ?? 'info',
      console: this.options.logToConsole ?? true,
    });

    info('Starting hooks daemon');

    // Check if already running
    const status = isDaemonRunning();
    if (status.running) {
      error(`Daemon is already running with PID ${status.pid}`);
      return false;
    }

    // Acquire PID file
    if (!acquirePidFile()) {
      error('Failed to acquire PID file');
      return false;
    }

    this.startTime = Date.now();

    // Set up signal handlers
    this.setupSignalHandlers();

    // Start the scheduler
    this.scheduler.start(this.handleCheckResult.bind(this));

    // Watch for configuration changes
    if (this.options.watchConfig) {
      this.startConfigWatchers();
    }

    info('Daemon started successfully');
    return true;
  }

  /** Stop the daemon */
  async stop(): Promise<void> {
    if (this.shutdownRequested) {
      return;
    }

    this.shutdownRequested = true;
    info('Stopping daemon');

    // Stop config watchers
    for (const watcher of this.configWatchers) {
      watcher.close();
    }
    this.configWatchers = [];

    // Stop the scheduler
    this.scheduler.stop();

    // Remove PID file
    removePidFile();

    info('Daemon stopped');
  }

  /** Get daemon status */
  getStatus(): DaemonStatus {
    const schedulerStatus = this.scheduler.getStatus();

    return {
      running: schedulerStatus.running,
      pid: process.pid,
      uptime: this.startTime ? Date.now() - this.startTime : undefined,
      checksScheduled: schedulerStatus.checks.length,
      lastCheck: this.lastCheckTime,
    };
  }

  /** Run checks once (for testing) */
  async runOnce(): Promise<void> {
    info('Running health checks once');

    await this.scheduler.runOnce();

    info('Health checks completed');
  }

  /** Handle health check result */
  private async handleCheckResult(
    runtime: ResolvedRuntime,
    result: HealthCheckResult
  ): Promise<void> {
    this.lastCheckTime = new Date().toISOString();

    const status = result.success ? 'healthy' : 'unhealthy';
    const msg = `[${runtime.projectName}/${runtime.name}] ${status}`;

    if (result.success) {
      debug(msg, { responseTimeMs: result.responseTimeMs });
    } else {
      warn(msg, { error: result.errorMessage });
    }

    // Report to server
    const client = getApiClient();
    if (client.isAuthenticated()) {
      const request: ReportRuntimeStatusRequest = {
        projectId: runtime.projectId,
        runtimeName: runtime.name,
        success: result.success,
        responseTimeMs: result.responseTimeMs,
        statusCode: result.statusCode,
        errorMessage: result.errorMessage,
        metadata: result.metadata,
      };

      await client.reportRuntimeStatus(request);
    }
  }

  /** Set up signal handlers for graceful shutdown */
  private setupSignalHandlers(): void {
    const handleSignal = (signal: string) => {
      info(`Received ${signal}, shutting down`);
      this.stop();
      process.exit(0);
    };

    process.on('SIGINT', () => handleSignal('SIGINT'));
    process.on('SIGTERM', () => handleSignal('SIGTERM'));

    // Handle SIGHUP for config reload
    process.on('SIGHUP', () => {
      info('Received SIGHUP, reloading configuration');
      resetApiClient();
      this.scheduler.reload();
    });
  }

  /** Start watching configuration files for changes */
  private startConfigWatchers(): void {
    // Watch global config
    const globalConfigDir = getGlobalConfigDir();
    this.watchDirectory(globalConfigDir);

    // Watch each project's config
    const projectPaths = findProjectPaths();
    for (const projectPath of projectPaths) {
      const configDir = join(projectPath, CONFIG_FILES.PROJECT_DIR);
      this.watchDirectory(configDir);
    }
  }

  /** Watch a directory for changes */
  private watchDirectory(dirPath: string): void {
    try {
      const watcher = watch(dirPath, { persistent: false }, (eventType, filename) => {
        if (filename?.endsWith('.yaml') || filename?.endsWith('.yml')) {
          debug(`Config change detected: ${filename}`);
          this.scheduleReload();
        }
      });

      this.configWatchers.push(watcher);
    } catch {
      // Directory might not exist
    }
  }

  /** Debounced reload */
  private reloadTimeout?: NodeJS.Timeout;

  private scheduleReload(): void {
    if (this.reloadTimeout) {
      clearTimeout(this.reloadTimeout);
    }

    this.reloadTimeout = setTimeout(() => {
      info('Configuration changed, reloading');
      resetApiClient();
      this.scheduler.reload();
    }, 1000); // Debounce for 1 second
  }
}
