import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { canonicalizeUserId } from '@dieta-ai/core';
import { authService } from '../services/auth.service.js';
import { userRepository } from '../services/user-repository.service.js';
import { requireAuth } from '../middleware/auth.middleware.js';

const googleAuthSchema = z.object({
  googleIdToken: z.string().min(1),
  email: z.string().email(),
  name: z.string().optional(),
});

export const authRoutes: FastifyPluginAsync = async (app) => {
  // Autenticação com Google ID Token e emissão de Session JWT criptografado
  app.post('/api/v1/auth/google', async (req, reply) => {
    const parseResult = googleAuthSchema.safeParse(req.body);
    if (!parseResult.success) {
      return reply.status(400).send({
        error: 'INVALID_PAYLOAD',
        issues: parseResult.error.issues,
      });
    }

    const { googleIdToken, email, name } = parseResult.data;

    let verified;
    try {
      verified = await authService.verifyGoogleIdToken(googleIdToken, email);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Falha na verificação';
      return reply.status(401).send({
        error: 'INVALID_GOOGLE_TOKEN',
        message,
      });
    }

    const canonicalId = canonicalizeUserId(verified.email);
    const blindIndex = authService.getBlindUserId(canonicalId);
    const sessionId = `sess_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const isAdmin = authService.isEmailAdmin(verified.email);

    // Persiste e atualiza as informações do usuário na collection 'users' do Firestore
    const userDoc = await userRepository.upsertUser({
      id: canonicalId,
      email: verified.email,
      name: name || verified.name,
      picture: verified.picture,
      googleSub: verified.sub,
      blindUserId: blindIndex,
      isAdmin,
      rawGooglePayload: verified.rawPayload,
    });

    const sessionToken = authService.createSessionToken({
      sub: userDoc.id,
      email: userDoc.email,
      name: userDoc.name,
      isAdmin: userDoc.isAdmin,
      blindUserId: userDoc.blindUserId,
    });

    return reply.status(200).send({
      sessionId,
      sessionToken,
      blindIndex: userDoc.blindUserId,
      user: {
        id: userDoc.id,
        blindUserId: userDoc.blindUserId,
        email: userDoc.email,
        name: userDoc.name,
        picture: userDoc.picture,
        googleIdTokenVerified: true,
        isAdmin: userDoc.isAdmin,
        createdAt: userDoc.createdAt,
        updatedAt: userDoc.updatedAt,
        lastLoginAt: userDoc.lastLoginAt,
      },
    });
  });

  // Consulta dados e perfil de autorização do usuário logado via Bearer token
  app.get('/api/v1/auth/me', { preHandler: [requireAuth] }, async (req, reply) => {
    const storedUser = req.user?.id ? await userRepository.getUserById(req.user.id) : null;
    return reply.status(200).send({
      user: storedUser || req.user,
    });
  });
};
