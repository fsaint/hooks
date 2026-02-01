/**
 * Cron job monitoring commands
 */

import { spawn } from 'node:child_process';
import { Command } from 'commander';
import {
  API_PATHS,
  DEFAULTS,
  type ReportCronEventRequest,
  type CronJob,
  type CronJobWithStats,
  type CronRun,
  formatDuration,
} from '@hooks/shared';
import { loadProjectConfig, isProjectInitialized } from '../lib/config.js';
import { getApiClient, ApiClientError } from '../lib/api-client.js';
import { enqueueEvent } from '../lib/event-queue.js';
import {
  success,
  error,
  info,
  warn,
  output,
  getOutputFormat,
  formatStatus,
  formatKeyValue,
  formatRelativeTime,
  formatRow,
} from '../lib/output.js';

/** Send a cron event to the server or queue it */
async function sendCronEvent(request: ReportCronEventRequest): Promise<boolean> {
  const client = getApiClient();

  if (!client.isAuthenticated()) {
    enqueueEvent('cron', request);
    return false;
  }

  try {
    await client.post(API_PATHS.CRON_EVENTS, request);
    return true;
  } catch {
    enqueueEvent('cron', request);
    return false;
  }
}

/** Wrap a cron command for monitoring */
export const cronWrapCommand = new Command('cron-wrap')
  .description('Wrap a cron command for monitoring')
  .requiredOption('--job <name>', 'Job name')
  .option('-p, --project <path>', 'Project path', process.cwd())
  .option('--timeout <seconds>', 'Timeout in seconds')
  .option('--capture-output', 'Capture and report stdout/stderr', false)
  .argument('<command...>', 'Command to execute')
  .action(async (commandArgs: string[], options: {
    job: string;
    project: string;
    timeout?: string;
    captureOutput: boolean;
  }) => {
    const projectPath = options.project;
    const jobName = options.job;
    const startTime = Date.now();

    // Report job start
    await sendCronEvent({
      projectPath,
      jobName,
      eventType: 'start',
    });

    // Build the command
    const [cmd, ...args] = commandArgs;
    if (!cmd) {
      error('No command specified');
      process.exit(1);
    }

    // Set up timeout if specified
    const timeoutMs = options.timeout ? parseInt(options.timeout, 10) * 1000 : undefined;
    let timedOut = false;

    try {
      // Spawn the child process
      const child = spawn(cmd, args, {
        stdio: options.captureOutput ? 'pipe' : 'inherit',
        shell: true,
      });

      let stdout = '';
      let stderr = '';

      if (options.captureOutput) {
        child.stdout?.on('data', (data: Buffer) => {
          stdout += data.toString();
          process.stdout.write(data);
        });
        child.stderr?.on('data', (data: Buffer) => {
          stderr += data.toString();
          process.stderr.write(data);
        });
      }

      // Set up timeout
      let timeoutHandle: NodeJS.Timeout | undefined;
      if (timeoutMs) {
        timeoutHandle = setTimeout(() => {
          timedOut = true;
          child.kill('SIGTERM');
          // Force kill after 5 seconds
          setTimeout(() => child.kill('SIGKILL'), 5000);
        }, timeoutMs);
      }

      // Wait for the process to exit
      const exitCode = await new Promise<number>((resolve) => {
        child.on('close', (code) => {
          if (timeoutHandle) clearTimeout(timeoutHandle);
          resolve(code ?? 1);
        });
        child.on('error', (err) => {
          if (timeoutHandle) clearTimeout(timeoutHandle);
          error(`Failed to execute command: ${err.message}`);
          resolve(1);
        });
      });

      const durationMs = Date.now() - startTime;

      // Truncate output if too long
      let capturedOutput: string | undefined;
      if (options.captureOutput) {
        const combined = stdout + (stderr ? '\n--- stderr ---\n' + stderr : '');
        capturedOutput = combined.slice(0, DEFAULTS.CRON_OUTPUT_LIMIT);
        if (combined.length > DEFAULTS.CRON_OUTPUT_LIMIT) {
          capturedOutput += '\n... (truncated)';
        }
      }

      // Report job end
      await sendCronEvent({
        projectPath,
        jobName,
        eventType: 'end',
        exitCode: timedOut ? -1 : exitCode,
        output: capturedOutput,
        metadata: timedOut ? { timedOut: true } : undefined,
      });

      if (timedOut) {
        error(`Job "${jobName}" timed out after ${formatDuration(timeoutMs!)}`);
        process.exit(124); // Standard timeout exit code
      }

      process.exit(exitCode);
    } catch (err) {
      const durationMs = Date.now() - startTime;

      // Report job failure
      await sendCronEvent({
        projectPath,
        jobName,
        eventType: 'end',
        exitCode: 1,
        metadata: { error: err instanceof Error ? err.message : 'Unknown error' },
      });

      error(`Job "${jobName}" failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
      process.exit(1);
    }
  });

/** Report cron job start */
export const cronStartCommand = new Command('cron-start')
  .description('Report cron job start')
  .requiredOption('--job <name>', 'Job name')
  .option('-p, --project <path>', 'Project path', process.cwd())
  .action(async (options: { job: string; project: string }) => {
    const sent = await sendCronEvent({
      projectPath: options.project,
      jobName: options.job,
      eventType: 'start',
    });

    if (getOutputFormat() === 'json') {
      output({ success: true, queued: !sent, job: options.job });
    } else if (sent) {
      success(`Reported start for job "${options.job}"`);
    } else {
      info(`Queued start event for job "${options.job}" (offline)`);
    }
  });

/** Report cron job end */
export const cronEndCommand = new Command('cron-end')
  .description('Report cron job end')
  .requiredOption('--job <name>', 'Job name')
  .option('--exit-code <code>', 'Exit code', '0')
  .option('--output <text>', 'Job output (truncated)')
  .option('-p, --project <path>', 'Project path', process.cwd())
  .action(async (options: {
    job: string;
    exitCode: string;
    output?: string;
    project: string;
  }) => {
    const exitCode = parseInt(options.exitCode, 10);

    // Truncate output if provided
    let capturedOutput = options.output;
    if (capturedOutput && capturedOutput.length > DEFAULTS.CRON_OUTPUT_LIMIT) {
      capturedOutput = capturedOutput.slice(0, DEFAULTS.CRON_OUTPUT_LIMIT) + '\n... (truncated)';
    }

    const sent = await sendCronEvent({
      projectPath: options.project,
      jobName: options.job,
      eventType: 'end',
      exitCode,
      output: capturedOutput,
    });

    if (getOutputFormat() === 'json') {
      output({ success: true, queued: !sent, job: options.job, exitCode });
    } else if (sent) {
      if (exitCode === 0) {
        success(`Job "${options.job}" completed successfully`);
      } else {
        warn(`Job "${options.job}" completed with exit code ${exitCode}`);
      }
    } else {
      info(`Queued end event for job "${options.job}" (offline)`);
    }
  });

/** Send cron heartbeat */
export const cronHeartbeatCommand = new Command('cron-heartbeat')
  .description('Send heartbeat for a long-running cron job')
  .requiredOption('--job <name>', 'Job name')
  .option('-p, --project <path>', 'Project path', process.cwd())
  .option('--message <msg>', 'Status message')
  .action(async (options: { job: string; project: string; message?: string }) => {
    const sent = await sendCronEvent({
      projectPath: options.project,
      jobName: options.job,
      eventType: 'heartbeat',
      metadata: options.message ? { message: options.message } : undefined,
    });

    if (getOutputFormat() === 'json') {
      output({ success: true, queued: !sent, job: options.job });
    }
    // Silent in text mode for heartbeats
  });

/** Show cron job status */
export const cronStatusCommand = new Command('cron-status')
  .description('Show cron job status')
  .option('--job <name>', 'Specific job name')
  .option('-p, --project <path>', 'Project path', process.cwd())
  .action(async (options: { job?: string; project: string }) => {
    const projectPath = options.project;

    // Check if project is initialized
    if (!isProjectInitialized(projectPath)) {
      error('Project not initialized. Run `hooks-cli init` first.');
      process.exit(1);
    }

    const config = loadProjectConfig(projectPath);
    if (!config) {
      error('Failed to load project configuration');
      process.exit(1);
    }

    // If not registered, show local config only
    if (!config.project.id) {
      if (getOutputFormat() === 'json') {
        output({
          registered: false,
          configured: config.crons ?? [],
        });
      } else {
        info('Project not registered with server.');
        if (config.crons && config.crons.length > 0) {
          console.log('\nConfigured cron jobs:');
          for (const cron of config.crons) {
            console.log(`  ${cron.name}: ${cron.schedule}`);
          }
        } else {
          info('No cron jobs configured in .hooks/config.yaml');
        }
      }
      return;
    }

    const client = getApiClient();

    if (!client.isAuthenticated()) {
      error('Not authenticated. Run `hooks-cli login` first.');
      process.exit(1);
    }

    try {
      const crons = await client.get<CronJobWithStats[]>(
        API_PATHS.PROJECT_CRONS(config.project.id)
      );

      // Filter by job name if specified
      const filteredCrons = options.job
        ? crons.filter((c) => c.name === options.job)
        : crons;

      if (getOutputFormat() === 'json') {
        output(filteredCrons);
      } else {
        if (filteredCrons.length === 0) {
          if (options.job) {
            error(`Job "${options.job}" not found`);
          } else {
            info('No cron jobs found for this project.');
          }
          return;
        }

        console.log();

        if (options.job && filteredCrons.length === 1) {
          // Detailed view for single job
          const cron = filteredCrons[0]!;
          console.log(formatKeyValue('Job', cron.name));
          console.log(formatKeyValue('Schedule', cron.schedule ?? 'Not set'));
          console.log(formatKeyValue('Status', formatStatus(cron.status)));

          if (cron.lastRun) {
            console.log();
            console.log('Last Run:');
            console.log(`  Started: ${formatRelativeTime(cron.lastRun.startedAt)}`);
            if (cron.lastRun.endedAt) {
              console.log(`  Duration: ${formatDuration(cron.lastRun.durationMs ?? 0)}`);
              console.log(`  Exit Code: ${cron.lastRun.exitCode}`);
              console.log(`  Result: ${cron.lastRun.success ? 'Success' : 'Failed'}`);
            } else {
              console.log('  Status: Running...');
            }
          }

          if (cron.stats) {
            console.log();
            console.log('Statistics:');
            console.log(`  Total Runs: ${cron.stats.totalRuns}`);
            console.log(`  Success Rate: ${cron.stats.successRate.toFixed(1)}%`);
            if (cron.stats.avgDuration) {
              console.log(`  Avg Duration: ${formatDuration(cron.stats.avgDuration)}`);
            }
          }

          if (cron.nextExpectedRun) {
            console.log();
            console.log(formatKeyValue('Next Run', new Date(cron.nextExpectedRun).toLocaleString()));
          }
        } else {
          // Table view for multiple jobs
          const header = formatRow(
            ['JOB', 'SCHEDULE', 'STATUS', 'LAST RUN', 'SUCCESS'],
            [20, 15, 12, 15, 10]
          );
          console.log(header);
          console.log('-'.repeat(75));

          for (const cron of filteredCrons) {
            const lastRun = cron.lastRun
              ? formatRelativeTime(cron.lastRun.startedAt)
              : 'Never';
            const successRate = cron.stats
              ? `${cron.stats.successRate.toFixed(0)}%`
              : '-';

            const row = formatRow(
              [
                cron.name.slice(0, 18),
                (cron.schedule ?? '-').slice(0, 13),
                formatStatus(cron.status),
                lastRun,
                successRate,
              ],
              [20, 15, 12, 15, 10]
            );
            console.log(row);
          }
        }

        console.log();
      }
    } catch (err) {
      if (err instanceof ApiClientError) {
        error(`Failed to get cron status: ${err.message}`);
      } else {
        error('Failed to get cron status');
      }
      process.exit(1);
    }
  });

/** List recent cron runs */
export const cronHistoryCommand = new Command('cron-history')
  .description('Show recent cron job runs')
  .requiredOption('--job <name>', 'Job name')
  .option('-p, --project <path>', 'Project path', process.cwd())
  .option('--limit <n>', 'Number of runs to show', '10')
  .action(async (options: { job: string; project: string; limit: string }) => {
    const projectPath = options.project;

    if (!isProjectInitialized(projectPath)) {
      error('Project not initialized. Run `hooks-cli init` first.');
      process.exit(1);
    }

    const config = loadProjectConfig(projectPath);
    if (!config?.project.id) {
      error('Project not registered. Run `hooks-cli register` first.');
      process.exit(1);
    }

    const client = getApiClient();

    if (!client.isAuthenticated()) {
      error('Not authenticated. Run `hooks-cli login` first.');
      process.exit(1);
    }

    try {
      // First get the cron job to get its ID
      const crons = await client.get<CronJob[]>(
        API_PATHS.PROJECT_CRONS(config.project.id)
      );
      const cron = crons.find((c) => c.name === options.job);

      if (!cron) {
        error(`Job "${options.job}" not found`);
        process.exit(1);
      }

      const runs = await client.get<CronRun[]>(
        `${API_PATHS.CRON_RUNS(cron.id)}?limit=${options.limit}`
      );

      if (getOutputFormat() === 'json') {
        output(runs);
      } else {
        if (runs.length === 0) {
          info(`No runs found for job "${options.job}"`);
          return;
        }

        console.log();
        console.log(`Recent runs for "${options.job}":`);
        console.log();

        const header = formatRow(
          ['STARTED', 'DURATION', 'EXIT', 'RESULT'],
          [20, 12, 8, 10]
        );
        console.log(header);
        console.log('-'.repeat(55));

        for (const run of runs) {
          const duration = run.durationMs ? formatDuration(run.durationMs) : '-';
          const exitCode = run.exitCode?.toString() ?? '-';
          const result = run.success ? 'Success' : 'Failed';

          const row = formatRow(
            [
              formatRelativeTime(run.startedAt),
              duration,
              exitCode,
              run.success ? formatStatus('healthy') : formatStatus('error'),
            ],
            [20, 12, 8, 10]
          );
          console.log(row);
        }

        console.log();
      }
    } catch (err) {
      if (err instanceof ApiClientError) {
        error(`Failed to get cron history: ${err.message}`);
      } else {
        error('Failed to get cron history');
      }
      process.exit(1);
    }
  });
