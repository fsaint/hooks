/**
 * Health check routes
 */

import type { FastifyInstance } from 'fastify';
import { VERSION } from '@hooks/shared';

export async function healthRoutes(fastify: FastifyInstance): Promise<void> {
  /** Basic health check */
  fastify.get('/health', async () => {
    return {
      status: 'ok',
      version: VERSION,
      timestamp: new Date().toISOString(),
    };
  });

  /** Detailed health check (for internal monitoring) */
  fastify.get('/health/detailed', async () => {
    const memoryUsage = process.memoryUsage();

    return {
      status: 'ok',
      version: VERSION,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: {
        heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024),
        heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024),
        rss: Math.round(memoryUsage.rss / 1024 / 1024),
      },
      node: process.version,
    };
  });
}
