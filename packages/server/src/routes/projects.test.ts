/**
 * Projects routes tests
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { createTestServer, createTestUser, resetStore } from '../test/setup.js';
import type { FastifyInstance } from 'fastify';

describe('Projects Routes', () => {
  let app: FastifyInstance;
  let testToken: string;
  let testUserId: string;

  beforeAll(async () => {
    app = await createTestServer();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    resetStore();
    const { user, token } = createTestUser();
    testToken = token.value;
    testUserId = user.id;
  });

  describe('GET /api/v1/projects', () => {
    it('should return empty list initially', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/projects',
        headers: {
          Authorization: `Bearer ${testToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data).toEqual([]);
    });

    it('should require authentication', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/projects',
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe('POST /api/v1/projects', () => {
    it('should create a new project', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/projects',
        headers: {
          Authorization: `Bearer ${testToken}`,
          'Content-Type': 'application/json',
        },
        payload: {
          name: 'Test Project',
          slug: 'test-project',
        },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.name).toBe('Test Project');
      expect(body.slug).toBe('test-project');
      expect(body.ownerId).toBe(testUserId);
    });

    it('should reject duplicate slug', async () => {
      // Create first project
      await app.inject({
        method: 'POST',
        url: '/api/v1/projects',
        headers: {
          Authorization: `Bearer ${testToken}`,
          'Content-Type': 'application/json',
        },
        payload: {
          name: 'Test Project',
          slug: 'test-project',
        },
      });

      // Try to create duplicate
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/projects',
        headers: {
          Authorization: `Bearer ${testToken}`,
          'Content-Type': 'application/json',
        },
        payload: {
          name: 'Test Project 2',
          slug: 'test-project',
        },
      });

      expect(response.statusCode).toBe(409);
    });

    it('should validate required fields', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/projects',
        headers: {
          Authorization: `Bearer ${testToken}`,
          'Content-Type': 'application/json',
        },
        payload: {
          name: 'Test Project',
          // missing slug
        },
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('GET /api/v1/projects/:id', () => {
    it('should return a specific project', async () => {
      // Create project
      const createResponse = await app.inject({
        method: 'POST',
        url: '/api/v1/projects',
        headers: {
          Authorization: `Bearer ${testToken}`,
          'Content-Type': 'application/json',
        },
        payload: {
          name: 'Test Project',
          slug: 'test-project',
        },
      });

      const created = JSON.parse(createResponse.body);

      // Get project
      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/projects/${created.id}`,
        headers: {
          Authorization: `Bearer ${testToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.id).toBe(created.id);
      expect(body.name).toBe('Test Project');
    });

    it('should return 404 for non-existent project', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/projects/prj_nonexistent',
        headers: {
          Authorization: `Bearer ${testToken}`,
        },
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('PATCH /api/v1/projects/:id', () => {
    it('should update a project', async () => {
      // Create project
      const createResponse = await app.inject({
        method: 'POST',
        url: '/api/v1/projects',
        headers: {
          Authorization: `Bearer ${testToken}`,
          'Content-Type': 'application/json',
        },
        payload: {
          name: 'Test Project',
          slug: 'test-project',
        },
      });

      const created = JSON.parse(createResponse.body);

      // Update project
      const response = await app.inject({
        method: 'PATCH',
        url: `/api/v1/projects/${created.id}`,
        headers: {
          Authorization: `Bearer ${testToken}`,
          'Content-Type': 'application/json',
        },
        payload: {
          name: 'Updated Project',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.name).toBe('Updated Project');
      expect(body.slug).toBe('test-project'); // unchanged
    });
  });

  describe('DELETE /api/v1/projects/:id', () => {
    it('should delete a project', async () => {
      // Create project
      const createResponse = await app.inject({
        method: 'POST',
        url: '/api/v1/projects',
        headers: {
          Authorization: `Bearer ${testToken}`,
          'Content-Type': 'application/json',
        },
        payload: {
          name: 'Test Project',
          slug: 'test-project',
        },
      });

      const created = JSON.parse(createResponse.body);

      // Delete project
      const response = await app.inject({
        method: 'DELETE',
        url: `/api/v1/projects/${created.id}`,
        headers: {
          Authorization: `Bearer ${testToken}`,
        },
      });

      expect(response.statusCode).toBe(204);

      // Verify deletion
      const getResponse = await app.inject({
        method: 'GET',
        url: `/api/v1/projects/${created.id}`,
        headers: {
          Authorization: `Bearer ${testToken}`,
        },
      });

      expect(getResponse.statusCode).toBe(404);
    });
  });
});
