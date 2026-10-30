import type { FastifyRequest, FastifyReply } from 'fastify';
import { authService, type AuthenticatedUser } from '../services/auth.service.js';

declare module 'fastify' {
  interface FastifyRequest {
    user?: AuthenticatedUser;
  }
}

export async function requireAuth(req: FastifyRequest, reply: FastifyReply): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return reply.status(401).send({
      error: 'UNAUTHORIZED',
      message: 'Token de autenticação ausente ou inválido.',
    });
  }

  const token = authHeader.replace(/^Bearer\s+/i, '').trim();

  // 1. Tenta validar como Session Token emitido pela API
  const sessionPayload = authService.verifySessionToken(token);
  if (sessionPayload) {
    req.user = {
      id: sessionPayload.sub,
      blindUserId: sessionPayload.blindUserId,
      email: sessionPayload.email,
      name: sessionPayload.name,
      isAdmin: sessionPayload.isAdmin,
    };
    return;
  }

  // 2. Se não for session token, tenta validar como Google ID Token direto
  try {
    const verifiedGoogle = await authService.verifyGoogleIdToken(token);
    const blindUserId = authService.getBlindUserId(verifiedGoogle.sub);
    const isAdmin = authService.isEmailAdmin(verifiedGoogle.email);
    req.user = {
      id: verifiedGoogle.sub,
      blindUserId,
      email: verifiedGoogle.email,
      name: verifiedGoogle.name,
      isAdmin,
    };
    return;
  } catch {
    return reply.status(401).send({
      error: 'UNAUTHORIZED',
      message: 'Token de autenticação inválido ou expirado.',
    });
  }
}
