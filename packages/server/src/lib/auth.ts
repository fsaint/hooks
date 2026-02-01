/**
 * Authentication plugin for Fastify
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import fp from 'fastify-plugin';
import type { User, ApiToken } from '@hooks/shared';
import { store } from './store.js';

declare module 'fastify' {
  interface FastifyRequest {
    user?: User;
    token?: ApiToken;
  }
}

export interface AuthOptions {
  tokenPrefix: string;
}

/** Authentication plugin */
async function authPlugin(fastify: FastifyInstance, options: AuthOptions) {
  /** Decorator to access current user */
  fastify.decorateRequest('user', undefined);
  fastify.decorateRequest('token', undefined);

  /** Hook to parse authentication */
  fastify.addHook('onRequest', async (request: FastifyRequest) => {
    const authHeader = request.headers.authorization;

    if (!authHeader) {
      return;
    }

    // Bearer token authentication
    if (authHeader.startsWith('Bearer ')) {
      const tokenValue = authHeader.slice(7);

      // Validate token format
      if (!tokenValue.startsWith(options.tokenPrefix)) {
        return;
      }

      const token = store.getApiTokenByValue(tokenValue);
      if (!token) {
        return;
      }

      // Check if token is expired
      if (token.expiresAt && new Date(token.expiresAt) < new Date()) {
        return;
      }

      // Update last used timestamp
      store.getApiTokensByUser(token.userId);

      const user = store.getUser(token.userId);
      if (user) {
        request.user = user;
        request.token = token;
      }
    }
  });
}

export const auth = fp(authPlugin, {
  name: 'auth',
});

/** Require authentication middleware */
export async function requireAuth(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  if (!request.user) {
    reply.code(401).send({
      error: 'Unauthorized',
      message: 'Authentication required',
    });
    return;
  }
}

/** Require specific token scope */
export function requireScope(scope: string) {
  return async function (
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<void> {
    if (!request.user) {
      reply.code(401).send({
        error: 'Unauthorized',
        message: 'Authentication required',
      });
      return;
    }

    if (!request.token) {
      return; // Session auth, allow all
    }

    // Check token scopes
    const hasScope = request.token.scopes.some(
      (s) => s === scope || s === '*'
    );
    if (!hasScope) {
      reply.code(403).send({
        error: 'Forbidden',
        message: `Insufficient permissions. Required scope: ${scope}`,
      });
    }
  };
}
