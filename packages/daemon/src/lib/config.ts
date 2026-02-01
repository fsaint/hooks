/**
 * Daemon configuration management
 */

import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { parse as parseYaml } from 'yaml';
import {
  CONFIG_FILES,
  ENV_VARS,
  DEFAULT_SERVER_URL,
  DEFAULTS,
  parseDuration,
  type GlobalConfig,
  type LocalProjectConfig,
  type LocalRuntimeConfig,
} from '@hooks/shared';

/** Daemon-specific configuration */
export interface DaemonConfig {
  server: {
    url: string;
  };
  auth?: {
    token?: string;
  };
  projectPaths: string[];
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  pidFile: string;
}

/** Runtime with resolved configuration */
export interface ResolvedRuntime {
  projectId: string;
  projectPath: string;
  projectName: string;
  name: string;
  type: LocalRuntimeConfig['type'];
  config: LocalRuntimeConfig;
  intervalMs: number;
  timeoutMs: number;
  enabled: boolean;
}

/** Get the global config directory path */
export function getGlobalConfigDir(): string {
  const envDir = process.env[ENV_VARS.CONFIG_DIR];
  if (envDir) {
    return envDir;
  }
  return join(homedir(), '.hooks');
}

/** Get the daemon PID file path */
export function getPidFilePath(): string {
  return join(getGlobalConfigDir(), 'daemon.pid');
}

/** Get the daemon log file path */
export function getLogFilePath(): string {
  return join(getGlobalConfigDir(), 'daemon.log');
}

/** Load global configuration */
export function loadGlobalConfig(): GlobalConfig {
  const configPath = join(getGlobalConfigDir(), CONFIG_FILES.GLOBAL);

  const defaults: GlobalConfig = {
    server: {
      url: process.env[ENV_VARS.SERVER_URL] ?? DEFAULT_SERVER_URL,
    },
  };

  if (!existsSync(configPath)) {
    return defaults;
  }

  try {
    const content = readFileSync(configPath, 'utf-8');
    const parsed = parseYaml(content) as Partial<GlobalConfig>;

    return {
      server: {
        url: parsed.server?.url ?? defaults.server.url,
      },
      auth: parsed.auth,
      defaults: parsed.defaults,
    };
  } catch {
    return defaults;
  }
}

/** Load project configuration */
export function loadProjectConfig(projectPath: string): LocalProjectConfig | null {
  const configPath = join(projectPath, CONFIG_FILES.PROJECT_DIR, CONFIG_FILES.PROJECT);

  if (!existsSync(configPath)) {
    return null;
  }

  try {
    const content = readFileSync(configPath, 'utf-8');
    return parseYaml(content) as LocalProjectConfig;
  } catch {
    return null;
  }
}

/** Find all registered project paths */
export function findProjectPaths(): string[] {
  const registryPath = join(getGlobalConfigDir(), 'projects.json');

  if (!existsSync(registryPath)) {
    return [];
  }

  try {
    const content = readFileSync(registryPath, 'utf-8');
    const registry = JSON.parse(content) as { paths?: string[] };
    return registry.paths ?? [];
  } catch {
    return [];
  }
}

/** Register a project path */
export function registerProjectPath(projectPath: string): void {
  const registryPath = join(getGlobalConfigDir(), 'projects.json');
  const configDir = getGlobalConfigDir();

  const { mkdirSync, writeFileSync } = require('node:fs');

  if (!existsSync(configDir)) {
    mkdirSync(configDir, { recursive: true });
  }

  let registry: { paths: string[] } = { paths: [] };

  if (existsSync(registryPath)) {
    try {
      const content = readFileSync(registryPath, 'utf-8');
      registry = JSON.parse(content) as { paths: string[] };
    } catch {
      // Use empty registry
    }
  }

  if (!registry.paths.includes(projectPath)) {
    registry.paths.push(projectPath);
    writeFileSync(registryPath, JSON.stringify(registry, null, 2), 'utf-8');
  }
}

/** Collect all runtimes from registered projects */
export function collectRuntimes(): ResolvedRuntime[] {
  const globalConfig = loadGlobalConfig();
  const projectPaths = findProjectPaths();
  const runtimes: ResolvedRuntime[] = [];

  for (const projectPath of projectPaths) {
    const config = loadProjectConfig(projectPath);
    if (!config || !config.runtimes) {
      continue;
    }

    for (const runtime of config.runtimes) {
      // Parse interval and timeout
      const intervalStr = runtime.interval ?? globalConfig.defaults?.checkInterval ?? '30s';
      const timeoutStr = runtime.timeout ?? globalConfig.defaults?.timeout ?? '5s';

      const intervalMs = parseDuration(intervalStr) || DEFAULTS.CHECK_INTERVAL;
      const timeoutMs = parseDuration(timeoutStr) || DEFAULTS.CHECK_TIMEOUT;

      runtimes.push({
        projectId: config.project.id ?? projectPath,
        projectPath,
        projectName: config.project.name,
        name: runtime.name,
        type: runtime.type,
        config: runtime,
        intervalMs,
        timeoutMs,
        enabled: runtime.enabled !== false,
      });
    }
  }

  return runtimes;
}

/** Get the auth token */
export function getAuthToken(): string | undefined {
  const envToken = process.env[ENV_VARS.API_TOKEN];
  if (envToken) {
    return envToken;
  }

  const config = loadGlobalConfig();
  return config.auth?.token;
}

/** Get the server URL */
export function getServerUrl(): string {
  const config = loadGlobalConfig();
  return config.server.url;
}
