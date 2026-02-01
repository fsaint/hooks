/**
 * Runtime monitoring schema
 */

import { pgTable, text, timestamp, varchar, jsonb, integer, boolean, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { projects } from './projects.js';

/** Runtime type values */
export const runtimeTypeValues = ['http', 'tcp', 'process', 'docker', 'command'] as const;

/** Runtime status values */
export const runtimeStatusValues = ['healthy', 'unhealthy', 'unknown', 'disabled'] as const;

/** Runtimes table */
export const runtimes = pgTable('runtimes', {
  id: varchar('id', { length: 36 }).primaryKey(),
  projectId: varchar('project_id', { length: 36 }).notNull().references(() => projects.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  type: varchar('type', { length: 20 }).notNull(),
  config: jsonb('config').notNull(), // RuntimeConfig JSON
  status: varchar('status', { length: 20 }).notNull().default('unknown'),
  enabled: boolean('enabled').notNull().default(true),
  intervalMs: integer('interval_ms').notNull().default(30000),
  timeoutMs: integer('timeout_ms').notNull().default(10000),
  alertOnDown: boolean('alert_on_down').notNull().default(true),
  lastCheckAt: timestamp('last_check_at', { withTimezone: true }),
  lastSuccessAt: timestamp('last_success_at', { withTimezone: true }),
  lastFailureAt: timestamp('last_failure_at', { withTimezone: true }),
  consecutiveFailures: integer('consecutive_failures').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  projectIdx: index('runtimes_project_idx').on(table.projectId),
  statusIdx: index('runtimes_status_idx').on(table.status),
  projectNameIdx: index('runtimes_project_name_idx').on(table.projectId, table.name),
}));

/** Health checks table */
export const healthChecks = pgTable('health_checks', {
  id: varchar('id', { length: 36 }).primaryKey(),
  runtimeId: varchar('runtime_id', { length: 36 }).notNull().references(() => runtimes.id, { onDelete: 'cascade' }),
  success: boolean('success').notNull(),
  timestamp: timestamp('timestamp', { withTimezone: true }).notNull(),
  responseTimeMs: integer('response_time_ms'),
  statusCode: integer('status_code'),
  errorMessage: text('error_message'),
  metadata: jsonb('metadata'),
}, (table) => ({
  runtimeIdx: index('health_checks_runtime_idx').on(table.runtimeId),
  timestampIdx: index('health_checks_timestamp_idx').on(table.timestamp),
  runtimeTimestampIdx: index('health_checks_runtime_timestamp_idx').on(table.runtimeId, table.timestamp),
}));

/** Runtime relations */
export const runtimesRelations = relations(runtimes, ({ one, many }) => ({
  project: one(projects, {
    fields: [runtimes.projectId],
    references: [projects.id],
  }),
  healthChecks: many(healthChecks),
}));

/** Health check relations */
export const healthChecksRelations = relations(healthChecks, ({ one }) => ({
  runtime: one(runtimes, {
    fields: [healthChecks.runtimeId],
    references: [runtimes.id],
  }),
}));

/** Runtime type */
export type DbRuntime = typeof runtimes.$inferSelect;
export type NewDbRuntime = typeof runtimes.$inferInsert;

/** Health check type */
export type DbHealthCheck = typeof healthChecks.$inferSelect;
export type NewDbHealthCheck = typeof healthChecks.$inferInsert;
