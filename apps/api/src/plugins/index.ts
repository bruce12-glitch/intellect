import { FastifyInstance } from 'fastify';
import { config } from '../config';
import { PrismaClient } from '@prisma/client';
import Redis from 'ioredis';
import jwt from '@fastify/jwt';
import cookie from '@fastify/cookie';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import multipart from '@fastify/multipart';
import { logger } from '../utils/logger';

// Declare module augmentation for Fastify
declare module 'fastify' {
  interface FastifyInstance {
    prisma: PrismaClient;
    redis: Redis;
  }
  
  interface FastifyRequest {
    user?: {
      id: string;
      email: string;
      subscriptionTier: string;
    };
  }
}

export async function registerPlugins(app: FastifyInstance) {
  // Security headers
  await app.register(helmet, {
    contentSecurityPolicy: config.isDevelopment ? false : {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: ["'self'"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"],
      },
    },
  });

  // CORS
  await app.register(cors, {
    origin: config.FRONTEND_URL,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  });

  // Rate limiting
  await app.register(rateLimit, {
    max: config.isDevelopment ? 1000 : 100,
    timeWindow: '1 minute',
    keyGenerator: (request) => request.ip,
    skipOnError: true,
    ban: 0,
  });

  // Cookies
  await app.register(cookie, {
    secret: config.JWT_SECRET,
    hook: 'onRequest',
    parseOptions: {
      httpOnly: true,
      secure: config.isProduction,
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    },
  });

  // JWT
  await app.register(jwt, {
    secret: config.JWT_SECRET,
    sign: {
      expiresIn: config.JWT_EXPIRES_IN,
    },
    cookie: {
      cookieName: 'accessToken',
      signed: false,
    },
  });

  // Multipart for file uploads
  await app.register(multipart, {
    limits: {
      fileSize: 50 * 1024 * 1024, // 50MB
      files: 10,
    },
  });

  // Swagger documentation
  if (config.isDevelopment) {
    await app.register(swagger, {
      openapi: {
        info: {
          title: 'Intellect API',
          description: 'AI-powered knowledge management platform API',
          version: '1.0.0',
        },
        servers: [
          {
            url: `http://${config.HOST}:${config.PORT}`,
            description: 'Development server',
          },
        ],
        components: {
          securitySchemes: {
            bearerAuth: {
              type: 'http',
              scheme: 'bearer',
              bearerFormat: 'JWT',
            },
            cookieAuth: {
              type: 'apiKey',
              in: 'cookie',
              name: 'accessToken',
            },
          },
        },
        security: [
          { bearerAuth: [] },
          { cookieAuth: [] },
        ],
      },
    });

    await app.register(swaggerUi, {
      routePrefix: '/docs',
      uiConfig: {
        docExpansion: 'list',
        deepLinking: true,
      },
    });
  }

  // Prisma client
  const prisma = new PrismaClient({
    log: config.isDevelopment 
      ? ['query', 'error', 'warn'] 
      : ['error'],
  });

  app.decorate('prisma', prisma);

  // Redis client
  const redis = new Redis(config.REDIS_URL, {
    maxRetriesPerRequest: 3,
    retryStrategy: (times) => {
      if (times > 3) return null;
      return Math.min(times * 200, 2000);
    },
    lazyConnect: true,
  });

  redis.on('error', (err) => {
    logger.error({ err }, 'Redis connection error');
  });

  redis.on('connect', () => {
    logger.info('Redis connected');
  });

  await redis.connect();
  app.decorate('redis', redis);

  // Graceful shutdown
  app.addHook('onClose', async (instance) => {
    await instance.prisma.$disconnect();
    await instance.redis.quit();
  });

  // Request logging
  app.addHook('onRequest', async (request) => {
    request.startTime = Date.now();
    logger.debug({
      requestId: request.id,
      method: request.method,
      url: request.url,
      ip: request.ip,
    }, 'Incoming request');
  });

  app.addHook('onResponse', async (request, reply) => {
    const duration = Date.now() - (request.startTime || Date.now());
    logger.debug({
      requestId: request.id,
      method: request.method,
      url: request.url,
      statusCode: reply.statusCode,
      duration: `${duration}ms`,
    }, 'Request completed');
  });

  // Authentication decorator
  app.decorateRequest('user', null);
}