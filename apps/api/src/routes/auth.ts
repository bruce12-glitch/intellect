import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { AppError } from '../utils/errors';
import { generateTokens, verifyRefreshToken } from '../utils/auth';

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
  name: z.string().min(1).max(100).optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

const refreshSchema = z.object({
  refreshToken: z.string().optional(),
});

export async function authRoutes(app: FastifyInstance) {
  // Register
  app.post('/register', {
    schema: {
      body: registerSchema,
      response: {
        201: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                user: { type: 'object' },
                accessToken: { type: 'string' },
                refreshToken: { type: 'string' },
              },
            },
          },
        },
      },
    },
  }, async (request, reply) => {
    const { email, password, name } = request.body as z.infer<typeof registerSchema>;
    
    // Check if user exists
    const existingUser = await app.prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      throw AppError.conflict('User with this email already exists');
    }
    
    // Hash password
    const passwordHash = await bcrypt.hash(password, 12);
    
    // Create user
    const user = await app.prisma.user.create({
      data: {
        email,
        passwordHash,
        name,
        preferences: {
          defaultAIModel: 'gpt-4o-mini',
          defaultAIProvider: 'openai',
          autoSummarize: true,
          autoTag: true,
          language: 'en',
          theme: 'system',
          emailNotifications: true,
          quizReminders: true,
          spacedRepetitionEnabled: true,
        },
      },
      select: {
        id: true,
        email: true,
        name: true,
        avatarUrl: true,
        createdAt: true,
        subscriptionTier: true,
        preferences: true,
      },
    });
    
    // Generate tokens
    const { accessToken, refreshToken } = generateTokens(app, user.id, user.email, user.subscriptionTier);
    
    // Set cookies
    setAuthCookies(reply, accessToken, refreshToken);
    
    return reply.status(201).send({
      success: true,
      data: {
        user,
        accessToken,
        refreshToken,
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: request.id,
        version: '1.0.0',
      },
    });
  });

  // Login
  app.post('/login', {
    schema: {
      body: loginSchema,
    },
  }, async (request, reply) => {
    const { email, password } = request.body as z.infer<typeof loginSchema>;
    
    const user = await app.prisma.user.findUnique({ where: { email } });
    if (!user || !user.passwordHash) {
      throw AppError.unauthorized('Invalid credentials');
    }
    
    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      throw AppError.unauthorized('Invalid credentials');
    }
    
    const { accessToken, refreshToken } = generateTokens(app, user.id, user.email, user.subscriptionTier);
    
    setAuthCookies(reply, accessToken, refreshToken);
    
    return {
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          avatarUrl: user.avatarUrl,
          createdAt: user.createdAt,
          subscriptionTier: user.subscriptionTier,
          preferences: user.preferences,
        },
        accessToken,
        refreshToken,
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: request.id,
        version: '1.0.0',
      },
    };
  });

  // Refresh token
  app.post('/refresh', {
    schema: {
      body: refreshSchema,
    },
  }, async (request, reply) => {
    const refreshToken = request.body?.refreshToken || request.cookies.refreshToken;
    
    if (!refreshToken) {
      throw AppError.unauthorized('Refresh token required');
    }
    
    const decoded = verifyRefreshToken(app, refreshToken);
    if (!decoded) {
      throw AppError.unauthorized('Invalid refresh token');
    }
    
    const user = await app.prisma.user.findUnique({ where: { id: decoded.id } });
    if (!user) {
      throw AppError.unauthorized('User not found');
    }
    
    const { accessToken: newAccessToken, refreshToken: newRefreshToken } = 
      generateTokens(app, user.id, user.email, user.subscriptionTier);
    
    setAuthCookies(reply, newAccessToken, newRefreshToken);
    
    return {
      success: true,
      data: {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: request.id,
        version: '1.0.0',
      },
    };
  });

  // Logout
  app.post('/logout', async (request, reply) => {
    reply.clearCookie('accessToken');
    reply.clearCookie('refreshToken');
    
    return {
      success: true,
      data: { message: 'Logged out successfully' },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: request.id,
        version: '1.0.0',
      },
    };
  });

  // Get current user
  app.get('/me', async (request, reply) => {
    if (!request.user) {
      throw AppError.unauthorized();
    }
    
    const user = await app.prisma.user.findUnique({
      where: { id: request.user.id },
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
      data: { user },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: request.id,
        version: '1.0.0',
      },
    };
  });
}

function setAuthCookies(reply: FastifyInstance['reply'], accessToken: string, refreshToken: string) {
  const isProduction = process.env.NODE_ENV === 'production';
  
  reply.setCookie('accessToken', accessToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60, // 7 days
    path: '/',
  });
  
  reply.setCookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    maxAge: 30 * 24 * 60 * 60, // 30 days
    path: '/',
  });
}