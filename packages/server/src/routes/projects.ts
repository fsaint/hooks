/**
 * Project routes
 */

import type { FastifyInstance } from 'fastify';
import { requireAuth } from '../lib/auth.js';
import { ApiError } from '../lib/errors.js';
import { store } from '../lib/store.js';
import {
  createProjectSchema,
  updateProjectSchema,
  paginationSchema,
  type CreateProjectInput,
  type UpdateProjectInput,
} from '../schemas/index.js';

export async function projectRoutes(fastify: FastifyInstance): Promise<void> {
  // All project routes require authentication
  fastify.addHook('preHandler', requireAuth);

  /** List projects for the current user */
  fastify.get('/', async (request) => {
    const query = paginationSchema.parse(request.query);
    const projects = store.getProjectsByUser(request.user!.id);

    // Apply pagination
    const paginated = projects.slice(query.offset, query.offset + query.limit);

    return {
      data: paginated,
      pagination: {
        total: projects.length,
        limit: query.limit,
        offset: query.offset,
      },
    };
  });

  /** Create a new project */
  fastify.post<{ Body: CreateProjectInput }>('/', async (request, reply) => {
    const data = createProjectSchema.parse(request.body);

    // Check if slug is taken
    const existing = store.getProjectBySlug(data.slug);
    if (existing) {
      throw ApiError.conflict(`Project with slug "${data.slug}" already exists`);
    }

    const project = store.createProject({
      ...data,
      ownerId: request.user!.id,
      memberIds: [],
      status: 'active',
    });

    return reply.code(201).send(project);
  });

  /** Get a project by ID */
  fastify.get<{ Params: { id: string } }>('/:id', async (request) => {
    const project = store.getProject(request.params.id);

    if (!project) {
      throw ApiError.notFound('Project');
    }

    // Check access
    if (project.ownerId !== request.user!.id && !project.memberIds.includes(request.user!.id)) {
      throw ApiError.forbidden('You do not have access to this project');
    }

    return project;
  });

  /** Update a project */
  fastify.patch<{ Params: { id: string }; Body: UpdateProjectInput }>(
    '/:id',
    async (request) => {
      const data = updateProjectSchema.parse(request.body);
      const project = store.getProject(request.params.id);

      if (!project) {
        throw ApiError.notFound('Project');
      }

      // Only owner can update
      if (project.ownerId !== request.user!.id) {
        throw ApiError.forbidden('Only the project owner can update it');
      }

      const updated = store.updateProject(request.params.id, data);
      return updated;
    }
  );

  /** Delete a project */
  fastify.delete<{ Params: { id: string } }>('/:id', async (request, reply) => {
    const project = store.getProject(request.params.id);

    if (!project) {
      throw ApiError.notFound('Project');
    }

    // Only owner can delete
    if (project.ownerId !== request.user!.id) {
      throw ApiError.forbidden('Only the project owner can delete it');
    }

    store.deleteProject(request.params.id);
    return reply.code(204).send();
  });

  /** Get project by slug */
  fastify.get<{ Params: { slug: string } }>('/by-slug/:slug', async (request) => {
    const project = store.getProjectBySlug(request.params.slug);

    if (!project) {
      throw ApiError.notFound('Project');
    }

    // Check access
    if (project.ownerId !== request.user!.id && !project.memberIds.includes(request.user!.id)) {
      throw ApiError.forbidden('You do not have access to this project');
    }

    return project;
  });
}
