import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { AppError } from '../utils/errors';

const exportSchema = z.object({
  format: z.enum(['markdown', 'json', 'csv', 'pdf']).default('markdown'),
  includeContent: z.boolean().default(true),
  includeSummaries: z.boolean().default(true),
  includeQuizzes: z.boolean().default(false),
  includeTags: z.boolean().default(true),
  includeConnections: z.boolean().default(false),
  dateRange: z.object({
    start: z.string().datetime(),
    end: z.string().datetime(),
  }).optional(),
  tags: z.array(z.string()).optional(),
  sourceTypes: z.array(z.string()).optional(),
});

export async function exportRoutes(app: FastifyInstance) {
  // Create export job
  app.post('/', {
    schema: {
      body: exportSchema,
    },
  }, async (request, reply) => {
    const data = request.body as z.infer<typeof exportSchema>;
    const userId = request.user!.id;
    
    const exportJob = await app.prisma.exportJob.create({
      data: {
        userId,
        format: data.format.toUpperCase() as any,
        status: 'PENDING',
      },
    });
    
    // Queue export job
    await app.redis.lpush('export-queue', JSON.stringify({ exportId: exportJob.id, options: data }));
    
    return reply.status(201).send({
      success: true,
      data: exportJob,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: request.id,
        version: '1.0.0',
      },
    });
  });

  // Get exports
  app.get('/', async (request, reply) => {
    const userId = request.user!.id;
    
    const exports = await app.prisma.exportJob.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
    
    return {
      success: true,
      data: exports,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: request.id,
        version: '1.0.0',
      },
    };
  });

  // Get export
  app.get('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const userId = request.user!.id;
    
    const exportJob = await app.prisma.exportJob.findFirst({ where: { id, userId } });
    if (!exportJob) {
      throw AppError.notFound('Export job not found');
    }
    
    return {
      success: true,
      data: exportJob,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: request.id,
        version: '1.0.0',
      },
    };
  });

  // Download export
  app.get('/:id/download', async (request, reply) => {
    const { id } = request.params as { id: string };
    const userId = request.user!.id;
    
    const exportJob = await app.prisma.exportJob.findFirst({ where: { id, userId } });
    if (!exportJob) {
      throw AppError.notFound('Export job not found');
    }
    
    if (exportJob.status !== 'COMPLETED' || !exportJob.downloadUrl) {
      throw AppError.badRequest('Export not ready for download');
    }
    
    // In production, redirect to signed URL or stream from storage
    return reply.redirect(exportJob.downloadUrl);
  });
}

const importSchema = z.object({
  format: z.enum(['markdown', 'json', 'opml', 'csv']).default('json'),
});

export async function importRoutes(app: FastifyInstance) {
  // Create import job
  app.post('/', {
    schema: {
      body: importSchema,
    },
  }, async (request, reply) => {
    const data = request.body as z.infer<typeof importSchema>;
    const userId = request.user!.id;
    
    // Handle file upload
    const file = await request.file();
    if (!file) {
      throw AppError.badRequest('No file uploaded');
    }
    
    const importJob = await app.prisma.importJob.create({
      data: {
        userId,
        format: data.format.toUpperCase() as any,
        status: 'PENDING',
      },
    });
    
    // Save file temporarily and queue import
    // In production, upload to S3 and process async
    
    return reply.status(201).send({
      success: true,
      data: importJob,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: request.id,
        version: '1.0.0',
      },
    });
  });

  // Get imports
  app.get('/', async (request, reply) => {
    const userId = request.user!.id;
    
    const imports = await app.prisma.importJob.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
    
    return {
      success: true,
      data: imports,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: request.id,
        version: '1.0.0',
      },
    };
  });
}