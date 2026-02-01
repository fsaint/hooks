/**
 * Cron job monitoring routes
 */

import type { FastifyInstance } from 'fastify';
import { requireAuth, requireScope } from '../lib/auth.js';
import { ApiError } from '../lib/errors.js';
import { store } from '../lib/store.js';
import {
  createCronJobSchema,
  updateCronJobSchema,
  cronEventSchema,
  paginationSchema,
  type CreateCronJobInput,
  type UpdateCronJobInput,
  type CronEventInput,
} from '../schemas/index.js';

export async function cronRoutes(fastify: FastifyInstance): Promise<void> {
  // All cron routes require authentication
  fastify.addHook('preHandler', requireAuth);

  /** Report a cron event */
  fastify.post<{ Body: CronEventInput }>('/events', async (request, reply) => {
    await requireScope('crons:write')(request, reply);

    const data = cronEventSchema.parse(request.body);

    // Validate project access
    const project = store.getProject(data.projectId);
    if (!project) {
      throw ApiError.notFound('Project');
    }
    if (project.ownerId !== request.user!.id && !project.memberIds.includes(request.user!.id)) {
      throw ApiError.forbidden('You do not have access to this project');
    }

    // Get or create cron job
    let job = store.getCronJobByName(data.projectId, data.jobName);
    if (!job) {
      job = store.createCronJob({
        projectId: data.projectId,
        name: data.jobName,
        status: 'unknown',
        enabled: true,
        alertOnFailure: true,
        alertOnMissed: true,
      });
    }

    if (data.type === 'start') {
      // Create a new run
      const run = store.createCronRun({
        jobId: job.id,
        startedAt: data.timestamp,
        status: 'running',
      });

      // Update job status
      store.updateCronJob(job.id, {
        status: 'running',
        lastRunAt: data.timestamp,
      });

      return reply.code(201).send({
        jobId: job.id,
        runId: run.id,
      });
    } else if (data.type === 'heartbeat') {
      // Update the run with heartbeat
      if (data.runId) {
        const run = store.getCronRun(data.runId);
        if (run) {
          store.updateCronRun(data.runId, {
            lastHeartbeatAt: data.timestamp,
          });
        }
      }

      return reply.code(200).send({ status: 'ok' });
    } else if (data.type === 'end') {
      // Complete the run
      if (data.runId) {
        const run = store.getCronRun(data.runId);
        if (run) {
          store.updateCronRun(data.runId, {
            endedAt: data.timestamp,
            status: data.success ? 'success' : 'failed',
            exitCode: data.exitCode,
            output: data.output,
            error: data.error,
            durationMs: data.durationMs,
          });
        }
      }

      // Update job status
      store.updateCronJob(job.id, {
        status: data.success ? 'healthy' : 'failing',
        lastRunAt: data.timestamp,
        lastSuccessAt: data.success ? data.timestamp : job.lastSuccessAt,
        lastFailureAt: data.success ? job.lastFailureAt : data.timestamp,
      });

      return reply.code(200).send({ status: 'ok' });
    }

    return reply.code(400).send({ error: 'Invalid event type' });
  });

  /** List cron jobs for a project */
  fastify.get<{ Params: { projectId: string } }>(
    '/projects/:projectId/jobs',
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

      const jobs = store.getCronJobsByProject(request.params.projectId);

      // Sort by name
      jobs.sort((a, b) => a.name.localeCompare(b.name));

      // Apply pagination
      const paginated = jobs.slice(query.offset, query.offset + query.limit);

      return {
        data: paginated,
        pagination: {
          total: jobs.length,
          limit: query.limit,
          offset: query.offset,
        },
      };
    }
  );

  /** Create a cron job */
  fastify.post<{ Params: { projectId: string }; Body: CreateCronJobInput }>(
    '/projects/:projectId/jobs',
    async (request, reply) => {
      const data = createCronJobSchema.parse(request.body);

      // Validate project access
      const project = store.getProject(request.params.projectId);
      if (!project) {
        throw ApiError.notFound('Project');
      }
      if (project.ownerId !== request.user!.id && !project.memberIds.includes(request.user!.id)) {
        throw ApiError.forbidden('You do not have access to this project');
      }

      // Check for duplicate name
      const existing = store.getCronJobByName(request.params.projectId, data.name);
      if (existing) {
        throw ApiError.conflict(`Cron job with name "${data.name}" already exists`);
      }

      const job = store.createCronJob({
        projectId: request.params.projectId,
        name: data.name,
        schedule: data.schedule,
        description: data.description,
        expectedDurationMs: data.expectedDurationMs,
        alertOnFailure: data.alertOnFailure,
        alertOnMissed: data.alertOnMissed,
        status: 'unknown',
        enabled: true,
      });

      return reply.code(201).send(job);
    }
  );

  /** Get a cron job */
  fastify.get<{ Params: { id: string } }>('/jobs/:id', async (request) => {
    const job = store.getCronJob(request.params.id);

    if (!job) {
      throw ApiError.notFound('Cron job');
    }

    // Validate project access
    const project = store.getProject(job.projectId);
    if (!project) {
      throw ApiError.notFound('Project');
    }
    if (project.ownerId !== request.user!.id && !project.memberIds.includes(request.user!.id)) {
      throw ApiError.forbidden('You do not have access to this project');
    }

    return job;
  });

  /** Update a cron job */
  fastify.patch<{ Params: { id: string }; Body: UpdateCronJobInput }>(
    '/jobs/:id',
    async (request) => {
      const data = updateCronJobSchema.parse(request.body);
      const job = store.getCronJob(request.params.id);

      if (!job) {
        throw ApiError.notFound('Cron job');
      }

      // Validate project access
      const project = store.getProject(job.projectId);
      if (!project) {
        throw ApiError.notFound('Project');
      }
      if (project.ownerId !== request.user!.id && !project.memberIds.includes(request.user!.id)) {
        throw ApiError.forbidden('You do not have access to this project');
      }

      const updated = store.updateCronJob(request.params.id, data);
      return updated;
    }
  );

  /** Get runs for a cron job */
  fastify.get<{ Params: { id: string } }>('/jobs/:id/runs', async (request) => {
    const query = paginationSchema.parse(request.query);
    const job = store.getCronJob(request.params.id);

    if (!job) {
      throw ApiError.notFound('Cron job');
    }

    // Validate project access
    const project = store.getProject(job.projectId);
    if (!project) {
      throw ApiError.notFound('Project');
    }
    if (project.ownerId !== request.user!.id && !project.memberIds.includes(request.user!.id)) {
      throw ApiError.forbidden('You do not have access to this project');
    }

    const runs = store.getCronRunsByJob(request.params.id);

    // Sort by started time (most recent first)
    runs.sort((a, b) =>
      new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()
    );

    // Apply pagination
    const paginated = runs.slice(query.offset, query.offset + query.limit);

    return {
      data: paginated,
      pagination: {
        total: runs.length,
        limit: query.limit,
        offset: query.offset,
      },
    };
  });

  /** Get a specific run */
  fastify.get<{ Params: { id: string } }>('/runs/:id', async (request) => {
    const run = store.getCronRun(request.params.id);

    if (!run) {
      throw ApiError.notFound('Cron run');
    }

    const job = store.getCronJob(run.jobId);
    if (!job) {
      throw ApiError.notFound('Cron job');
    }

    // Validate project access
    const project = store.getProject(job.projectId);
    if (!project) {
      throw ApiError.notFound('Project');
    }
    if (project.ownerId !== request.user!.id && !project.memberIds.includes(request.user!.id)) {
      throw ApiError.forbidden('You do not have access to this project');
    }

    return run;
  });
}
