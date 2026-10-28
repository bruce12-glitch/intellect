import { FastifyInstance } from 'fastify';

export function generateTokens(
  app: FastifyInstance,
  userId: string,
  email: string,
  subscriptionTier: string
) {
  const accessToken = app.jwt.sign(
    { id: userId, email, subscriptionTier },
    { expiresIn: '7d' }
  );
  
  const refreshToken = app.jwt.sign(
    { id: userId, type: 'refresh' },
    { expiresIn: '30d' }
  );
  
  return { accessToken, refreshToken };
}

export function verifyRefreshToken(app: FastifyInstance, token: string) {
  try {
    const decoded = app.jwt.verify(token);
    if (decoded.type !== 'refresh') {
      return null;
    }
    return decoded as { id: string; type: string };
  } catch {
    return null;
  }
}

export function extractTokenFromHeader(authHeader: string | undefined): string | null {
  if (!authHeader) return null;
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') return null;
  return parts[1];
}