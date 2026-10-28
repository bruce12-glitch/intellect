import { FastifyInstance } from 'fastify';

export async function healthRoutes(app: FastifyInstance) {
  app.get('/health', async () => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  });

  app.get('/health/ready', async (request, reply) => {
    try {
      // Check database connection
      await request.server.prisma.$queryRaw`SELECT 1`;
      
      // Check Redis connection
      await request.server.redis.ping();
      
      return { status: 'ready', timestamp: new Date().toISOString() };
    } catch (err) {
      reply.status(503);
      return { status: 'not ready', timestamp: new Date().toISOString() };
    }
  });

  app.get('/health/live', async () => {
    return { status: 'alive', timestamp: new Date().toISOString() };
  });
}