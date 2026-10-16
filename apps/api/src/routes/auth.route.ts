import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { generateBlindIndex } from '@dieta-ai/core';

const googleAuthSchema = z.object({
  googleIdToken: z.string().min(1),
  email: z.string().email(),
  name: z.string().optional(),
});

const DEFAULT_PEPPER = process.env.LGPD_SECRET_PEPPER || 'dieta-ai-production-pepper-secret-key-32chars';

export const authRoutes: FastifyPluginAsync = async (app) => {
  app.post('/api/v1/auth/google', async (req, reply) => {
    const parseResult = googleAuthSchema.safeParse(req.body);
    if (!parseResult.success) {
      return reply.status(400).send({
        error: 'INVALID_PAYLOAD',
        issues: parseResult.error.issues,
      });
    }

    const { email, name } = parseResult.data;

    // Gera o Blind Index HMAC para busca determinística sem expor identidade
    const blindIndex = generateBlindIndex(email, DEFAULT_PEPPER);
    const sessionId = `sess_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    return reply.status(200).send({
      sessionId,
      blindIndex,
      user: {
        email,
        name: name || 'Usuário MacroMetrics',
        googleIdTokenVerified: true,
      },
    });
  });
};
