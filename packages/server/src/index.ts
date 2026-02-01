/**
 * Hooks Server - Backend API
 */

import Fastify from 'fastify';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import websocket from '@fastify/websocket';
import { VERSION } from '@hooks/shared';
import { loadConfig } from './lib/config.js';
import { auth } from './lib/auth.js';
import { setupErrorHandler } from './lib/errors.js';
import { healthRoutes } from './routes/health.js';
import { createAuthRoutes } from './routes/auth.js';
import { projectRoutes } from './routes/projects.js';
import { agentRoutes } from './routes/agents.js';
import { cronRoutes } from './routes/crons.js';
import { runtimeRoutes } from './routes/runtimes.js';
import { alertRoutes } from './routes/alerts.js';
import { websocketRoutes } from './routes/websocket.js';
import { initRedis, closeRedis } from './lib/redis.js';
import { initPubSub } from './lib/pubsub.js';

async function main() {
  const config = loadConfig();

  // Initialize Redis
  try {
    initRedis(config.redis);
    initPubSub();
    console.log('Redis connected successfully');
  } catch (err) {
    console.warn('Redis connection failed, continuing without real-time features:', err);
  }

  // Create Fastify instance
  const fastify = Fastify({
    logger: {
      level: config.logLevel,
    },
    disableRequestLogging: config.logLevel !== 'debug',
  });

  // Register plugins
  await fastify.register(cors, {
    origin: config.corsOrigins,
    credentials: true,
  });

  await fastify.register(rateLimit, {
    max: config.rateLimit.max,
    timeWindow: config.rateLimit.timeWindow,
  });

  await fastify.register(websocket);

  await fastify.register(auth, {
    tokenPrefix: config.auth.tokenPrefix,
  });

  // Set up error handling
  setupErrorHandler(fastify);

  // Register routes
  await fastify.register(healthRoutes);
  await fastify.register(createAuthRoutes(config), { prefix: '/api/v1/auth' });
  await fastify.register(projectRoutes, { prefix: '/api/v1/projects' });
  await fastify.register(agentRoutes, { prefix: '/api/v1/agents' });
  await fastify.register(cronRoutes, { prefix: '/api/v1/crons' });
  await fastify.register(runtimeRoutes, { prefix: '/api/v1/runtimes' });
  await fastify.register(alertRoutes, { prefix: '/api/v1/alerts' });
  await fastify.register(websocketRoutes);

  // Start server
  try {
    const address = await fastify.listen({
      port: config.port,
      host: config.host,
    });

    console.log(`
╭────────────────────────────────────────╮
│                                        │
│   Hooks Server v${VERSION.padEnd(24)}│
│                                        │
│   Server running at:                   │
│   ${address.padEnd(36)}│
│                                        │
│   API Documentation:                   │
│   ${(address + '/health').padEnd(36)}│
│                                        │
╰────────────────────────────────────────╯
    `);
  } catch (err) {
    fastify.log.error(err, 'Failed to start server');
    process.exit(1);
  }

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    fastify.log.info({ signal }, 'Shutting down server...');
    await fastify.close();
    await closeRedis();
    process.exit(0);
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
