/**
 * Health routes tests
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTestServer } from '../test/setup.js';
import type { FastifyInstance } from 'fastify';

describe('Health Routes', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await createTestServer();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /health', () => {
    it('should return health status', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/health',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.status).toBe('ok');
      expect(body.version).toBeDefined();
      expect(body.timestamp).toBeDefined();
    });
  });

  describe('GET /health/detailed', () => {
    it('should return detailed health info', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/health/detailed',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.status).toBe('ok');
      expect(body.version).toBeDefined();
      expect(body.uptime).toBeDefined();
      expect(body.memory).toBeDefined();
      expect(body.node).toBeDefined();
    });
  });
});
