/**
 * Agent monitoring routes
 */

import type { FastifyInstance } from 'fastify';
import { requireAuth, requireScope } from '../lib/auth.js';
import { ApiError } from '../lib/errors.js';
import { store } from '../lib/store.js';
import {
  agentEventSchema,
  batchAgentEventsSchema,
  paginationSchema,
  type AgentEventInput,
  type BatchAgentEventsInput,
} from '../schemas/index.js';

export async function agentRoutes(fastify: FastifyInstance): Promise<void> {
  // All agent routes require authentication
  fastify.addHook('preHandler', requireAuth);

  /** Report a single agent event */
  fastify.post<{ Body: AgentEventInput }>('/events', async (request, reply) => {
    await requireScope('agents:write')(request, reply);

    const data = agentEventSchema.parse(request.body);

    // Validate project access
    const project = store.getProject(data.projectId);
    if (!project) {
      throw ApiError.notFound('Project');
    }
    if (project.ownerId !== request.user!.id && !project.memberIds.includes(request.user!.id)) {
      throw ApiError.forbidden('You do not have access to this project');
    }

    // Get or create session
    let session = store.getAgentSession(data.sessionId);
    if (!session) {
      session = store.createAgentSession({
        projectId: data.projectId,
        machineId: 'unknown',
        workingDirectory: 'unknown',
        status: 'active',
        startedAt: data.timestamp,
        lastActivityAt: data.timestamp,
      });
    }

    // Create the event
    const event = store.createAgentEvent({
      sessionId: session.id,
      projectId: data.projectId,
      type: data.type,
      timestamp: data.timestamp,
      data: data.data ?? {},
    });

    // Update session last activity
    store.updateAgentSession(session.id, {
      lastActivityAt: data.timestamp,
      status: data.type === 'session_end' ? 'completed' : 'active',
    });

    return reply.code(201).send(event);
  });

  /** Report batch agent events */
  fastify.post<{ Body: BatchAgentEventsInput }>('/events/batch', async (request, reply) => {
    await requireScope('agents:write')(request, reply);

    const data = batchAgentEventsSchema.parse(request.body);
    const results: Array<{ success: boolean; eventId?: string; error?: string }> = [];

    for (const eventData of data.events) {
      try {
        // Validate project access (only once per unique projectId)
        const project = store.getProject(eventData.projectId);
        if (!project) {
          results.push({ success: false, error: 'Project not found' });
          continue;
        }
        if (project.ownerId !== request.user!.id && !project.memberIds.includes(request.user!.id)) {
          results.push({ success: false, error: 'Access denied' });
          continue;
        }

        // Get or create session
        let session = store.getAgentSession(eventData.sessionId);
        if (!session) {
          session = store.createAgentSession({
            projectId: eventData.projectId,
            machineId: 'unknown',
            workingDirectory: 'unknown',
            status: 'active',
            startedAt: eventData.timestamp,
            lastActivityAt: eventData.timestamp,
          });
        }

        // Create the event
        const event = store.createAgentEvent({
          sessionId: session.id,
          projectId: eventData.projectId,
          type: eventData.type,
          timestamp: eventData.timestamp,
          data: eventData.data ?? {},
        });

        // Update session
        store.updateAgentSession(session.id, {
          lastActivityAt: eventData.timestamp,
          status: eventData.type === 'session_end' ? 'completed' : 'active',
        });

        results.push({ success: true, eventId: event.id });
      } catch (err) {
        results.push({
          success: false,
          error: err instanceof Error ? err.message : 'Unknown error',
        });
      }
    }

    return reply.code(201).send({ results });
  });

  /** List sessions for a project */
  fastify.get<{ Params: { projectId: string } }>(
    '/projects/:projectId/sessions',
    async (request) => {
      const query = paginationSchema.parse(request.query);

      // Validate project access
      const project = store.getProject(request.params.projectId);
      if (!project) {
        throw ApiError.notFound('Project');
      }
      if (project.ownerId !== request.user!.id && !project.memberIds.includes(request.user!.id)) {
        throw ApiError.forbidden('You do not have access to this project');
      }

      const sessions = store.getAgentSessionsByProject(request.params.projectId);

      // Sort by last activity (most recent first)
      sessions.sort((a, b) =>
        new Date(b.lastActivityAt).getTime() - new Date(a.lastActivityAt).getTime()
      );

      // Apply pagination
      const paginated = sessions.slice(query.offset, query.offset + query.limit);

      return {
        data: paginated,
        pagination: {
          total: sessions.length,
          limit: query.limit,
          offset: query.offset,
        },
      };
    }
  );

  /** Get a specific session */
  fastify.get<{ Params: { id: string } }>('/sessions/:id', async (request) => {
    const session = store.getAgentSession(request.params.id);

    if (!session) {
      throw ApiError.notFound('Session');
    }

    // Validate project access
    const project = store.getProject(session.projectId);
    if (!project) {
      throw ApiError.notFound('Project');
    }
    if (project.ownerId !== request.user!.id && !project.memberIds.includes(request.user!.id)) {
      throw ApiError.forbidden('You do not have access to this project');
    }

    return session;
  });

  /** Get events for a session */
  fastify.get<{ Params: { id: string } }>('/sessions/:id/events', async (request) => {
    const query = paginationSchema.parse(request.query);
    const session = store.getAgentSession(request.params.id);

    if (!session) {
      throw ApiError.notFound('Session');
    }

    // Validate project access
    const project = store.getProject(session.projectId);
    if (!project) {
      throw ApiError.notFound('Project');
    }
    if (project.ownerId !== request.user!.id && !project.memberIds.includes(request.user!.id)) {
      throw ApiError.forbidden('You do not have access to this project');
    }

    const events = store.getAgentEventsBySession(request.params.id);

    // Sort by timestamp
    events.sort((a, b) =>
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    // Apply pagination
    const paginated = events.slice(query.offset, query.offset + query.limit);

    return {
      data: paginated,
      pagination: {
        total: events.length,
        limit: query.limit,
        offset: query.offset,
      },
    };
  });
}
