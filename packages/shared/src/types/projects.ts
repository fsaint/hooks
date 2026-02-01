/**
 * Project types
 */

import type { ID, ISODateString } from './common.js';
import type { AlertChannelConfig, AlertRule } from './alerts.js';

/** Project status */
export type ProjectStatus = 'active' | 'archived' | 'error';

/** Project configuration stored in .hooks/config.yaml */
export interface ProjectConfig {
  project: {
    name: string;
    id?: ID;
  };
  runtimes?: RuntimeConfigEntry[];
  crons?: CronConfigEntry[];
  alerts?: {
    channels?: AlertChannelConfig[];
    rules?: AlertRule[];
  };
}

/** Runtime configuration entry in project config */
export interface RuntimeConfigEntry {
  name: string;
  type: 'http' | 'tcp' | 'process' | 'docker' | 'command';
  // HTTP specific
  url?: string;
  expectedStatus?: number;
  // TCP specific
  host?: string;
  port?: number;
  // Process specific
  match?: string;
  // Docker specific
  container?: string;
  // Command specific
  command?: string;
  successExitCode?: number;
  // Common
  interval?: string;
  timeout?: string;
}

/** Cron configuration entry in project config */
export interface CronConfigEntry {
  name: string;
  schedule: string;
  timeout?: string;
  maxRuntime?: string;
  alertOnFailure?: boolean;
  alertOnMissed?: boolean;
}

/** Project entity */
export interface Project {
  id: ID;
  name: string;
  slug: string;
  description?: string;
  ownerId: ID;
  memberIds: ID[];
  status: ProjectStatus;
  config?: ProjectConfig;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

/** Project with aggregated status */
export interface ProjectWithStatus extends Project {
  agentCount: number;
  activeAgents: number;
  runtimeCount: number;
  healthyRuntimes: number;
  cronCount: number;
  failedCrons: number;
}

/** Create project request */
export interface CreateProjectRequest {
  name: string;
  path: string;
  config?: ProjectConfig;
}

/** Update project request */
export interface UpdateProjectRequest {
  name?: string;
  path?: string;
  config?: ProjectConfig;
  status?: ProjectStatus;
}
