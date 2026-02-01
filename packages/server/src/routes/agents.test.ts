/**
 * Agents routes tests
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { createTestServer, createTestUser, resetStore } from '../test/setup.js';
import { store } from '../lib/store.js';
import type { FastifyInstance } from 'fastify';

describe('Agents Routes', () => {
  let app: FastifyInstance;
  let testToken: string;
  let testUserId: string;
  let testProjectId: string;

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

    // Create a test project
    const project = store.createProject({
      name: 'Test Project',
      slug: 'test-project',
      ownerId: testUserId,
      memberIds: [],
      settings: {},
    });
    testProjectId = project.id;
  });

  describe('GET /api/v1/agents/projects/:projectId/sessions', () => {
    it('should return empty list initially', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/agents/projects/${testProjectId}/sessions`,
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
        url: `/api/v1/agents/projects/${testProjectId}/sessions`,
      });

      expect(response.statusCode).toBe(401);
    });

    it('should return 404 for non-existent project', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/agents/projects/prj_nonexistent/sessions',
        headers: {
          Authorization: `Bearer ${testToken}`,
        },
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('POST /api/v1/agents/events', () => {
    it('should create an agent event and session', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/agents/events',
        headers: {
          Authorization: `Bearer ${testToken}`,
          'Content-Type': 'application/json',
        },
        payload: {
          projectId: testProjectId,
          sessionId: 'test-session-1',
          type: 'session_start',
          timestamp: new Date().toISOString(),
          data: {
            model: 'claude-3-sonnet',
          },
        },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.projectId).toBe(testProjectId);
      expect(body.type).toBe('session_start');
    });

    it('should reject event for inaccessible project', async () => {
      const otherUser = store.createUser({
        email: 'other@example.com',
        passwordHash: 'password',
        name: 'Other User',
      });
      const otherProject = store.createProject({
        name: 'Other Project',
        slug: 'other-project',
        ownerId: otherUser.id,
        memberIds: [],
        settings: {},
      });

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/agents/events',
        headers: {
          Authorization: `Bearer ${testToken}`,
          'Content-Type': 'application/json',
        },
        payload: {
          projectId: otherProject.id,
          sessionId: 'test-session-1',
          type: 'session_start',
          timestamp: new Date().toISOString(),
        },
      });

      expect(response.statusCode).toBe(403);
    });
  });

  describe('POST /api/v1/agents/events/batch', () => {
    it('should create multiple events', async () => {
      const now = new Date();
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/agents/events/batch',
        headers: {
          Authorization: `Bearer ${testToken}`,
          'Content-Type': 'application/json',
        },
        payload: {
          events: [
            {
              projectId: testProjectId,
              sessionId: 'test-session-1',
              type: 'session_start',
              timestamp: now.toISOString(),
            },
            {
              projectId: testProjectId,
              sessionId: 'test-session-1',
              type: 'tool_use',
              timestamp: new Date(now.getTime() + 1000).toISOString(),
              data: { tool: 'read', path: '/etc/passwd' },
            },
          ],
        },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.results).toHaveLength(2);
      expect(body.results[0].success).toBe(true);
      expect(body.results[1].success).toBe(true);
    });
  });

  describe('GET /api/v1/agents/sessions/:id', () => {
    it('should return a specific session', async () => {
      // Create session via event
      await app.inject({
        method: 'POST',
        url: '/api/v1/agents/events',
        headers: {
          Authorization: `Bearer ${testToken}`,
          'Content-Type': 'application/json',
        },
        payload: {
          projectId: testProjectId,
          sessionId: 'test-session-1',
          type: 'session_start',
          timestamp: new Date().toISOString(),
        },
      });

      // Get sessions to find the session ID
      const sessionsResponse = await app.inject({
        method: 'GET',
        url: `/api/v1/agents/projects/${testProjectId}/sessions`,
        headers: {
          Authorization: `Bearer ${testToken}`,
        },
      });

      const sessions = JSON.parse(sessionsResponse.body);
      const sessionId = sessions.data[0].id;

      // Get specific session
      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/agents/sessions/${sessionId}`,
        headers: {
          Authorization: `Bearer ${testToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.id).toBe(sessionId);
    });

    it('should return 404 for non-existent session', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/agents/sessions/ses_nonexistent',
        headers: {
          Authorization: `Bearer ${testToken}`,
        },
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('GET /api/v1/agents/sessions/:id/events', () => {
    it('should return events for a session', async () => {
      // Create events
      await app.inject({
        method: 'POST',
        url: '/api/v1/agents/events',
        headers: {
          Authorization: `Bearer ${testToken}`,
          'Content-Type': 'application/json',
        },
        payload: {
          projectId: testProjectId,
          sessionId: 'test-session-1',
          type: 'session_start',
          timestamp: new Date().toISOString(),
        },
      });

      // Get sessions
      const sessionsResponse = await app.inject({
        method: 'GET',
        url: `/api/v1/agents/projects/${testProjectId}/sessions`,
        headers: {
          Authorization: `Bearer ${testToken}`,
        },
      });

      const sessions = JSON.parse(sessionsResponse.body);
      const sessionId = sessions.data[0].id;

      // Get events
      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/agents/sessions/${sessionId}/events`,
        headers: {
          Authorization: `Bearer ${testToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data).toHaveLength(1);
      expect(body.data[0].type).toBe('session_start');
    });
  });
});
