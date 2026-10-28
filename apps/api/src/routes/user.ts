import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { AppError } from '../utils/errors';
import bcrypt from 'bcryptjs';

const updateProfileSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  avatarUrl: z.string().url().optional(),
  preferences: z.object({
    defaultAIModel: z.string().optional(),
    defaultAIProvider: z.string().optional(),
    autoSummarize: z.boolean().optional(),
    autoTag: z.boolean().optional(),
    language: z.string().optional(),
    theme: z.enum(['light', 'dark', 'system']).optional(),
    emailNotifications: z.boolean().optional(),
    quizReminders: z.boolean().optional(),
    spacedRepetitionEnabled: z.boolean().optional(),
  }).optional(),
});

const changePasswordSchema = z.object({
  currentPassword: z.string(),
  newPassword: z.string().min(8).max(128),
});

const createVoiceProfileSchema = z.object({
  name: z.string().min(1).max(100),
  provider: z.enum(['elevenlabs', 'openai', 'local']),
  voiceId: z.string(),
  sampleUrl: z.string().url().optional(),
  isDefault: z.boolean().default(false),
});

export async function userRoutes(app: FastifyInstance) {
  // Get profile
  app.get('/profile', async (request, reply) => {
    const userId = request.user!.id;
    
    const user = await app.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        avatarUrl: true,
        createdAt: true,
        subscriptionTier: true,
        subscriptionExpiresAt: true,
        preferences: true,
      },
    });
    
    if (!user) {
      throw AppError.notFound('User not found');
    }
    
    return {
      success: true,
      data: user,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: request.id,
        version: '1.0.0',
      },
    };
  });

  // Update profile
  app.patch('/profile', {
    schema: {
      body: updateProfileSchema,
    },
  }, async (request, reply) => {
    const data = request.body as z.infer<typeof updateProfileSchema>;
    const userId = request.user!.id;
    
    const user = await app.prisma.user.update({
      where: { id: userId },
      data: {
        name: data.name,
        avatarUrl: data.avatarUrl,
        preferences: data.preferences ? {
          ...data.preferences,
        } : undefined,
      },
      select: {
        id: true,
        email: true,
        name: true,
        avatarUrl: true,
        createdAt: true,
        subscriptionTier: true,
        subscriptionExpiresAt: true,
        preferences: true,
      },
    });
    
    return {
      success: true,
      data: user,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: request.id,
        version: '1.0.0',
      },
    };
  });

  // Change password
  app.post('/change-password', {
    schema: {
      body: changePasswordSchema,
    },
  }, async (request, reply) => {
    const data = request.body as z.infer<typeof changePasswordSchema>;
    const userId = request.user!.id;
    
    const user = await app.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.passwordHash) {
      throw AppError.badRequest('Cannot change password for OAuth accounts');
    }
    
    const isValid = await bcrypt.compare(data.currentPassword, user.passwordHash);
    if (!isValid) {
      throw AppError.unauthorized('Current password is incorrect');
    }
    
    const newPasswordHash = await bcrypt.hash(data.newPassword, 12);
    
    await app.prisma.user.update({
      where: { id: userId },
      data: { passwordHash: newPasswordHash },
    });
    
    return {
      success: true,
      data: { message: 'Password changed successfully' },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: request.id,
        version: '1.0.0',
      },
    };
  });

  // Get voice profiles
  app.get('/voice-profiles', async (request, reply) => {
    const userId = request.user!.id;
    
    const profiles = await app.prisma.voiceProfile.findMany({
      where: { userId },
      orderBy: { isDefault: 'desc' },
    });
    
    return {
      success: true,
      data: profiles,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: request.id,
        version: '1.0.0',
      },
    };
  });

  // Create voice profile
  app.post('/voice-profiles', {
    schema: {
      body: createVoiceProfileSchema,
    },
  }, async (request, reply) => {
    const data = request.body as z.infer<typeof createVoiceProfileSchema>;
    const userId = request.user!.id;
    
    // If this is default, unset other defaults
    if (data.isDefault) {
      await app.prisma.voiceProfile.updateMany({
        where: { userId, isDefault: true },
        data: { isDefault: false },
      });
    }
    
    const profile = await app.prisma.voiceProfile.create({
      data: {
        userId,
        name: data.name,
        provider: data.provider,
        voiceId: data.voiceId,
        sampleUrl: data.sampleUrl,
        isDefault: data.isDefault,
      },
    });
    
    return reply.status(201).send({
      success: true,
      data: profile,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: request.id,
        version: '1.0.0',
      },
    });
  });

  // Update voice profile
  app.patch('/voice-profiles/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const userId = request.user!.id;
    const data = request.body as Partial<z.infer<typeof createVoiceProfileSchema>>;
    
    const profile = await app.prisma.voiceProfile.findFirst({ where: { id, userId } });
    if (!profile) {
      throw AppError.notFound('Voice profile not found');
    }
    
    if (data.isDefault) {
      await app.prisma.voiceProfile.updateMany({
        where: { userId, isDefault: true },
        data: { isDefault: false },
      });
    }
    
    const updated = await app.prisma.voiceProfile.update({
      where: { id },
      data,
    });
    
    return {
      success: true,
      data: updated,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: request.id,
        version: '1.0.0',
      },
    };
  });

  // Delete voice profile
  app.delete('/voice-profiles/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const userId = request.user!.id;
    
    const profile = await app.prisma.voiceProfile.findFirst({ where: { id, userId } });
    if (!profile) {
      throw AppError.notFound('Voice profile not found');
    }
    
    await app.prisma.voiceProfile.delete({ where: { id } });
    
    return {
      success: true,
      data: { message: 'Voice profile deleted' },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: request.id,
        version: '1.0.0',
      },
    };
  });

  // Get usage stats
  app.get('/stats', async (request, reply) => {
    const userId = request.user!.id;
    
    const [contentCount, summaryCount, quizCount, conversationCount, tagsCount] = await Promise.all([
      app.prisma.contentItem.count({ where: { userId } }),
      app.prisma.summary.count({ where: { userId } }),
      app.prisma.quiz.count({ where: { userId } }),
      app.prisma.conversation.count({ where: { userId } }),
      app.prisma.tag.count({ where: { userId } }),
    ]);
    
    return {
      success: true,
      data: {
        contentCount,
        summaryCount,
        quizCount,
        conversationCount,
        tagsCount,
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: request.id,
        version: '1.0.0',
      },
    };
  });
}