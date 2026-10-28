import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { AppError } from '../utils/errors';

const createWebhookSchema = z.object({
  url: z.string().url(),
  events: z.array(z.enum([
    'CONTENT_CREATED',
    'CONTENT_UPDATED',
    'CONTENT_DELETED',
    'CONTENT_PROCESSED',
    'SUMMARY_CREATED',
    'QUIZ_CREATED',
    'QUIZ_COMPLETED',
    'USER_SUBSCRIPTION_CHANGED',
    'EXPORT_COMPLETED',
  ])).min(1),
  secret: z.string().optional(),
});

export async function webhookRoutes(app: FastifyInstance) {
  // Create webhook
  app.post('/', {
    schema: {
      body: createWebhookSchema,
    },
  }, async (request, reply) => {
    const data = request.body as z.infer<typeof createWebhookSchema>;
    const userId = request.user!.id;
    
    // In production, save to webhook subscriptions table
    // For now, just return success
    return reply.status(201).send({
      success: true,
      data: { message: 'Webhook created', ...data },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: request.id,
        version: '1.0.0',
      },
    });
  });

  // Get webhooks
  app.get('/', async (request, reply) => {
    const userId = request.user!.id;
    
    // In production, fetch from webhook subscriptions table
    return {
      success: true,
      data: [],
      meta: {
        timestamp: new Date().toISOString(),
        requestId: request.id,
        version: '1.0.0',
      },
    };
  });

  // Delete webhook
  app.delete('/:id', async (request, reply) => {
    return {
      success: true,
      data: { message: 'Webhook deleted' },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: request.id,
        version: '1.0.0',
      },
    };
  });

  // Stripe webhook handler
  app.post('/stripe', async (request, reply) => {
    // In production, verify Stripe signature and handle events
    // const sig = request.headers['stripe-signature'];
    // const event = stripe.webhooks.constructEvent(request.body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
    
    return { received: true };
  });
}