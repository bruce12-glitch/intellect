import { FastifyInstance } from 'fastify';
import { authRoutes } from './auth';
import { contentRoutes } from './content';
import { summaryRoutes } from './summary';
import { chatRoutes } from './chat';
import { quizRoutes } from './quiz';
import { tagRoutes } from './tag';
import { connectionRoutes } from './connection';
import { exportRoutes } from './export';
import { importRoutes } from './import';
import { userRoutes } from './user';
import { webhookRoutes } from './webhook';
import { healthRoutes } from './health';

export async function registerRoutes(app: FastifyInstance) {
  // Health check
  await app.register(healthRoutes, { prefix: '/api' });

  // Auth routes (no auth required)
  await app.register(authRoutes, { prefix: '/api/auth' });

  // Protected routes
  await app.register(async function (protectedApp) {
    protectedApp.addHook('preHandler', async (request, reply) => {
      try {
        const token = request.cookies.accessToken || 
                     request.headers.authorization?.replace('Bearer ', '');
        
        if (!token) {
          return reply.status(401).send({
            success: false,
            error: {
              code: 'UNAUTHORIZED',
              message: 'Authentication required',
              statusCode: 401,
            },
            meta: {
              timestamp: new Date().toISOString(),
              requestId: request.id,
              version: '1.0.0',
            },
          });
        }

        const decoded = protectedApp.jwt.verify(token);
        request.user = decoded as { id: string; email: string; subscriptionTier: string };
      } catch (err) {
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
    });

    // Content routes
    await protectedApp.register(contentRoutes, { prefix: '/api/content' });
    
    // Summary routes
    await protectedApp.register(summaryRoutes, { prefix: '/api/summaries' });
    
    // Chat routes
    await protectedApp.register(chatRoutes, { prefix: '/api/chat' });
    
    // Quiz routes
    await protectedApp.register(quizRoutes, { prefix: '/api/quizzes' });
    
    // Tag routes
    await protectedApp.register(tagRoutes, { prefix: '/api/tags' });
    
    // Connection routes
    await protectedApp.register(connectionRoutes, { prefix: '/api/connections' });
    
    // Export routes
    await protectedApp.register(exportRoutes, { prefix: '/api/exports' });
    
    // Import routes
    await protectedApp.register(importRoutes, { prefix: '/api/imports' });
    
    // User routes
    await protectedApp.register(userRoutes, { prefix: '/api/user' });
    
    // Webhook routes
    await protectedApp.register(webhookRoutes, { prefix: '/api/webhooks' });
  });
}