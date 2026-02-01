/**
 * Shared constants for the Hooks platform
 */

/** Current version */
export const VERSION = '0.1.0';

/** Default server URL */
export const DEFAULT_SERVER_URL = 'http://localhost:8080';

/** Default intervals and timeouts (in milliseconds) */
export const DEFAULTS = {
  /** Default health check interval */
  CHECK_INTERVAL: 30_000,
  /** Default health check timeout */
  CHECK_TIMEOUT: 5_000,
  /** Default WebSocket ping interval */
  WS_PING_INTERVAL: 30_000,
  /** Default WebSocket reconnect delay */
  WS_RECONNECT_DELAY: 5_000,
  /** Maximum WebSocket reconnect delay */
  WS_MAX_RECONNECT_DELAY: 60_000,
  /** Agent session idle timeout */
  AGENT_IDLE_TIMEOUT: 300_000,
  /** Event queue max size for offline mode */
  EVENT_QUEUE_MAX_SIZE: 1000,
  /** Cron output truncation limit (bytes) */
  CRON_OUTPUT_LIMIT: 10_000,
} as const;

/** API paths */
export const API_PATHS = {
  // Auth
  AUTH_LOGIN: '/api/auth/login',
  AUTH_LOGOUT: '/api/auth/logout',
  AUTH_ME: '/api/auth/me',
  AUTH_TOKENS: '/api/auth/tokens',

  // Projects
  PROJECTS: '/api/projects',
  PROJECT: (id: string) => `/api/projects/${id}`,

  // Agents
  PROJECT_AGENTS: (projectId: string) => `/api/projects/${projectId}/agents`,
  AGENT: (sessionId: string) => `/api/agents/${sessionId}`,
  AGENT_EVENTS: '/api/agents/events',

  // Runtimes
  PROJECT_RUNTIMES: (projectId: string) => `/api/projects/${projectId}/runtimes`,
  RUNTIME: (id: string) => `/api/runtimes/${id}`,
  RUNTIME_HISTORY: (id: string) => `/api/runtimes/${id}/history`,
  RUNTIME_STATUS: '/api/runtimes/status',

  // Crons
  PROJECT_CRONS: (projectId: string) => `/api/projects/${projectId}/crons`,
  CRON: (id: string) => `/api/crons/${id}`,
  CRON_RUNS: (id: string) => `/api/crons/${id}/runs`,
  CRON_EVENTS: '/api/crons/events',

  // Alerts
  ALERTS: '/api/alerts',
  ALERT: (id: string) => `/api/alerts/${id}`,
  ALERT_ACKNOWLEDGE: (id: string) => `/api/alerts/${id}/acknowledge`,
  ALERT_SETTINGS: '/api/alerts/settings',

  // WebSocket
  WS: '/ws',
} as const;

/** Configuration file names */
export const CONFIG_FILES = {
  /** Global config file */
  GLOBAL: 'config.yaml',
  /** Project config directory */
  PROJECT_DIR: '.hooks',
  /** Project config file */
  PROJECT: 'config.yaml',
  /** Claude Code settings file */
  CLAUDE_SETTINGS: 'settings.json',
  /** Claude Code settings directory */
  CLAUDE_DIR: '.claude',
} as const;

/** Environment variable names */
export const ENV_VARS = {
  /** Server URL override */
  SERVER_URL: 'HOOKS_SERVER_URL',
  /** API token */
  API_TOKEN: 'HOOKS_API_TOKEN',
  /** Debug mode */
  DEBUG: 'HOOKS_DEBUG',
  /** Config directory override */
  CONFIG_DIR: 'HOOKS_CONFIG_DIR',
} as const;
