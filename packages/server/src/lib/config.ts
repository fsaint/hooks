/**
 * Server configuration
 */

export interface ServerConfig {
  port: number;
  host: string;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  corsOrigins: string[];
  rateLimit: {
    max: number;
    timeWindow: string;
  };
  auth: {
    tokenPrefix: string;
    sessionTtlMs: number;
  };
  database: {
    url: string | null;
    maxConnections: number;
    idleTimeout: number;
  };
  redis: {
    url: string;
    keyPrefix: string;
  };
}

/** Load configuration from environment variables */
export function loadConfig(): ServerConfig {
  return {
    port: parseInt(process.env['PORT'] ?? '3001', 10),
    host: process.env['HOST'] ?? '0.0.0.0',
    logLevel: (process.env['LOG_LEVEL'] ?? 'info') as ServerConfig['logLevel'],
    corsOrigins: process.env['CORS_ORIGINS']?.split(',') ?? ['http://localhost:3000'],
    rateLimit: {
      max: parseInt(process.env['RATE_LIMIT_MAX'] ?? '100', 10),
      timeWindow: process.env['RATE_LIMIT_WINDOW'] ?? '1 minute',
    },
    auth: {
      tokenPrefix: 'hk_',
      sessionTtlMs: 30 * 24 * 60 * 60 * 1000, // 30 days
    },
    database: {
      url: process.env['DATABASE_URL'] ?? null,
      maxConnections: parseInt(process.env['DB_MAX_CONNECTIONS'] ?? '10', 10),
      idleTimeout: parseInt(process.env['DB_IDLE_TIMEOUT'] ?? '20', 10),
    },
    redis: {
      url: process.env['REDIS_URL'] ?? 'redis://localhost:6379',
      keyPrefix: process.env['REDIS_KEY_PREFIX'] ?? 'hooks:',
    },
  };
}
