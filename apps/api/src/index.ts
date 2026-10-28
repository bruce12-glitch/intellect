import Fastify from 'fastify';
import { config } from './config';
import { registerPlugins } from './plugins';
import { registerRoutes } from './routes';
import { setupErrorHandling } from './utils/errors';
import { logger } from './utils/logger';

async function buildApp() {
  const app = Fastify({
    logger: config.NODE_ENV === 'development' ? {
      transport: {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:standard',
          ignore: 'pid,hostname',
        },
      },
    } : true,
    ajv: {
      customOptions: {
        removeAdditional: 'all',
        coerceTypes: 'array',
      },
    },
  });

  // Register plugins
  await registerPlugins(app);

  // Register routes
  await registerRoutes(app);

  // Setup error handling
  setupErrorHandling(app);

  // Health check
  app.get('/health', async () => ({ status: 'ok', timestamp: new Date().toISOString() }));

  return app;
}

async function start() {
  try {
    const app = await buildApp();
    
    await app.listen({ 
      port: config.PORT, 
      host: config.HOST 
    });
    
    logger.info(`Server running at http://${config.HOST}:${config.PORT}`);
    logger.info(`Environment: ${config.NODE_ENV}`);
    
    if (config.NODE_ENV === 'development') {
      logger.info(`Swagger docs: http://${config.HOST}:${config.PORT}/docs`);
    }
  } catch (err) {
    logger.error(err);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully...');
  process.exit(0);
});

start();