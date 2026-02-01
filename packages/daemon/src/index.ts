#!/usr/bin/env node

/**
 * Hooks Daemon - Background service for runtime health checks
 */

import { Command } from 'commander';
import { VERSION, formatDuration } from '@hooks/shared';
import { Daemon } from './lib/daemon.js';
import {
  isDaemonRunning,
  readPidFile,
  getPidFilePath,
  getLogFilePath,
  collectRuntimes,
  registerProjectPath,
} from './lib/index.js';

const program = new Command();

program
  .name('hooks-daemon')
  .description('Background daemon for runtime health checks')
  .version(VERSION);

/** Start the daemon */
program
  .command('start')
  .description('Start the daemon')
  .option('-f, --foreground', 'Run in foreground (don\'t daemonize)')
  .option('-l, --log-level <level>', 'Log level (debug, info, warn, error)', 'info')
  .option('--no-watch', 'Disable configuration hot-reload')
  .action(async (options: {
    foreground?: boolean;
    logLevel: string;
    watch: boolean;
  }) => {
    const status = isDaemonRunning();

    if (status.running) {
      console.error(`Daemon is already running with PID ${status.pid}`);
      process.exit(1);
    }

    const daemon = new Daemon({
      logLevel: options.logLevel as 'debug' | 'info' | 'warn' | 'error',
      logToConsole: options.foreground ?? false,
      watchConfig: options.watch,
    });

    const started = await daemon.start();

    if (!started) {
      process.exit(1);
    }

    if (options.foreground) {
      console.log('Daemon running in foreground. Press Ctrl+C to stop.');
      // Keep the process running
      await new Promise(() => {});
    } else {
      console.log(`Daemon started with PID ${process.pid}`);
      console.log(`Log file: ${getLogFilePath()}`);
      console.log(`PID file: ${getPidFilePath()}`);
    }
  });

/** Stop the daemon */
program
  .command('stop')
  .description('Stop the daemon')
  .action(() => {
    const status = isDaemonRunning();

    if (!status.running) {
      console.log('Daemon is not running');
      return;
    }

    try {
      process.kill(status.pid!, 'SIGTERM');
      console.log(`Sent SIGTERM to daemon (PID ${status.pid})`);
    } catch (err) {
      console.error(`Failed to stop daemon: ${err instanceof Error ? err.message : 'Unknown error'}`);
      process.exit(1);
    }
  });

/** Reload daemon configuration */
program
  .command('reload')
  .description('Reload daemon configuration')
  .action(() => {
    const status = isDaemonRunning();

    if (!status.running) {
      console.log('Daemon is not running');
      process.exit(1);
    }

    try {
      process.kill(status.pid!, 'SIGHUP');
      console.log(`Sent SIGHUP to daemon (PID ${status.pid})`);
    } catch (err) {
      console.error(`Failed to reload daemon: ${err instanceof Error ? err.message : 'Unknown error'}`);
      process.exit(1);
    }
  });

/** Check daemon status */
program
  .command('status')
  .description('Check daemon status')
  .option('--json', 'Output in JSON format')
  .action((options: { json?: boolean }) => {
    const status = isDaemonRunning();
    const runtimes = collectRuntimes();

    if (options.json) {
      console.log(JSON.stringify({
        running: status.running,
        pid: status.pid,
        pidFile: getPidFilePath(),
        logFile: getLogFilePath(),
        runtimes: runtimes.length,
      }, null, 2));
    } else {
      console.log();
      console.log(`Status: ${status.running ? 'Running' : 'Stopped'}`);
      if (status.running) {
        console.log(`PID: ${status.pid}`);
      }
      console.log(`PID file: ${getPidFilePath()}`);
      console.log(`Log file: ${getLogFilePath()}`);
      console.log(`Runtimes configured: ${runtimes.length}`);
      console.log();
    }
  });

/** Run health checks once */
program
  .command('check')
  .description('Run health checks once and exit')
  .option('--json', 'Output in JSON format')
  .action(async (options: { json?: boolean }) => {
    const daemon = new Daemon({
      logLevel: 'warn',
      logToConsole: !options.json,
      watchConfig: false,
    });

    const results: Array<{
      project: string;
      runtime: string;
      type: string;
      success: boolean;
      responseTimeMs?: number;
      error?: string;
    }> = [];

    // Collect results
    const runtimes = collectRuntimes();

    if (runtimes.length === 0) {
      if (options.json) {
        console.log(JSON.stringify({ results: [] }));
      } else {
        console.log('No runtimes configured');
      }
      return;
    }

    // Import runHealthCheck
    const { runHealthCheck } = await import('./checkers/index.js');

    for (const runtime of runtimes) {
      if (!runtime.enabled) continue;

      const result = await runHealthCheck(runtime);

      results.push({
        project: runtime.projectName,
        runtime: runtime.name,
        type: runtime.type,
        success: result.success,
        responseTimeMs: result.responseTimeMs,
        error: result.errorMessage,
      });

      if (!options.json) {
        const status = result.success ? '✓' : '✗';
        const time = result.responseTimeMs ? ` (${result.responseTimeMs}ms)` : '';
        const error = result.errorMessage ? ` - ${result.errorMessage}` : '';
        console.log(`${status} [${runtime.projectName}] ${runtime.name}${time}${error}`);
      }
    }

    if (options.json) {
      console.log(JSON.stringify({ results }, null, 2));
    }

    // Exit with error if any check failed
    const hasFailures = results.some(r => !r.success);
    process.exit(hasFailures ? 1 : 0);
  });

/** List configured runtimes */
program
  .command('list')
  .description('List configured runtimes')
  .option('--json', 'Output in JSON format')
  .action((options: { json?: boolean }) => {
    const runtimes = collectRuntimes();

    if (options.json) {
      console.log(JSON.stringify(runtimes, null, 2));
    } else {
      if (runtimes.length === 0) {
        console.log('No runtimes configured');
        console.log('Add runtimes to your project\'s .hooks/config.yaml');
        return;
      }

      console.log();
      console.log('Configured runtimes:');
      console.log();

      for (const runtime of runtimes) {
        const status = runtime.enabled ? '' : ' (disabled)';
        console.log(`  [${runtime.projectName}] ${runtime.name}${status}`);
        console.log(`    Type: ${runtime.type}`);
        console.log(`    Interval: ${formatDuration(runtime.intervalMs)}`);
        console.log(`    Timeout: ${formatDuration(runtime.timeoutMs)}`);
        console.log();
      }
    }
  });

/** Register a project for monitoring */
program
  .command('register')
  .description('Register a project for runtime monitoring')
  .argument('[path]', 'Project path', process.cwd())
  .action((path: string) => {
    registerProjectPath(path);
    console.log(`Registered project: ${path}`);
    console.log('The daemon will now monitor runtimes configured in this project.');
  });

// Parse and execute
program.parse();
