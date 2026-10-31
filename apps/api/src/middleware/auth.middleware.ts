import type { FastifyRequest, FastifyReply } from 'fastify';
import { authService, type AuthenticatedUser } from '../services/auth.service.js';

declare module 'fastify' {
  interface FastifyRequest {
    user?: AuthenticatedUser;
  }
}

export async function resolveUserFromRequest(req: FastifyRequest): Promise<AuthenticatedUser | null> {
  const authHeader = req.headers.authorization;
  const legacyUserId = req.headers['x-user-id'] as string | undefined;
  const adminToken = req.headers['x-admin-token'] as string | undefined;

  // 1. Bearer Token (Session JWT ou Google ID Token)
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.replace(/^Bearer\s+/i, '').trim();

    // 1.1 Session Token emitido pela API
    const sessionPayload = authService.verifySessionToken(token);
    if (sessionPayload) {
      return {
        id: sessionPayload.sub,
        blindUserId: sessionPayload.blindUserId,
        email: sessionPayload.email,
        name: sessionPayload.name,
        isAdmin: sessionPayload.isAdmin,
      };
    }

    // 1.2 Google ID Token direto
    try {
      const verifiedGoogle = await authService.verifyGoogleIdToken(token);
      return {
        id: verifiedGoogle.sub,
        blindUserId: authService.getBlindUserId(verifiedGoogle.sub),
        email: verifiedGoogle.email,
        name: verifiedGoogle.name,
        isAdmin: authService.isEmailAdmin(verifiedGoogle.email),
      };
    } catch {
      return null;
    }
  }

  // 2. Token de Admin para compatibilidade com rotas de infraestrutura / CI
  if (adminToken && adminToken.trim() !== '') {
    const isTokenAdmin = Boolean(process.env.ADMIN_TOKEN && adminToken === process.env.ADMIN_TOKEN);
    return {
      id: 'admin_service',
      blindUserId: authService.getBlindUserId('admin_service'),
      email: 'admin@system.local',
      name: 'Admin Service',
      isAdmin: isTokenAdmin,
    };
  }

  // 3. Header x-user-id para compatibilidade de transição com suítes de testes legadas
  if (legacyUserId && legacyUserId.trim() !== '') {
    return {
      id: legacyUserId,
      blindUserId: authService.getBlindUserId(legacyUserId),
      email: `${legacyUserId}@example.com`,
      name: legacyUserId,
      isAdmin: Boolean(authService.isEmailAdmin(`${legacyUserId}@example.com`)),
    };
  }

  return null;
}

export async function requireAuth(req: FastifyRequest, reply: FastifyReply): Promise<void> {
  const user = await resolveUserFromRequest(req);
  if (!user) {
    return reply.status(401).send({
      error: 'UNAUTHORIZED',
      message: 'Token de autenticação ausente ou inválido.',
    });
  }
  req.user = user;
}

export async function optionalAuth(req: FastifyRequest, _reply: FastifyReply): Promise<void> {
  const user = await resolveUserFromRequest(req);
  if (user) {
    req.user = user;
  }
}

