import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { AppError } from '../utils/errors';
import { findConnections } from '../services/ai';

const createConnectionSchema = z.object({
  sourceContentId: z.string().uuid(),
  targetContentId: z.string().uuid(),
  type: z.enum(['SEMANTIC', 'REFERENCE', 'SEQUENCE', 'AUTHOR', 'TAG', 'TEMPORAL', 'USER']),
  strength: z.number().min(0).max(1).default(0.5),
  description: z.string().optional(),
});

export async function connectionRoutes(app: FastifyInstance) {
  // Get connections for content item
  app.get('/content/:contentItemId', async (request, reply) => {
    const { contentItemId } = request.params as { contentItemId: string };
    const userId = request.user!.id;
    
    const contentItem = await app.prisma.contentItem.findFirst({
      where: { id: contentItemId, userId },
    });
    
    if (!contentItem) {
      throw AppError.notFound('Content item not found');
    }
    
    const [fromConnections, toConnections] = await Promise.all([
      app.prisma.connection.findMany({
        where: { sourceContentId: contentItemId, userId },
        include: { targetContent: { include: { tags: true } } },
      }),
      app.prisma.connection.findMany({
        where: { targetContentId: contentItemId, userId },
        include: { sourceContent: { include: { tags: true } } },
      }),
    ]);
    
    return {
      success: true,
      data: { from: fromConnections, to: toConnections },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: request.id,
        version: '1.0.0',
      },
    };
  });

  // Create connection
  app.post('/', {
    schema: {
      body: createConnectionSchema,
    },
  }, async (request, reply) => {
    const data = request.body as z.infer<typeof createConnectionSchema>;
    const userId = request.user!.id;
    
    // Verify both content items belong to user
    const items = await app.prisma.contentItem.findMany({
      where: { id: { in: [data.sourceContentId, data.targetContentId] }, userId },
    });
    
    if (items.length !== 2) {
      throw AppError.badRequest('One or both content items not found');
    }
    
    if (data.sourceContentId === data.targetContentId) {
      throw AppError.badRequest('Cannot connect content item to itself');
    }
    
    const connection = await app.prisma.connection.create({
      data: {
        userId,
        sourceContentId: data.sourceContentId,
        targetContentId: data.targetContentId,
        type: data.type,
        strength: data.strength,
        description: data.description,
      },
    });
    
    return reply.status(201).send({
      success: true,
      data: connection,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: request.id,
        version: '1.0.0',
      },
    });
  });

  // Auto-generate connections
  app.post('/auto-generate', async (request, reply) => {
    const userId = request.user!.id;
    const { contentItemIds } = request.body as { contentItemIds?: string[] };
    
    let items;
    if (contentItemIds) {
      items = await app.prisma.contentItem.findMany({
        where: { id: { in: contentItemIds }, userId },
        include: { tags: true },
      });
    } else {
      items = await app.prisma.contentItem.findMany({
        where: { userId, status: 'COMPLETED' },
        include: { tags: true },
        take: 100,
      });
    }
    
    const formattedItems = items.map(item => ({
      id: item.id,
      title: item.title,
      summary: item.summary,
      tags: item.tags.map(t => t.name),
    }));
    
    const connections = await findConnections(formattedItems);
    
    // Batch create connections
    const created = await Promise.all(
      connections.map(conn => 
        app.prisma.connection.upsert({
          where: {
            sourceContentId_targetContentId_type: {
              sourceContentId: conn.sourceId,
              targetContentId: conn.targetId,
              type: conn.type as any,
            },
          },
          create: {
            userId,
            sourceContentId: conn.sourceId,
            targetContentId: conn.targetId,
            type: conn.type as any,
            strength: conn.strength,
            description: `Auto-generated: ${conn.type} similarity`,
          },
          update: { strength: conn.strength },
        })
      )
    );
    
    return {
      success: true,
      data: { created: created.length },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: request.id,
        version: '1.0.0',
      },
    };
  });

  // Delete connection
  app.delete('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const userId = request.user!.id;
    
    const connection = await app.prisma.connection.findFirst({ where: { id, userId } });
    if (!connection) {
      throw AppError.notFound('Connection not found');
    }
    
    await app.prisma.connection.delete({ where: { id } });
    
    return {
      success: true,
      data: { message: 'Connection deleted' },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: request.id,
        version: '1.0.0',
      },
    };
  });
}