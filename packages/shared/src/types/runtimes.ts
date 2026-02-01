/**
 * Runtime monitoring types
 */

import type { ID, ISODateString } from './common.js';

/** Runtime check type */
export type RuntimeType = 'http' | 'tcp' | 'process' | 'docker' | 'command';

/** Runtime status */
export type RuntimeStatus = 'healthy' | 'unhealthy' | 'unknown' | 'disabled';

/** HTTP runtime configuration */
export interface HttpRuntimeConfig {
  type: 'http';
  url: string;
  method?: 'GET' | 'HEAD' | 'POST';
  expectedStatus?: number;
  expectedBody?: string;
  headers?: Record<string, string>;
  timeout?: number;
  interval?: number;
}

/** TCP runtime configuration */
export interface TcpRuntimeConfig {
  type: 'tcp';
  host: string;
  port: number;
  timeout?: number;
  interval?: number;
}

/** Process runtime configuration */
export interface ProcessRuntimeConfig {
  type: 'process';
  match: string; // Process name or pattern
  timeout?: number;
  interval?: number;
}

/** Docker runtime configuration */
export interface DockerRuntimeConfig {
  type: 'docker';
  container: string;
  timeout?: number;
  interval?: number;
}

/** Command runtime configuration */
export interface CommandRuntimeConfig {
  type: 'command';
  command: string;
  successExitCode?: number;
  timeout?: number;
  interval?: number;
}

/** Union of all runtime configurations */
export type RuntimeConfig =
  | HttpRuntimeConfig
  | TcpRuntimeConfig
  | ProcessRuntimeConfig
  | DockerRuntimeConfig
  | CommandRuntimeConfig;

/** Health check result */
export interface HealthCheck {
  id: ID;
  runtimeId: ID;
  success: boolean;
  responseTimeMs?: number;
  statusCode?: number;
  errorMessage?: string;
  metadata?: Record<string, unknown>;
  timestamp: ISODateString;
}

/** Runtime entity */
export interface Runtime {
  id: ID;
  projectId: ID;
  name: string;
  type: RuntimeType;
  config: RuntimeConfig;
  status: RuntimeStatus;
  enabled: boolean;
  intervalMs: number;
  timeoutMs: number;
  alertOnDown: boolean;
  lastCheckAt?: ISODateString;
  lastSuccessAt?: ISODateString;
  lastFailureAt?: ISODateString;
  consecutiveFailures?: number;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

/** Runtime with metrics */
export interface RuntimeWithMetrics extends Runtime {
  metrics: {
    uptime: number; // Percentage (0-100)
    avgResponseTime?: number; // ms
    checksTotal: number;
    checksSuccessful: number;
  };
  recentChecks: HealthCheck[];
}

/** Report runtime status request (from daemon) */
export interface ReportRuntimeStatusRequest {
  projectId: ID;
  runtimeName: string;
  success: boolean;
  responseTimeMs?: number;
  statusCode?: number;
  errorMessage?: string;
  metadata?: Record<string, unknown>;
}
