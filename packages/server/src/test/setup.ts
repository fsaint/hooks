/**
 * Test setup utilities
 */

import Fastify, { type FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import { auth } from '../lib/auth.js';
import { setupErrorHandler } from '../lib/errors.js';
import { store } from '../lib/store.js';
import { healthRoutes } from '../routes/health.js';
import { createAuthRoutes } from '../routes/auth.js';
import { projectRoutes } from '../routes/projects.js';
import { agentRoutes } from '../routes/agents.js';
import { cronRoutes } from '../routes/crons.js';
import { runtimeRoutes } from '../routes/runtimes.js';
import { alertRoutes } from '../routes/alerts.js';

/** Test configuration */
export const testConfig = {
  port: 3001,
  host: '0.0.0.0',
  logLevel: 'error' as const,
  corsOrigins: ['*'],
  rateLimit: {
    max: 1000,
    timeWindow: '1 minute',
  },
  auth: {
    tokenPrefix: 'hk_',
    sessionTtlMs: 30 * 24 * 60 * 60 * 1000,
  },
  database: {
    url: null,
    maxConnections: 10,
    idleTimeout: 20,
  },
  redis: {
    url: 'redis://localhost:6379',
    keyPrefix: 'hooks:test:',
  },
};

/** Create a test Fastify instance */
export async function createTestServer(): Promise<FastifyInstance> {
  const fastify = Fastify({
    logger: false,
  });

  await fastify.register(cors, {
    origin: '*',
    credentials: true,
  });

  await fastify.register(auth, {
    tokenPrefix: testConfig.auth.tokenPrefix,
  });

  setupErrorHandler(fastify);

  await fastify.register(healthRoutes);
  await fastify.register(createAuthRoutes(testConfig), { prefix: '/api/v1/auth' });
  await fastify.register(projectRoutes, { prefix: '/api/v1/projects' });
  await fastify.register(agentRoutes, { prefix: '/api/v1/agents' });
  await fastify.register(cronRoutes, { prefix: '/api/v1/crons' });
  await fastify.register(runtimeRoutes, { prefix: '/api/v1/runtimes' });
  await fastify.register(alertRoutes, { prefix: '/api/v1/alerts' });

  return fastify;
}

/** Create a test user and get their token */
export function createTestUser(email = 'test@example.com', password = 'password123') {
  const user = store.createUser({
    email,
    passwordHash: password, // In real code this would be hashed
    name: 'Test User',
  });

  const token = store.createApiToken({
    userId: user.id,
    name: 'Test Token',
    value: `hk_test_${Date.now()}`,
    scopes: ['*'],
  });

  return { user, token };
}

/** Reset the store between tests */
export function resetStore() {
  store.clear();
}
