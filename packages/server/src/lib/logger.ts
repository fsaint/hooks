/**
 * Server logging setup
 */

import { pino } from 'pino';
import type { ServerConfig } from './config.js';

export function createLogger(config: ServerConfig) {
  const isDev = process.env['NODE_ENV'] !== 'production';

  return pino({
    level: config.logLevel,
    transport: isDev
      ? {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'SYS:HH:MM:ss',
            ignore: 'pid,hostname',
          },
        }
      : undefined,
  });
}

export type Logger = ReturnType<typeof createLogger>;
