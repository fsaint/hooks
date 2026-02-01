/**
 * Authentication routes
 */

import type { FastifyInstance } from 'fastify';
import { requireAuth } from '../lib/auth.js';
import { ApiError } from '../lib/errors.js';
import { store } from '../lib/store.js';
import { generateId, type TokenScope } from '@hooks/shared';
import {
  loginSchema,
  registerSchema,
  createApiTokenSchema,
  type LoginInput,
  type RegisterInput,
  type CreateApiTokenInput,
} from '../schemas/index.js';
import type { ServerConfig } from '../lib/config.js';

export function createAuthRoutes(config: ServerConfig) {
  return async function authRoutes(fastify: FastifyInstance): Promise<void> {
    /** Register a new user */
    fastify.post<{ Body: RegisterInput }>('/register', async (request, reply) => {
      const data = registerSchema.parse(request.body);

      // Check if email is taken
      const existing = store.getUserByEmail(data.email);
      if (existing) {
        throw ApiError.conflict('Email already registered');
      }

      // Create user (in a real app, we'd hash the password)
      const user = store.createUser({
        email: data.email,
        name: data.name,
        passwordHash: data.password, // TODO: Hash this properly
      });

      // Create default API token
      const tokenValue = `${config.auth.tokenPrefix}${generateId('tok')}_${Date.now().toString(36)}`;
      const token = store.createApiToken({
        userId: user.id,
        name: 'Default token',
        value: tokenValue,
        scopes: ['*'],
      });

      return reply.code(201).send({
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
        },
        token: {
          id: token.id,
          value: token.value,
          scopes: token.scopes,
        },
      });
    });

    /** Login */
    fastify.post<{ Body: LoginInput }>('/login', async (request, reply) => {
      const data = loginSchema.parse(request.body);

      // Find user
      const user = store.getUserByEmail(data.email);
      if (!user) {
        throw ApiError.unauthorized('Invalid email or password');
      }

      // Check password (in a real app, we'd compare hashes)
      if (user.passwordHash !== data.password) {
        throw ApiError.unauthorized('Invalid email or password');
      }

      // Create session token
      const tokenValue = `${config.auth.tokenPrefix}${generateId('ses')}_${Date.now().toString(36)}`;
      const token = store.createApiToken({
        userId: user.id,
        name: 'Session token',
        value: tokenValue,
        scopes: ['*'],
        expiresAt: new Date(Date.now() + config.auth.sessionTtlMs).toISOString(),
      });

      return reply.send({
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
        },
        token: {
          id: token.id,
          value: token.value,
          scopes: token.scopes,
          expiresAt: token.expiresAt,
        },
      });
    });

    /** Get current user */
    fastify.get('/me', { preHandler: requireAuth }, async (request) => {
      return {
        id: request.user!.id,
        email: request.user!.email,
        name: request.user!.name,
        createdAt: request.user!.createdAt,
      };
    });

    /** Logout (invalidate current token) */
    fastify.post('/logout', { preHandler: requireAuth }, async (request, reply) => {
      if (request.token) {
        store.deleteApiToken(request.token.id);
      }
      return reply.code(204).send();
    });

    /** List API tokens */
    fastify.get('/tokens', { preHandler: requireAuth }, async (request) => {
      const tokens = store.getApiTokensByUser(request.user!.id);

      // Don't expose the full token value
      return tokens.map((t) => ({
        id: t.id,
        name: t.name,
        scopes: t.scopes,
        createdAt: t.createdAt,
        lastUsedAt: t.lastUsedAt,
        expiresAt: t.expiresAt,
        // Show only prefix of token value for identification
        valuePrefix: t.value.substring(0, 12) + '...',
      }));
    });

    /** Create API token */
    fastify.post<{ Body: CreateApiTokenInput }>(
      '/tokens',
      { preHandler: requireAuth },
      async (request, reply) => {
        const data = createApiTokenSchema.parse(request.body);

        const tokenValue = `${config.auth.tokenPrefix}${generateId('tok')}_${Date.now().toString(36)}`;
        const token = store.createApiToken({
          userId: request.user!.id,
          name: data.name,
          value: tokenValue,
          scopes: data.scopes as TokenScope[],
          expiresAt: data.expiresAt,
        });

        // Return full token value only on creation
        return reply.code(201).send({
          id: token.id,
          name: token.name,
          value: token.value,
          scopes: token.scopes,
          createdAt: token.createdAt,
          expiresAt: token.expiresAt,
        });
      }
    );

    /** Delete API token */
    fastify.delete<{ Params: { id: string } }>(
      '/tokens/:id',
      { preHandler: requireAuth },
      async (request, reply) => {
        const tokens = store.getApiTokensByUser(request.user!.id);
        const token = tokens.find((t) => t.id === request.params.id);

        if (!token) {
          throw ApiError.notFound('Token');
        }

        store.deleteApiToken(request.params.id);
        return reply.code(204).send();
      }
    );
  };
}
