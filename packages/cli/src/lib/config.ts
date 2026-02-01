/**
 * Configuration management for the CLI
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, dirname } from 'node:path';
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml';
import {
  CONFIG_FILES,
  ENV_VARS,
  DEFAULT_SERVER_URL,
  type GlobalConfig,
  type LocalProjectConfig,
} from '@hooks/shared';

/** Get the global config directory path */
export function getGlobalConfigDir(): string {
  const envDir = process.env[ENV_VARS.CONFIG_DIR];
  if (envDir) {
    return envDir;
  }
  return join(homedir(), '.hooks');
}

/** Get the global config file path */
export function getGlobalConfigPath(): string {
  return join(getGlobalConfigDir(), CONFIG_FILES.GLOBAL);
}

/** Get the project config directory path */
export function getProjectConfigDir(projectPath: string = process.cwd()): string {
  return join(projectPath, CONFIG_FILES.PROJECT_DIR);
}

/** Get the project config file path */
export function getProjectConfigPath(projectPath: string = process.cwd()): string {
  return join(getProjectConfigDir(projectPath), CONFIG_FILES.PROJECT);
}

/** Load the global configuration */
export function loadGlobalConfig(): GlobalConfig {
  const configPath = getGlobalConfigPath();

  const envToken = process.env[ENV_VARS.API_TOKEN];
  const defaults: GlobalConfig = {
    server: {
      url: process.env[ENV_VARS.SERVER_URL] ?? DEFAULT_SERVER_URL,
    },
    auth: envToken ? { token: envToken } : undefined,
  };

  if (!existsSync(configPath)) {
    return defaults;
  }

  try {
    const content = readFileSync(configPath, 'utf-8');
    const parsed = parseYaml(content) as Partial<GlobalConfig>;

    const token = parsed.auth?.token ?? defaults.auth?.token;
    return {
      server: {
        url: parsed.server?.url ?? defaults.server.url,
      },
      auth: token ? { token } : undefined,
      defaults: parsed.defaults,
    };
  } catch {
    return defaults;
  }
}

/** Save the global configuration */
export function saveGlobalConfig(config: GlobalConfig): void {
  const configPath = getGlobalConfigPath();
  const configDir = dirname(configPath);

  if (!existsSync(configDir)) {
    mkdirSync(configDir, { recursive: true });
  }

  const content = stringifyYaml(config);
  writeFileSync(configPath, content, 'utf-8');
}

/** Load project configuration */
export function loadProjectConfig(projectPath: string = process.cwd()): LocalProjectConfig | null {
  const configPath = getProjectConfigPath(projectPath);

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

/** Save project configuration */
export function saveProjectConfig(
  config: LocalProjectConfig,
  projectPath: string = process.cwd()
): void {
  const configPath = getProjectConfigPath(projectPath);
  const configDir = dirname(configPath);

  if (!existsSync(configDir)) {
    mkdirSync(configDir, { recursive: true });
  }

  const content = stringifyYaml(config);
  writeFileSync(configPath, content, 'utf-8');
}

/** Check if a project is initialized */
export function isProjectInitialized(projectPath: string = process.cwd()): boolean {
  return existsSync(getProjectConfigPath(projectPath));
}

/** Get the current auth token */
export function getAuthToken(): string | undefined {
  // Environment variable takes precedence
  const envToken = process.env[ENV_VARS.API_TOKEN];
  if (envToken) {
    return envToken;
  }

  // Fall back to config file
  const config = loadGlobalConfig();
  return config.auth?.token;
}

/** Set the auth token in global config */
export function setAuthToken(token: string): void {
  const config = loadGlobalConfig();
  config.auth = { ...config.auth, token };
  saveGlobalConfig(config);
}

/** Clear the auth token from global config */
export function clearAuthToken(): void {
  const config = loadGlobalConfig();
  if (config.auth) {
    delete config.auth.token;
  }
  saveGlobalConfig(config);
}

/** Get the server URL */
export function getServerUrl(): string {
  const config = loadGlobalConfig();
  return config.server.url;
}
