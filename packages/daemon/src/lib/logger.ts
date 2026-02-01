/**
 * Simple logging system for the daemon
 */

import { appendFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { getLogFilePath } from './config.js';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

/** Logger configuration */
interface LoggerConfig {
  level: LogLevel;
  file?: string;
  console: boolean;
}

/** Global logger configuration */
let config: LoggerConfig = {
  level: 'info',
  console: true,
};

/** Configure the logger */
export function configureLogger(options: Partial<LoggerConfig>): void {
  config = { ...config, ...options };
}

/** Format a log message */
function formatMessage(level: LogLevel, message: string, data?: unknown): string {
  const timestamp = new Date().toISOString();
  const levelStr = level.toUpperCase().padEnd(5);
  let msg = `[${timestamp}] ${levelStr} ${message}`;

  if (data !== undefined) {
    if (data instanceof Error) {
      msg += ` ${data.message}`;
      if (data.stack) {
        msg += `\n${data.stack}`;
      }
    } else if (typeof data === 'object') {
      msg += ` ${JSON.stringify(data)}`;
    } else {
      msg += ` ${data}`;
    }
  }

  return msg;
}

/** Write a log message */
function log(level: LogLevel, message: string, data?: unknown): void {
  if (LOG_LEVELS[level] < LOG_LEVELS[config.level]) {
    return;
  }

  const formatted = formatMessage(level, message, data);

  // Write to console
  if (config.console) {
    const consoleFn = level === 'error' ? console.error : console.log;
    consoleFn(formatted);
  }

  // Write to file
  const logFile = config.file ?? getLogFilePath();
  try {
    const logDir = dirname(logFile);
    if (!existsSync(logDir)) {
      mkdirSync(logDir, { recursive: true });
    }
    appendFileSync(logFile, formatted + '\n');
  } catch {
    // Silently ignore file write errors
  }
}

/** Log a debug message */
export function debug(message: string, data?: unknown): void {
  log('debug', message, data);
}

/** Log an info message */
export function info(message: string, data?: unknown): void {
  log('info', message, data);
}

/** Log a warning message */
export function warn(message: string, data?: unknown): void {
  log('warn', message, data);
}

/** Log an error message */
export function error(message: string, data?: unknown): void {
  log('error', message, data);
}

/** Create a child logger with a prefix */
export function createLogger(prefix: string) {
  return {
    debug: (message: string, data?: unknown) => debug(`[${prefix}] ${message}`, data),
    info: (message: string, data?: unknown) => info(`[${prefix}] ${message}`, data),
    warn: (message: string, data?: unknown) => warn(`[${prefix}] ${message}`, data),
    error: (message: string, data?: unknown) => error(`[${prefix}] ${message}`, data),
  };
}
