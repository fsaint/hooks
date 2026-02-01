/**
 * Database connection and client
 */

import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema/index.js';

// Export schema for external use
export { schema };

export type Database = PostgresJsDatabase<typeof schema>;

let db: Database | null = null;
let client: postgres.Sql | null = null;

/** Database configuration */
export interface DbConfig {
  connectionString: string;
  maxConnections?: number;
  idleTimeout?: number;
}

/** Get database configuration from environment */
export function getDbConfig(): DbConfig {
  const connectionString = process.env['DATABASE_URL'];

  if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is required');
  }

  return {
    connectionString,
    maxConnections: parseInt(process.env['DB_MAX_CONNECTIONS'] ?? '10', 10),
    idleTimeout: parseInt(process.env['DB_IDLE_TIMEOUT'] ?? '20', 10),
  };
}

/** Initialize database connection */
export function initDb(config?: DbConfig): Database {
  if (db) {
    return db;
  }

  const dbConfig = config ?? getDbConfig();

  client = postgres(dbConfig.connectionString, {
    max: dbConfig.maxConnections,
    idle_timeout: dbConfig.idleTimeout,
    prepare: false, // Disable prepared statements for connection pooling compatibility
  });

  db = drizzle(client, { schema });

  return db;
}

/** Get database instance (must call initDb first) */
export function getDb(): Database {
  if (!db) {
    throw new Error('Database not initialized. Call initDb() first.');
  }
  return db;
}

/** Close database connection */
export async function closeDb(): Promise<void> {
  if (client) {
    await client.end();
    client = null;
    db = null;
  }
}

/** Check if database is connected */
export function isDbConnected(): boolean {
  return db !== null;
}

// Re-export schema
export * from './schema/index.js';
