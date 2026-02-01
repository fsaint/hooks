/**
 * Error handling utilities
 */

import type { FastifyInstance, FastifyError } from 'fastify';
import { ZodError } from 'zod';

/** Custom API error class */
export class ApiError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public code?: string
  ) {
    super(message);
    this.name = 'ApiError';
  }

  static badRequest(message: string, code?: string): ApiError {
    return new ApiError(400, message, code ?? 'BAD_REQUEST');
  }

  static unauthorized(message = 'Unauthorized'): ApiError {
    return new ApiError(401, message, 'UNAUTHORIZED');
  }

  static forbidden(message = 'Forbidden'): ApiError {
    return new ApiError(403, message, 'FORBIDDEN');
  }

  static notFound(resource = 'Resource'): ApiError {
    return new ApiError(404, `${resource} not found`, 'NOT_FOUND');
  }

  static conflict(message: string): ApiError {
    return new ApiError(409, message, 'CONFLICT');
  }

  static internal(message = 'Internal server error'): ApiError {
    return new ApiError(500, message, 'INTERNAL_ERROR');
  }
}

/** Set up error handler for Fastify */
export function setupErrorHandler(fastify: FastifyInstance): void {
  fastify.setErrorHandler((error: FastifyError | Error, request, reply) => {
    const { log } = request;

    // Handle Zod validation errors
    if (error instanceof ZodError) {
      const issues = error.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message,
      }));

      return reply.code(400).send({
        error: 'Validation Error',
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed',
        details: issues,
      });
    }

    // Handle custom API errors
    if (error instanceof ApiError) {
      return reply.code(error.statusCode).send({
        error: error.name,
        code: error.code,
        message: error.message,
      });
    }

    // Handle Fastify validation errors
    if ('validation' in error && error.validation) {
      return reply.code(400).send({
        error: 'Validation Error',
        code: 'VALIDATION_ERROR',
        message: error.message,
      });
    }

    // Log unexpected errors
    log.error(error, 'Unhandled error');

    // Don't expose internal errors in production
    const message =
      process.env['NODE_ENV'] === 'production'
        ? 'Internal server error'
        : error.message;

    return reply.code(500).send({
      error: 'Internal Server Error',
      code: 'INTERNAL_ERROR',
      message,
    });
  });

  // Handle 404s
  fastify.setNotFoundHandler((request, reply) => {
    reply.code(404).send({
      error: 'Not Found',
      code: 'NOT_FOUND',
      message: `Route ${request.method} ${request.url} not found`,
    });
  });
}
