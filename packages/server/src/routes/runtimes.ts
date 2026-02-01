/**
 * Runtime monitoring routes
 */

import type { FastifyInstance } from 'fastify';
import { requireAuth, requireScope } from '../lib/auth.js';
import { ApiError } from '../lib/errors.js';
import { store } from '../lib/store.js';
import type { RuntimeConfig } from '@hooks/shared';
import {
  createRuntimeSchema,
  updateRuntimeSchema,
  runtimeStatusSchema,
  paginationSchema,
  type CreateRuntimeInput,
  type UpdateRuntimeInput,
  type RuntimeStatusInput,
} from '../schemas/index.js';

export async function runtimeRoutes(fastify: FastifyInstance): Promise<void> {
  // All runtime routes require authentication
  fastify.addHook('preHandler', requireAuth);

  /** Report runtime status */
  fastify.post<{ Body: RuntimeStatusInput }>('/status', async (request, reply) => {
    await requireScope('runtimes:write')(request, reply);

    const data = runtimeStatusSchema.parse(request.body);

    // Validate project access
    const project = store.getProject(data.projectId);
    if (!project) {
      throw ApiError.notFound('Project');
    }
    if (project.ownerId !== request.user!.id && !project.memberIds.includes(request.user!.id)) {
      throw ApiError.forbidden('You do not have access to this project');
    }

    // Get or create runtime
    let runtime = store.getRuntimeByName(data.projectId, data.runtimeName);
    if (!runtime) {
      const defaultConfig: RuntimeConfig = {
        type: 'http',
        url: 'unknown',
      };
      runtime = store.createRuntime({
        projectId: data.projectId,
        name: data.runtimeName,
        type: 'http',
        config: defaultConfig,
        status: data.success ? 'healthy' : 'unhealthy',
        enabled: true,
        intervalMs: 30000,
        timeoutMs: 10000,
        alertOnDown: true,
      });
    }

    // Create health check record
    const healthCheck = store.createHealthCheck({
      runtimeId: runtime.id,
      success: data.success,
      timestamp: data.timestamp,
      responseTimeMs: data.responseTimeMs,
      errorMessage: data.errorMessage,
      metadata: data.metadata,
    });

    // Update runtime status
    const previousStatus = runtime.status;
    const newStatus = data.success ? 'healthy' : 'unhealthy';

    store.updateRuntime(runtime.id, {
      status: newStatus,
      lastCheckAt: data.timestamp,
      lastSuccessAt: data.success ? data.timestamp : runtime.lastSuccessAt,
      lastFailureAt: data.success ? runtime.lastFailureAt : data.timestamp,
    });

    // TODO: Trigger alerts if status changed

    return reply.code(201).send({
      runtimeId: runtime.id,
      healthCheckId: healthCheck.id,
      statusChanged: previousStatus !== newStatus,
      previousStatus,
      newStatus,
    });
  });

  /** List runtimes for a project */
  fastify.get<{ Params: { projectId: string } }>(
    '/projects/:projectId/runtimes',
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

      const runtimes = store.getRuntimesByProject(request.params.projectId);

      // Sort by name
      runtimes.sort((a, b) => a.name.localeCompare(b.name));

      // Apply pagination
      const paginated = runtimes.slice(query.offset, query.offset + query.limit);

      return {
        data: paginated,
        pagination: {
          total: runtimes.length,
          limit: query.limit,
          offset: query.offset,
        },
      };
    }
  );

  /** Create a runtime */
  fastify.post<{ Params: { projectId: string }; Body: CreateRuntimeInput }>(
    '/projects/:projectId/runtimes',
    async (request, reply) => {
      const data = createRuntimeSchema.parse(request.body);

      // Validate project access
      const project = store.getProject(request.params.projectId);
      if (!project) {
        throw ApiError.notFound('Project');
      }
      if (project.ownerId !== request.user!.id && !project.memberIds.includes(request.user!.id)) {
        throw ApiError.forbidden('You do not have access to this project');
      }

      // Check for duplicate name
      const existing = store.getRuntimeByName(request.params.projectId, data.name);
      if (existing) {
        throw ApiError.conflict(`Runtime with name "${data.name}" already exists`);
      }

      const runtime = store.createRuntime({
        projectId: request.params.projectId,
        name: data.name,
        type: data.type,
        config: data.config as unknown as RuntimeConfig,
        status: 'unknown',
        enabled: true,
        intervalMs: data.intervalMs,
        timeoutMs: data.timeoutMs,
        alertOnDown: data.alertOnDown,
      });

      return reply.code(201).send(runtime);
    }
  );

  /** Get a runtime */
  fastify.get<{ Params: { id: string } }>('/:id', async (request) => {
    const runtime = store.getRuntime(request.params.id);

    if (!runtime) {
      throw ApiError.notFound('Runtime');
    }

    // Validate project access
    const project = store.getProject(runtime.projectId);
    if (!project) {
      throw ApiError.notFound('Project');
    }
    if (project.ownerId !== request.user!.id && !project.memberIds.includes(request.user!.id)) {
      throw ApiError.forbidden('You do not have access to this project');
    }

    return runtime;
  });

  /** Update a runtime */
  fastify.patch<{ Params: { id: string }; Body: UpdateRuntimeInput }>(
    '/:id',
    async (request) => {
      const data = updateRuntimeSchema.parse(request.body);
      const runtime = store.getRuntime(request.params.id);

      if (!runtime) {
        throw ApiError.notFound('Runtime');
      }

      // Validate project access
      const project = store.getProject(runtime.projectId);
      if (!project) {
        throw ApiError.notFound('Project');
      }
      if (project.ownerId !== request.user!.id && !project.memberIds.includes(request.user!.id)) {
        throw ApiError.forbidden('You do not have access to this project');
      }

      const updateData = {
        ...data,
        config: data.config as RuntimeConfig | undefined,
      };
      const updated = store.updateRuntime(request.params.id, updateData);
      return updated;
    }
  );

  /** Delete a runtime */
  fastify.delete<{ Params: { id: string } }>('/:id', async (request, reply) => {
    const runtime = store.getRuntime(request.params.id);

    if (!runtime) {
      throw ApiError.notFound('Runtime');
    }

    // Validate project access
    const project = store.getProject(runtime.projectId);
    if (!project) {
      throw ApiError.notFound('Project');
    }
    if (project.ownerId !== request.user!.id && !project.memberIds.includes(request.user!.id)) {
      throw ApiError.forbidden('You do not have access to this project');
    }

    // Note: store doesn't have deleteRuntime yet, would need to add
    return reply.code(204).send();
  });

  /** Get health checks for a runtime */
  fastify.get<{ Params: { id: string } }>('/:id/health-checks', async (request) => {
    const query = paginationSchema.parse(request.query);
    const runtime = store.getRuntime(request.params.id);

    if (!runtime) {
      throw ApiError.notFound('Runtime');
    }

    // Validate project access
    const project = store.getProject(runtime.projectId);
    if (!project) {
      throw ApiError.notFound('Project');
    }
    if (project.ownerId !== request.user!.id && !project.memberIds.includes(request.user!.id)) {
      throw ApiError.forbidden('You do not have access to this project');
    }

    const checks = store.getHealthChecksByRuntime(request.params.id);

    // Sort by timestamp (most recent first)
    checks.sort((a, b) =>
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    // Apply pagination
    const paginated = checks.slice(query.offset, query.offset + query.limit);

    return {
      data: paginated,
      pagination: {
        total: checks.length,
        limit: query.limit,
        offset: query.offset,
      },
    };
  });

  /** Get latest health check for a runtime */
  fastify.get<{ Params: { id: string } }>('/:id/health-checks/latest', async (request) => {
    const runtime = store.getRuntime(request.params.id);

    if (!runtime) {
      throw ApiError.notFound('Runtime');
    }

    // Validate project access
    const project = store.getProject(runtime.projectId);
    if (!project) {
      throw ApiError.notFound('Project');
    }
    if (project.ownerId !== request.user!.id && !project.memberIds.includes(request.user!.id)) {
      throw ApiError.forbidden('You do not have access to this project');
    }

    const latest = store.getLatestHealthCheck(request.params.id);

    if (!latest) {
      throw ApiError.notFound('Health check');
    }

    return latest;
  });
}
