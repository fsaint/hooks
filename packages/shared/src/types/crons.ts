/**
 * Cron job monitoring types
 */

import type { ID, ISODateString } from './common.js';

/** Cron job status */
export type CronJobStatus = 'unknown' | 'healthy' | 'failing' | 'running' | 'idle' | 'succeeded' | 'failed' | 'missed';

/** Cron run status */
export type CronRunStatus = 'running' | 'success' | 'failed' | 'timeout';

/** Cron run entity */
export interface CronRun {
  id: ID;
  jobId: ID;
  startedAt: ISODateString;
  endedAt?: ISODateString;
  lastHeartbeatAt?: ISODateString;
  status: CronRunStatus;
  success?: boolean;
  exitCode?: number;
  durationMs?: number;
  output?: string;
  error?: string;
}

/** Cron job entity */
export interface CronJob {
  id: ID;
  projectId: ID;
  name: string;
  description?: string;
  schedule?: string;
  status: CronJobStatus;
  enabled: boolean;

  // Timing configuration
  expectedDurationMs?: number;
  timeout?: number;
  maxRuntime?: number;

  // Alert configuration
  alertOnFailure: boolean;
  alertOnMissed: boolean;

  // Last run tracking
  lastRun?: CronRun;
  lastRunAt?: ISODateString;
  lastSuccessAt?: ISODateString;
  lastFailureAt?: ISODateString;
  nextExpectedRun?: ISODateString;

  createdAt: ISODateString;
  updatedAt: ISODateString;
}

/** Cron job with statistics */
export interface CronJobWithStats extends CronJob {
  stats: {
    totalRuns: number;
    successfulRuns: number;
    successRate: number; // Percentage (0-100)
    avgDuration?: number; // ms
    lastSuccessAt?: ISODateString;
    lastFailureAt?: ISODateString;
  };
  recentRuns: CronRun[];
}

/** Cron event type */
export type CronEventType = 'start' | 'end' | 'heartbeat';

/** Report cron event request (from CLI) */
export interface ReportCronEventRequest {
  projectPath: string;
  jobName: string;
  eventType: CronEventType;
  exitCode?: number;
  output?: string;
  metadata?: Record<string, unknown>;
}
