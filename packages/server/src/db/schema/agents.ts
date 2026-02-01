/**
 * Agent sessions and events schema
 */

import { pgTable, text, timestamp, varchar, jsonb, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { projects } from './projects.js';

/** Agent session status values */
export const agentStatusValues = ['active', 'idle', 'completed', 'error'] as const;

/** Agent event type values */
export const agentEventTypeValues = [
  'session_start',
  'session_end',
  'tool_use',
  'tool_result',
  'message',
  'error',
  'notification',
  'heartbeat',
] as const;

/** Agent sessions table */
export const agentSessions = pgTable('agent_sessions', {
  id: varchar('id', { length: 36 }).primaryKey(),
  projectId: varchar('project_id', { length: 36 }).notNull().references(() => projects.id, { onDelete: 'cascade' }),
  machineId: varchar('machine_id', { length: 255 }).notNull(),
  workingDirectory: text('working_directory').notNull(),
  status: varchar('status', { length: 20 }).notNull().default('active'),
  startedAt: timestamp('started_at', { withTimezone: true }).notNull(),
  lastActivityAt: timestamp('last_activity_at', { withTimezone: true }).notNull(),
  endedAt: timestamp('ended_at', { withTimezone: true }),
  metadata: jsonb('metadata'),
}, (table) => ({
  projectIdx: index('agent_sessions_project_idx').on(table.projectId),
  statusIdx: index('agent_sessions_status_idx').on(table.status),
  lastActivityIdx: index('agent_sessions_last_activity_idx').on(table.lastActivityAt),
}));

/** Agent events table */
export const agentEvents = pgTable('agent_events', {
  id: varchar('id', { length: 36 }).primaryKey(),
  sessionId: varchar('session_id', { length: 36 }).notNull().references(() => agentSessions.id, { onDelete: 'cascade' }),
  projectId: varchar('project_id', { length: 36 }).notNull().references(() => projects.id, { onDelete: 'cascade' }),
  type: varchar('type', { length: 50 }).notNull(),
  timestamp: timestamp('timestamp', { withTimezone: true }).notNull(),
  data: jsonb('data').notNull().default({}),
}, (table) => ({
  sessionIdx: index('agent_events_session_idx').on(table.sessionId),
  projectIdx: index('agent_events_project_idx').on(table.projectId),
  timestampIdx: index('agent_events_timestamp_idx').on(table.timestamp),
}));

/** Agent session relations */
export const agentSessionsRelations = relations(agentSessions, ({ one, many }) => ({
  project: one(projects, {
    fields: [agentSessions.projectId],
    references: [projects.id],
  }),
  events: many(agentEvents),
}));

/** Agent event relations */
export const agentEventsRelations = relations(agentEvents, ({ one }) => ({
  session: one(agentSessions, {
    fields: [agentEvents.sessionId],
    references: [agentSessions.id],
  }),
  project: one(projects, {
    fields: [agentEvents.projectId],
    references: [projects.id],
  }),
}));

/** Agent session type */
export type DbAgentSession = typeof agentSessions.$inferSelect;
export type NewDbAgentSession = typeof agentSessions.$inferInsert;

/** Agent event type */
export type DbAgentEvent = typeof agentEvents.$inferSelect;
export type NewDbAgentEvent = typeof agentEvents.$inferInsert;
