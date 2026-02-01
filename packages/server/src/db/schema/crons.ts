/**
 * Cron job monitoring schema
 */

import { pgTable, text, timestamp, varchar, integer, boolean, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { projects } from './projects.js';

/** Cron job status values */
export const cronJobStatusValues = ['unknown', 'healthy', 'failing', 'running', 'idle', 'succeeded', 'failed', 'missed'] as const;

/** Cron run status values */
export const cronRunStatusValues = ['running', 'success', 'failed', 'timeout'] as const;

/** Cron jobs table */
export const cronJobs = pgTable('cron_jobs', {
  id: varchar('id', { length: 36 }).primaryKey(),
  projectId: varchar('project_id', { length: 36 }).notNull().references(() => projects.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  schedule: varchar('schedule', { length: 100 }), // Cron expression
  status: varchar('status', { length: 20 }).notNull().default('unknown'),
  enabled: boolean('enabled').notNull().default(true),
  expectedDurationMs: integer('expected_duration_ms'),
  timeout: integer('timeout'), // seconds
  maxRuntime: integer('max_runtime'), // seconds
  alertOnFailure: boolean('alert_on_failure').notNull().default(true),
  alertOnMissed: boolean('alert_on_missed').notNull().default(true),
  lastRunAt: timestamp('last_run_at', { withTimezone: true }),
  lastSuccessAt: timestamp('last_success_at', { withTimezone: true }),
  lastFailureAt: timestamp('last_failure_at', { withTimezone: true }),
  nextExpectedRun: timestamp('next_expected_run', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  projectIdx: index('cron_jobs_project_idx').on(table.projectId),
  statusIdx: index('cron_jobs_status_idx').on(table.status),
  projectNameIdx: index('cron_jobs_project_name_idx').on(table.projectId, table.name),
}));

/** Cron runs table */
export const cronRuns = pgTable('cron_runs', {
  id: varchar('id', { length: 36 }).primaryKey(),
  jobId: varchar('job_id', { length: 36 }).notNull().references(() => cronJobs.id, { onDelete: 'cascade' }),
  startedAt: timestamp('started_at', { withTimezone: true }).notNull(),
  endedAt: timestamp('ended_at', { withTimezone: true }),
  lastHeartbeatAt: timestamp('last_heartbeat_at', { withTimezone: true }),
  status: varchar('status', { length: 20 }).notNull().default('running'),
  success: boolean('success'),
  exitCode: integer('exit_code'),
  durationMs: integer('duration_ms'),
  output: text('output'),
  error: text('error'),
}, (table) => ({
  jobIdx: index('cron_runs_job_idx').on(table.jobId),
  startedAtIdx: index('cron_runs_started_at_idx').on(table.startedAt),
  jobStartedAtIdx: index('cron_runs_job_started_at_idx').on(table.jobId, table.startedAt),
}));

/** Cron job relations */
export const cronJobsRelations = relations(cronJobs, ({ one, many }) => ({
  project: one(projects, {
    fields: [cronJobs.projectId],
    references: [projects.id],
  }),
  runs: many(cronRuns),
}));

/** Cron run relations */
export const cronRunsRelations = relations(cronRuns, ({ one }) => ({
  job: one(cronJobs, {
    fields: [cronRuns.jobId],
    references: [cronJobs.id],
  }),
}));

/** Cron job type */
export type DbCronJob = typeof cronJobs.$inferSelect;
export type NewDbCronJob = typeof cronJobs.$inferInsert;

/** Cron run type */
export type DbCronRun = typeof cronRuns.$inferSelect;
export type NewDbCronRun = typeof cronRuns.$inferInsert;
