/**
 * Alerts routes
 */

import type { FastifyInstance } from 'fastify';
import { requireAuth } from '../lib/auth.js';
import { ApiError } from '../lib/errors.js';
import { store } from '../lib/store.js';
import {
  createAlertRuleSchema,
  acknowledgeAlertSchema,
  paginationSchema,
} from '../schemas/index.js';

export async function alertRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.addHook('preHandler', requireAuth);

  /** List alerts for a project */
  fastify.get<{ Params: { projectId: string } }>(
    '/projects/:projectId/alerts',
    async (request) => {
      const query = paginationSchema.parse(request.query);

      const project = store.getProject(request.params.projectId);
      if (!project) {
        throw ApiError.notFound('Project');
      }
      if (project.ownerId !== request.user!.id && !project.memberIds.includes(request.user!.id)) {
        throw ApiError.forbidden('You do not have access to this project');
      }

      const alerts = store.getAlertsByProject(request.params.projectId);
      
      // Sort by created time (most recent first)
      alerts.sort((a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      const paginated = alerts.slice(query.offset, query.offset + query.limit);

      return {
        data: paginated,
        pagination: {
          total: alerts.length,
          limit: query.limit,
          offset: query.offset,
        },
      };
    }
  );

  /** Get a specific alert */
  fastify.get<{ Params: { id: string } }>('/:id', async (request) => {
    const alert = store.getAlert(request.params.id);

    if (!alert) {
      throw ApiError.notFound('Alert');
    }

    const project = store.getProject(alert.projectId);
    if (!project) {
      throw ApiError.notFound('Project');
    }
    if (project.ownerId !== request.user!.id && !project.memberIds.includes(request.user!.id)) {
      throw ApiError.forbidden('You do not have access to this project');
    }

    return alert;
  });

  /** Acknowledge an alert */
  fastify.post<{ Params: { id: string }; Body: { note?: string } }>(
    '/:id/acknowledge',
    async (request) => {
      const data = acknowledgeAlertSchema.parse(request.body);
      const alert = store.getAlert(request.params.id);

      if (!alert) {
        throw ApiError.notFound('Alert');
      }

      const project = store.getProject(alert.projectId);
      if (!project) {
        throw ApiError.notFound('Project');
      }
      if (project.ownerId !== request.user!.id && !project.memberIds.includes(request.user!.id)) {
        throw ApiError.forbidden('You do not have access to this project');
      }

      if (alert.status !== 'active') {
        throw ApiError.badRequest('Alert is not active');
      }

      const updated = store.updateAlert(request.params.id, {
        status: 'acknowledged',
        acknowledgedAt: new Date().toISOString(),
        acknowledgedBy: request.user!.id,
      });

      return updated;
    }
  );

  /** Resolve an alert */
  fastify.post<{ Params: { id: string } }>(
    '/:id/resolve',
    async (request) => {
      const alert = store.getAlert(request.params.id);

      if (!alert) {
        throw ApiError.notFound('Alert');
      }

      const project = store.getProject(alert.projectId);
      if (!project) {
        throw ApiError.notFound('Project');
      }
      if (project.ownerId !== request.user!.id && !project.memberIds.includes(request.user!.id)) {
        throw ApiError.forbidden('You do not have access to this project');
      }

      const updated = store.updateAlert(request.params.id, {
        status: 'resolved',
        resolvedAt: new Date().toISOString(),
      });

      return updated;
    }
  );

  /** List alert rules for a project */
  fastify.get<{ Params: { projectId: string } }>(
    '/projects/:projectId/rules',
    async (request) => {
      const project = store.getProject(request.params.projectId);
      if (!project) {
        throw ApiError.notFound('Project');
      }
      if (project.ownerId !== request.user!.id && !project.memberIds.includes(request.user!.id)) {
        throw ApiError.forbidden('You do not have access to this project');
      }

      const rules = store.getAlertRulesByProject(request.params.projectId);
      return { data: rules };
    }
  );

  /** Create an alert rule */
  fastify.post<{ Params: { projectId: string } }>(
    '/projects/:projectId/rules',
    async (request, reply) => {
      const data = createAlertRuleSchema.parse(request.body);

      const project = store.getProject(request.params.projectId);
      if (!project) {
        throw ApiError.notFound('Project');
      }
      if (project.ownerId !== request.user!.id && !project.memberIds.includes(request.user!.id)) {
        throw ApiError.forbidden('You do not have access to this project');
      }

      const rule = store.createAlertRule({
        projectId: request.params.projectId,
        name: data.name,
        type: data.type as any,
        condition: data.condition,
        channels: data.channels as any,
        cooldownMs: data.cooldownMs,
        enabled: data.enabled,
      });

      return reply.code(201).send(rule);
    }
  );
}
