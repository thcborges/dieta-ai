import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { authService } from '../services/auth.service.js';
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

    const blindIndex = authService.getBlindUserId(verified.sub);
    const sessionId = `sess_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const isAdmin = authService.isEmailAdmin(verified.email);

    const sessionToken = authService.createSessionToken({
      sub: verified.sub,
      email: verified.email,
      name: name || verified.name,
      isAdmin,
      blindUserId: blindIndex,
    });

    return reply.status(200).send({
      sessionId,
      sessionToken,
      blindIndex,
      user: {
        id: verified.sub,
        email: verified.email,
        name: name || verified.name,
        googleIdTokenVerified: true,
        isAdmin,
      },
    });
  });

  // Consulta dados e perfil de autorização do usuário logado via Bearer token
  app.get('/api/v1/auth/me', { preHandler: [requireAuth] }, async (req, reply) => {
    return reply.status(200).send({
      user: req.user,
    });
  });
};
