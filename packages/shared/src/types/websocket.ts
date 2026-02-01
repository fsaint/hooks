/**
 * WebSocket event types for real-time updates
 */

import type { ID } from './common.js';
import type { AgentEvent } from './agents.js';
import type { HealthCheck, RuntimeStatus } from './runtimes.js';
import type { CronRun } from './crons.js';
import type { Alert } from './alerts.js';

/** Client to server message types */
export type ClientMessageType = 'subscribe' | 'unsubscribe' | 'ping';

/** Server to client message types */
export type ServerMessageType =
  | 'subscribed'
  | 'unsubscribed'
  | 'pong'
  | 'agent.activity'
  | 'runtime.status'
  | 'cron.started'
  | 'cron.completed'
  | 'alert'
  | 'error';

/** Base client message */
export interface BaseClientMessage {
  type: ClientMessageType;
  id?: string; // Optional correlation ID
}

/** Subscribe to projects */
export interface SubscribeMessage extends BaseClientMessage {
  type: 'subscribe';
  projectIds: ID[];
}

/** Unsubscribe from projects */
export interface UnsubscribeMessage extends BaseClientMessage {
  type: 'unsubscribe';
  projectIds: ID[];
}

/** Ping message */
export interface PingMessage extends BaseClientMessage {
  type: 'ping';
}

/** Union of all client messages */
export type ClientMessage = SubscribeMessage | UnsubscribeMessage | PingMessage;

/** Base server message */
export interface BaseServerMessage {
  type: ServerMessageType;
  id?: string; // Correlation ID from client
  timestamp: string;
}

/** Subscription confirmed */
export interface SubscribedMessage extends BaseServerMessage {
  type: 'subscribed';
  projectIds: ID[];
}

/** Unsubscription confirmed */
export interface UnsubscribedMessage extends BaseServerMessage {
  type: 'unsubscribed';
  projectIds: ID[];
}

/** Pong response */
export interface PongMessage extends BaseServerMessage {
  type: 'pong';
}

/** Agent activity event */
export interface AgentActivityMessage extends BaseServerMessage {
  type: 'agent.activity';
  projectId: ID;
  event: AgentEvent;
}

/** Runtime status change */
export interface RuntimeStatusMessage extends BaseServerMessage {
  type: 'runtime.status';
  projectId: ID;
  runtimeId: ID;
  runtimeName: string;
  status: RuntimeStatus;
  check: HealthCheck;
}

/** Cron job started */
export interface CronStartedMessage extends BaseServerMessage {
  type: 'cron.started';
  projectId: ID;
  cronJobId: ID;
  cronJobName: string;
  run: CronRun;
}

/** Cron job completed */
export interface CronCompletedMessage extends BaseServerMessage {
  type: 'cron.completed';
  projectId: ID;
  cronJobId: ID;
  cronJobName: string;
  run: CronRun;
}

/** New alert */
export interface AlertMessage extends BaseServerMessage {
  type: 'alert';
  alert: Alert;
}

/** Error message */
export interface ErrorMessage extends BaseServerMessage {
  type: 'error';
  code: string;
  message: string;
}

/** Union of all server messages */
export type ServerMessage =
  | SubscribedMessage
  | UnsubscribedMessage
  | PongMessage
  | AgentActivityMessage
  | RuntimeStatusMessage
  | CronStartedMessage
  | CronCompletedMessage
  | AlertMessage
  | ErrorMessage;
