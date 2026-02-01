/**
 * Alert and notification types
 */

import type { ID, ISODateString } from './common.js';

/** Alert severity levels */
export type AlertSeverity = 'info' | 'warning' | 'critical';

/** Alert status */
export type AlertStatus = 'active' | 'acknowledged' | 'resolved';

/** Alert condition types */
export type AlertCondition =
  | 'runtime.unhealthy'
  | 'runtime.recovered'
  | 'cron.failed'
  | 'cron.missed'
  | 'cron.timeout'
  | 'agent.error';

/** Alert entity */
export interface Alert {
  id: ID;
  projectId: ID;
  type: AlertCondition;
  severity: AlertSeverity;
  status: AlertStatus;
  message: string;

  // Related entity
  runtimeId?: ID;
  cronJobId?: ID;
  agentSessionId?: ID;

  // Resolution
  acknowledgedAt?: ISODateString;
  acknowledgedBy?: ID;
  resolvedAt?: ISODateString;

  metadata?: Record<string, unknown>;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

/** Alert channel types */
export type AlertChannelType = 'email' | 'slack' | 'webhook' | 'pagerduty';

/** Email channel configuration */
export interface EmailChannelConfig {
  type: 'email';
  address: string;
}

/** Slack channel configuration */
export interface SlackChannelConfig {
  type: 'slack';
  webhookUrl: string;
  channel?: string;
}

/** Webhook channel configuration */
export interface WebhookChannelConfig {
  type: 'webhook';
  url: string;
  headers?: Record<string, string>;
}

/** PagerDuty channel configuration */
export interface PagerDutyChannelConfig {
  type: 'pagerduty';
  routingKey: string;
}

/** Union of all channel configurations */
export type AlertChannelConfig =
  | EmailChannelConfig
  | SlackChannelConfig
  | WebhookChannelConfig
  | PagerDutyChannelConfig;

/** Alert rule type */
export type AlertRuleType = 'runtime_down' | 'cron_failed' | 'cron_missed' | 'agent_error';

/** Alert rule */
export interface AlertRule {
  id: ID;
  projectId: ID;
  name: string;
  type: AlertRuleType;
  condition: Record<string, unknown>;
  channels: AlertChannelConfig[];
  cooldownMs?: number;
  enabled: boolean;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

/** Acknowledge alert request */
export interface AcknowledgeAlertRequest {
  message?: string;
}
