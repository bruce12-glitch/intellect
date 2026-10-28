import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { AppError } from '../utils/errors';
import { generateSummary, generateAudioSummary } from '../services/ai';

const generateSummarySchema = z.object({
  contentItemId: z.string().uuid(),
  model: z.enum(['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'claude-3-5-sonnet', 'claude-3-opus', 'claude-3-haiku', 'gemini-1.5-pro', 'gemini-1.5-flash']).optional(),
  provider: z.enum(['openai', 'anthropic', 'google']).optional(),
  customPrompt: z.string().optional(),
});

const generateAudioSchema = z.object({
  summaryId: z.string().uuid(),
  voiceProfileId: z.string().uuid().optional(),
});

export async function summaryRoutes(app: FastifyInstance) {
  // Get summaries for content item
  app.get('/content/:contentItemId', async (request, reply) => {
    const { contentItemId } = request.params as { contentItemId: string };
    const userId = request.user!.id;
    
    const contentItem = await app.prisma.contentItem.findFirst({
      where: { id: contentItemId, userId },
    });
    
    if (!contentItem) {
      throw AppError.notFound('Content item not found');
    }
    
    const summaries = await app.prisma.summary.findMany({
      where: { contentItemId, userId },
      include: { audioSummaries: true },
      orderBy: { createdAt: 'desc' },
    });
    
    return {
      success: true,
      data: summaries,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: request.id,
        version: '1.0.0',
      },
    };
  });

  // Generate summary
  app.post('/', {
    schema: {
      body: generateSummarySchema,
    },
  }, async (request, reply) => {
    const data = request.body as z.infer<typeof generateSummarySchema>;
    const userId = request.user!.id;
    
    const contentItem = await app.prisma.contentItem.findFirst({
      where: { id: data.contentItemId, userId },
    });
    
    if (!contentItem) {
      throw AppError.notFound('Content item not found');
    }
    
    if (!contentItem.rawContent) {
      throw AppError.badRequest('No content to summarize');
    }
    
    // Get user preferences for model
    const user = await app.prisma.user.findUnique({ where: { id: userId } });
    const model = data.model || user?.preferences?.defaultAIModel || 'gpt-4o-mini';
    const provider = data.provider || user?.preferences?.defaultAIProvider || 'openai';
    
    // Generate summary
    const result = await generateSummary({
      content: contentItem.rawContent,
      title: contentItem.title,
      sourceType: contentItem.sourceType,
      model,
      provider,
      customPrompt: data.customPrompt,
    });
    
    const summary = await app.prisma.summary.create({
      data: {
        contentItemId: data.contentItemId,
        userId,
        text: result.summary,
        keyPoints: result.keyPoints,
        model,
        provider,
        tokensUsed: result.tokensUsed,
      },
    });
    
    // Update content item with summary
    await app.prisma.contentItem.update({
      where: { id: data.contentItemId },
      data: {
        summary: result.summary,
        keyPoints: result.keyPoints,
        status: 'COMPLETED',
        processedAt: new Date(),
      },
    });
    
    return reply.status(201).send({
      success: true,
      data: summary,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: request.id,
        version: '1.0.0',
      },
    });
  });

  // Generate audio summary
  app.post('/audio', {
    schema: {
      body: generateAudioSchema,
    },
  }, async (request, reply) => {
    const data = request.body as z.infer<typeof generateAudioSchema>;
    const userId = request.user!.id;
    
    const summary = await app.prisma.summary.findFirst({
      where: { id: data.summaryId, userId },
      include: { contentItem: true },
    });
    
    if (!summary) {
      throw AppError.notFound('Summary not found');
    }
    
    // Get voice profile
    let voiceProfile = null;
    if (data.voiceProfileId) {
      voiceProfile = await app.prisma.voiceProfile.findFirst({
        where: { id: data.voiceProfileId, userId },
      });
    } else {
      voiceProfile = await app.prisma.voiceProfile.findFirst({
        where: { userId, isDefault: true },
      });
    }
    
    if (!voiceProfile) {
      throw AppError.badRequest('No voice profile available');
    }
    
    // Generate audio
    const audioUrl = await generateAudioSummary({
      text: summary.text,
      voiceProfile,
    });
    
    const audioSummary = await app.prisma.audioSummary.create({
      data: {
        summaryId: data.summaryId,
        voiceProfileId: voiceProfile.id,
        audioUrl,
        duration: 0, // Will be updated after generation
        status: 'COMPLETED',
      },
    });
    
    return {
      success: true,
      data: audioSummary,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: request.id,
        version: '1.0.0',
      },
    };
  });

  // Delete summary
  app.delete('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const userId = request.user!.id;
    
    const summary = await app.prisma.summary.findFirst({ where: { id, userId } });
    if (!summary) {
      throw AppError.notFound('Summary not found');
    }
    
    await app.prisma.summary.delete({ where: { id } });
    
    return {
      success: true,
      data: { message: 'Summary deleted' },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: request.id,
        version: '1.0.0',
      },
    };
  });
}