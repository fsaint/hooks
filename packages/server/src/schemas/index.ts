/**
 * Zod validation schemas for API requests
 */

import { z } from 'zod';

// ==================== Common Schemas ====================

export const paginationSchema = z.object({
  limit: z.coerce.number().min(1).max(100).optional().default(50),
  offset: z.coerce.number().min(0).optional().default(0),
});

export const idParamSchema = z.object({
  id: z.string().min(1),
});

// ==================== Auth Schemas ====================

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1).max(100),
});

export const createApiTokenSchema = z.object({
  name: z.string().min(1).max(100),
  scopes: z.array(z.string()).min(1),
  expiresAt: z.string().datetime().optional(),
});

// ==================== Project Schemas ====================

export const createProjectSchema = z.object({
  name: z.string().min(1).max(100),
  slug: z.string().min(1).max(50).regex(/^[a-z0-9-]+$/),
  description: z.string().max(500).optional(),
});

export const updateProjectSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
});

// ==================== Agent Schemas ====================

export const agentEventSchema = z.object({
  sessionId: z.string().min(1),
  projectId: z.string().min(1),
  type: z.enum(['session_start', 'tool_use', 'tool_result', 'message', 'error', 'session_end']),
  timestamp: z.string().datetime(),
  data: z.record(z.unknown()).optional(),
});

export const batchAgentEventsSchema = z.object({
  events: z.array(agentEventSchema).min(1).max(100),
});

// ==================== Cron Schemas ====================

export const createCronJobSchema = z.object({
  name: z.string().min(1).max(100),
  schedule: z.string().optional(),
  description: z.string().max(500).optional(),
  expectedDurationMs: z.number().positive().optional(),
  alertOnFailure: z.boolean().optional().default(true),
  alertOnMissed: z.boolean().optional().default(true),
});

export const updateCronJobSchema = z.object({
  schedule: z.string().optional(),
  description: z.string().max(500).optional(),
  expectedDurationMs: z.number().positive().optional(),
  alertOnFailure: z.boolean().optional(),
  alertOnMissed: z.boolean().optional(),
  enabled: z.boolean().optional(),
});

export const cronEventSchema = z.object({
  jobName: z.string().min(1),
  projectId: z.string().min(1),
  type: z.enum(['start', 'heartbeat', 'end']),
  timestamp: z.string().datetime(),
  runId: z.string().optional(),
  success: z.boolean().optional(),
  exitCode: z.number().optional(),
  output: z.string().max(10000).optional(),
  error: z.string().max(10000).optional(),
  durationMs: z.number().optional(),
});

// ==================== Runtime Schemas ====================

export const createRuntimeSchema = z.object({
  name: z.string().min(1).max(100),
  type: z.enum(['http', 'tcp', 'process', 'docker', 'command']),
  config: z.record(z.unknown()),
  intervalMs: z.number().positive().optional().default(30000),
  timeoutMs: z.number().positive().optional().default(10000),
  alertOnDown: z.boolean().optional().default(true),
});

export const updateRuntimeSchema = z.object({
  config: z.record(z.unknown()).optional(),
  intervalMs: z.number().positive().optional(),
  timeoutMs: z.number().positive().optional(),
  alertOnDown: z.boolean().optional(),
  enabled: z.boolean().optional(),
});

export const runtimeStatusSchema = z.object({
  runtimeName: z.string().min(1),
  projectId: z.string().min(1),
  success: z.boolean(),
  timestamp: z.string().datetime(),
  responseTimeMs: z.number().optional(),
  errorMessage: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
});

// ==================== Alert Schemas ====================

export const createAlertRuleSchema = z.object({
  name: z.string().min(1).max(100),
  type: z.enum(['runtime_down', 'cron_failed', 'cron_missed', 'agent_error']),
  condition: z.record(z.unknown()),
  channels: z.array(z.object({
    type: z.enum(['email', 'slack', 'webhook', 'pagerduty']),
    config: z.record(z.unknown()),
  })),
  cooldownMs: z.number().positive().optional().default(300000),
  enabled: z.boolean().optional().default(true),
});

export const acknowledgeAlertSchema = z.object({
  note: z.string().max(500).optional(),
});

// Export types
export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type CreateApiTokenInput = z.infer<typeof createApiTokenSchema>;
export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
export type AgentEventInput = z.infer<typeof agentEventSchema>;
export type BatchAgentEventsInput = z.infer<typeof batchAgentEventsSchema>;
export type CreateCronJobInput = z.infer<typeof createCronJobSchema>;
export type UpdateCronJobInput = z.infer<typeof updateCronJobSchema>;
export type CronEventInput = z.infer<typeof cronEventSchema>;
export type CreateRuntimeInput = z.infer<typeof createRuntimeSchema>;
export type UpdateRuntimeInput = z.infer<typeof updateRuntimeSchema>;
export type RuntimeStatusInput = z.infer<typeof runtimeStatusSchema>;
export type CreateAlertRuleInput = z.infer<typeof createAlertRuleSchema>;
export type AcknowledgeAlertInput = z.infer<typeof acknowledgeAlertSchema>;
export type PaginationInput = z.infer<typeof paginationSchema>;
