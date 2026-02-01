/**
 * Configuration types for CLI and daemon
 */

/** Global CLI/daemon configuration (~/.hooks/config.yaml) */
export interface GlobalConfig {
  server: {
    url: string;
  };
  auth?: {
    token?: string;
  };
  defaults?: {
    checkInterval?: string;
    timeout?: string;
    alertOnFailure?: boolean;
  };
}

/** Project configuration (.hooks/config.yaml) */
export interface LocalProjectConfig {
  project: {
    name: string;
    id?: string;
  };
  runtimes?: LocalRuntimeConfig[];
  crons?: LocalCronConfig[];
  alerts?: LocalAlertConfig;
}

/** Local runtime configuration */
export interface LocalRuntimeConfig {
  name: string;
  type: 'http' | 'tcp' | 'process' | 'docker' | 'command';

  // HTTP
  url?: string;
  method?: 'GET' | 'HEAD' | 'POST';
  expectedStatus?: number;
  headers?: Record<string, string>;

  // TCP
  host?: string;
  port?: number;

  // Process
  match?: string;

  // Docker
  container?: string;

  // Command
  command?: string;
  successExitCode?: number;

  // Common
  interval?: string; // e.g., "30s", "1m"
  timeout?: string;
  enabled?: boolean;
}

/** Local cron configuration */
export interface LocalCronConfig {
  name: string;
  schedule: string;
  timeout?: string;
  maxRuntime?: string;
  alertOnFailure?: boolean;
  alertOnMissed?: boolean;
}

/** Local alert configuration */
export interface LocalAlertConfig {
  channels?: LocalAlertChannel[];
  rules?: LocalAlertRule[];
}

/** Local alert channel */
export interface LocalAlertChannel {
  name: string;
  type: 'email' | 'slack' | 'webhook' | 'pagerduty';
  // Type-specific fields
  address?: string; // email
  webhookUrl?: string; // slack
  url?: string; // webhook
  routingKey?: string; // pagerduty
  headers?: Record<string, string>; // webhook
}

/** Local alert rule */
export interface LocalAlertRule {
  condition: string;
  severity: 'info' | 'warning' | 'critical';
  channels: string[];
  cooldown?: string;
}

/** Claude Code hooks configuration */
export interface ClaudeHooksConfig {
  hooks?: {
    PreToolUse?: ClaudeHookEntry[];
    PostToolUse?: ClaudeHookEntry[];
    Notification?: ClaudeHookEntry[];
    Stop?: ClaudeHookEntry[];
  };
}

/** Claude Code hook entry */
export interface ClaudeHookEntry {
  matcher: string;
  hooks: ClaudeHook[];
}

/** Claude Code hook definition */
export interface ClaudeHook {
  type: 'command';
  command: string;
  timeout?: number;
}
