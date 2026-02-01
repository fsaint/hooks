/**
 * Alerts and notifications schema
 */

import { pgTable, text, timestamp, varchar, jsonb, integer, boolean, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { projects } from './projects.js';
import { users } from './users.js';
import { runtimes } from './runtimes.js';
import { cronJobs } from './crons.js';
import { agentSessions } from './agents.js';

/** Alert severity values */
export const alertSeverityValues = ['info', 'warning', 'critical'] as const;

/** Alert status values */
export const alertStatusValues = ['active', 'acknowledged', 'resolved'] as const;

/** Alert condition values */
export const alertConditionValues = [
  'runtime.unhealthy',
  'runtime.recovered',
  'cron.failed',
  'cron.missed',
  'cron.timeout',
  'agent.error',
] as const;

/** Alert rule type values */
export const alertRuleTypeValues = ['runtime_down', 'cron_failed', 'cron_missed', 'agent_error'] as const;

/** Alerts table */
export const alerts = pgTable('alerts', {
  id: varchar('id', { length: 36 }).primaryKey(),
  projectId: varchar('project_id', { length: 36 }).notNull().references(() => projects.id, { onDelete: 'cascade' }),
  type: varchar('type', { length: 50 }).notNull(),
  severity: varchar('severity', { length: 20 }).notNull(),
  status: varchar('status', { length: 20 }).notNull().default('active'),
  message: text('message').notNull(),
  runtimeId: varchar('runtime_id', { length: 36 }).references(() => runtimes.id, { onDelete: 'set null' }),
  cronJobId: varchar('cron_job_id', { length: 36 }).references(() => cronJobs.id, { onDelete: 'set null' }),
  agentSessionId: varchar('agent_session_id', { length: 36 }).references(() => agentSessions.id, { onDelete: 'set null' }),
  acknowledgedAt: timestamp('acknowledged_at', { withTimezone: true }),
  acknowledgedBy: varchar('acknowledged_by', { length: 36 }).references(() => users.id, { onDelete: 'set null' }),
  acknowledgedNote: text('acknowledged_note'),
  resolvedAt: timestamp('resolved_at', { withTimezone: true }),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  projectIdx: index('alerts_project_idx').on(table.projectId),
  statusIdx: index('alerts_status_idx').on(table.status),
  severityIdx: index('alerts_severity_idx').on(table.severity),
  createdAtIdx: index('alerts_created_at_idx').on(table.createdAt),
}));

/** Alert rules table */
export const alertRules = pgTable('alert_rules', {
  id: varchar('id', { length: 36 }).primaryKey(),
  projectId: varchar('project_id', { length: 36 }).notNull().references(() => projects.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  type: varchar('type', { length: 50 }).notNull(),
  condition: jsonb('condition').notNull(),
  channels: jsonb('channels').notNull(), // Array of AlertChannelConfig
  cooldownMs: integer('cooldown_ms').notNull().default(300000), // 5 minutes
  enabled: boolean('enabled').notNull().default(true),
  lastTriggeredAt: timestamp('last_triggered_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  projectIdx: index('alert_rules_project_idx').on(table.projectId),
  typeIdx: index('alert_rules_type_idx').on(table.type),
}));

/** Alert relations */
export const alertsRelations = relations(alerts, ({ one }) => ({
  project: one(projects, {
    fields: [alerts.projectId],
    references: [projects.id],
  }),
  runtime: one(runtimes, {
    fields: [alerts.runtimeId],
    references: [runtimes.id],
  }),
  cronJob: one(cronJobs, {
    fields: [alerts.cronJobId],
    references: [cronJobs.id],
  }),
  agentSession: one(agentSessions, {
    fields: [alerts.agentSessionId],
    references: [agentSessions.id],
  }),
  acknowledgedByUser: one(users, {
    fields: [alerts.acknowledgedBy],
    references: [users.id],
  }),
}));

/** Alert rule relations */
export const alertRulesRelations = relations(alertRules, ({ one }) => ({
  project: one(projects, {
    fields: [alertRules.projectId],
    references: [projects.id],
  }),
}));

/** Alert type */
export type DbAlert = typeof alerts.$inferSelect;
export type NewDbAlert = typeof alerts.$inferInsert;

/** Alert rule type */
export type DbAlertRule = typeof alertRules.$inferSelect;
export type NewDbAlertRule = typeof alertRules.$inferInsert;
