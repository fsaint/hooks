/**
 * Agent types for Claude Code session monitoring
 */

import type { ID, ISODateString } from './common.js';

/** Agent session status */
export type AgentStatus = 'active' | 'idle' | 'completed' | 'error';

/** Agent event types */
export type AgentEventType =
  | 'session_start'
  | 'session_end'
  | 'tool_use'
  | 'tool_result'
  | 'message'
  | 'error'
  | 'notification'
  | 'heartbeat';

/** Agent event */
export interface AgentEvent {
  id: ID;
  sessionId: ID;
  projectId: ID;
  type: AgentEventType;
  timestamp: ISODateString;
  data: Record<string, unknown>;
}

/** Agent session */
export interface AgentSession {
  id: ID;
  projectId: ID;
  machineId: string;
  workingDirectory: string;
  status: AgentStatus;
  startedAt: ISODateString;
  lastActivityAt: ISODateString;
  endedAt?: ISODateString;
  metadata?: Record<string, unknown>;
}

/** Agent session with recent events */
export interface AgentSessionWithEvents extends AgentSession {
  recentEvents: AgentEvent[];
}

/** Create agent event request (from CLI) */
export interface CreateAgentEventRequest {
  sessionId?: ID;
  projectPath: string;
  type: AgentEventType;
  toolName?: string;
  message?: string;
  exitCode?: number;
  metadata?: Record<string, unknown>;
}

/** Agent activity summary for dashboard */
export interface AgentActivitySummary {
  totalSessions: number;
  activeSessions: number;
  totalToolCalls: number;
  recentEvents: AgentEvent[];
}
