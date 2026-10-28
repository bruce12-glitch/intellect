import { FastifyInstance, FastifyError, FastifyRequest, FastifyReply } from 'fastify';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';
import { logger } from './logger';

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details?: Record<string, unknown>;
  public readonly isOperational: boolean;

  constructor(
    message: string,
    statusCode: number = 500,
    code: string = 'INTERNAL_ERROR',
    details?: Record<string, unknown>
  ) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.isOperational = true;
    
    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(message: string, details?: Record<string, unknown>) {
    return new AppError(message, 400, 'BAD_REQUEST', details);
  }

  static unauthorized(message: string = 'Unauthorized', details?: Record<string, unknown>) {
    return new AppError(message, 401, 'UNAUTHORIZED', details);
  }

  static forbidden(message: string = 'Forbidden', details?: Record<string, unknown>) {
    return new AppError(message, 403, 'FORBIDDEN', details);
  }

  static notFound(message: string = 'Resource not found', details?: Record<string, unknown>) {
    return new AppError(message, 404, 'NOT_FOUND', details);
  }

  static conflict(message: string, details?: Record<string, unknown>) {
    return new AppError(message, 409, 'CONFLICT', details);
  }

  static tooManyRequests(message: string = 'Too many requests', details?: Record<string, unknown>) {
    return new AppError(message, 429, 'TOO_MANY_REQUESTS', details);
  }

  static internal(message: string = 'Internal server error', details?: Record<string, unknown>) {
    return new AppError(message, 500, 'INTERNAL_ERROR', details);
  }

  static serviceUnavailable(message: string = 'Service unavailable', details?: Record<string, unknown>) {
    return new AppError(message, 503, 'SERVICE_UNAVAILABLE', details);
  }
}

export function setupErrorHandling(app: FastifyInstance) {
  app.setErrorHandler(async (error: FastifyError, request: FastifyRequest, reply: FastifyReply) => {
    // Log the error
    logger.error({
      err: error,
      requestId: request.id,
      method: request.method,
      url: request.url,
      params: request.params,
      query: request.query,
      body: request.body,
    }, 'Request error');

    // Handle Zod validation errors
    if (error instanceof ZodError) {
      return reply.status(400).send({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request data',
          details: error.flatten().fieldErrors,
          statusCode: 400,
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId: request.id,
          version: '1.0.0',
        },
      });
    }

    // Handle Prisma errors
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        const target = error.meta?.target as string[] | undefined;
        return reply.status(409).send({
          success: false,
          error: {
            code: 'DUPLICATE_ENTRY',
            message: `A record with this ${target?.join(', ') || 'value'} already exists`,
            details: { target },
            statusCode: 409,
          },
          meta: {
            timestamp: new Date().toISOString(),
            requestId: request.id,
            version: '1.0.0',
          },
        });
      }
      
      if (error.code === 'P2025') {
        return reply.status(404).send({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Record not found',
            statusCode: 404,
          },
          meta: {
            timestamp: new Date().toISOString(),
            requestId: request.id,
            version: '1.0.0',
          },
        });
      }
    }

    // Handle known operational errors
    if (error instanceof AppError) {
      return reply.status(error.statusCode).send({
        success: false,
        error: {
          code: error.code,
          message: error.message,
          details: error.details,
          statusCode: error.statusCode,
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId: request.id,
          version: '1.0.0',
        },
      });
    }

    // Handle JWT errors
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return reply.status(401).send({
        success: false,
        error: {
          code: 'INVALID_TOKEN',
          message: 'Invalid or expired token',
          statusCode: 401,
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId: request.id,
          version: '1.0.0',
        },
      });
    }

    // Handle rate limit errors
    if (error.statusCode === 429) {
      return reply.status(429).send({
        success: false,
        error: {
          code: 'RATE_LIMITED',
          message: 'Too many requests, please try again later',
          statusCode: 429,
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId: request.id,
          version: '1.0.0',
        },
      });
    }

    // Default error response
    const statusCode = error.statusCode || 500;
    const message = config.isDevelopment ? error.message : 'Internal server error';
    
    return reply.status(statusCode).send({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message,
        statusCode,
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: request.id,
        version: '1.0.0',
      },
    });
  });

  // Handle 404 for routes not found
  app.setNotFoundHandler(async (request, reply) => {
    return reply.status(404).send({
      success: false,
      error: {
        code: 'ROUTE_NOT_FOUND',
        message: `Route ${request.method} ${request.url} not found`,
        statusCode: 404,
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: request.id,
        version: '1.0.0',
      },
    });
  });
}