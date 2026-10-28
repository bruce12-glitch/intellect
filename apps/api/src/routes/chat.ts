import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { AppError } from '../utils/errors';
import { generateChatResponse } from '../services/ai';

const createConversationSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  model: z.string().optional(),
  provider: z.string().optional(),
  systemPrompt: z.string().optional(),
  contextContentIds: z.array(z.string().uuid()).optional(),
});

const sendMessageSchema = z.object({
  conversationId: z.string().uuid(),
  content: z.string().min(1),
  model: z.string().optional(),
  provider: z.string().optional(),
});

export async function chatRoutes(app: FastifyInstance) {
  // Create conversation
  app.post('/conversations', {
    schema: {
      body: createConversationSchema,
    },
  }, async (request, reply) => {
    const data = request.body as z.infer<typeof createConversationSchema>;
    const userId = request.user!.id;
    
    const user = await app.prisma.user.findUnique({ where: { id: userId } });
    const model = data.model || user?.preferences?.defaultAIModel || 'gpt-4o-mini';
    const provider = data.provider || user?.preferences?.defaultAIProvider || 'openai';
    
    const conversation = await app.prisma.conversation.create({
      data: {
        userId,
        title: data.title || 'New Conversation',
        model,
        provider,
        systemPrompt: data.systemPrompt,
        contextContentIds: data.contextContentIds || [],
      },
    });
    
    return reply.status(201).send({
      success: true,
      data: conversation,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: request.id,
        version: '1.0.0',
      },
    });
  });

  // Get conversations
  app.get('/conversations', async (request, reply) => {
    const userId = request.user!.id;
    
    const conversations = await app.prisma.conversation.findMany({
      where: { userId },
      include: {
        _count: { select: { messages: true } },
        messages: { take: 1, orderBy: { createdAt: 'desc' } },
      },
      orderBy: { updatedAt: 'desc' },
    });
    
    return {
      success: true,
      data: conversations,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: request.id,
        version: '1.0.0',
      },
    };
  });

  // Get conversation with messages
  app.get('/conversations/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const userId = request.user!.id;
    
    const conversation = await app.prisma.conversation.findFirst({
      where: { id, userId },
      include: {
        messages: { orderBy: { createdAt: 'asc' } },
      },
    });
    
    if (!conversation) {
      throw AppError.notFound('Conversation not found');
    }
    
    return {
      success: true,
      data: conversation,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: request.id,
        version: '1.0.0',
      },
    };
  });

  // Send message
  app.post('/messages', {
    schema: {
      body: sendMessageSchema,
    },
  }, async (request, reply) => {
    const data = request.body as z.infer<typeof sendMessageSchema>;
    const userId = request.user!.id;
    
    const conversation = await app.prisma.conversation.findFirst({
      where: { id: data.conversationId, userId },
      include: { messages: { orderBy: { createdAt: 'asc' }, take: 20 } },
    });
    
    if (!conversation) {
      throw AppError.notFound('Conversation not found');
    }
    
    // Save user message
    const userMessage = await app.prisma.chatMessage.create({
      data: {
        conversationId: data.conversationId,
        userId,
        role: 'USER',
        content: data.content,
      },
    });
    
    // Get context content items
    const contextItems = await app.prisma.contentItem.findMany({
      where: { id: { in: conversation.contextContentIds } },
      select: { id: true, title: true, summary: true, rawContent: true },
    });
    
    // Generate AI response
    const context = contextItems.map(item => 
      `Source: ${item.title}\nSummary: ${item.summary || item.rawContent?.slice(0, 2000)}`
    ).join('\n\n---\n\n');
    
    const response = await generateChatResponse({
      message: data.content,
      context,
      history: conversation.messages.map(m => ({ role: m.role.toLowerCase(), content: m.content })),
      model: data.model || conversation.model,
      provider: data.provider || conversation.provider,
      systemPrompt: conversation.systemPrompt,
    });
    
    // Save assistant message
    const assistantMessage = await app.prisma.chatMessage.create({
      data: {
        conversationId: data.conversationId,
        userId,
        role: 'ASSISTANT',
        content: response.content,
        model: response.model,
        provider: response.provider,
        tokensUsed: response.tokensUsed,
        citations: response.citations,
      },
    });
    
    // Update conversation timestamp
    await app.prisma.conversation.update({
      where: { id: data.conversationId },
      data: { updatedAt: new Date() },
    });
    
    return {
      success: true,
      data: {
        userMessage,
        assistantMessage,
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: request.id,
        version: '1.0.0',
      },
    };
  });

  // Delete conversation
  app.delete('/conversations/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const userId = request.user!.id;
    
    const conversation = await app.prisma.conversation.findFirst({ where: { id, userId } });
    if (!conversation) {
      throw AppError.notFound('Conversation not found');
    }
    
    await app.prisma.conversation.delete({ where: { id } });
    
    return {
      success: true,
      data: { message: 'Conversation deleted' },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: request.id,
        version: '1.0.0',
      },
    };
  });
}