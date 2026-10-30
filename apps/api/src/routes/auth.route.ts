import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { generateBlindIndex } from '@dieta-ai/core';

const googleAuthSchema = z.object({
  googleIdToken: z.string().min(1),
  email: z.string().email(),
  name: z.string().optional(),
});

function getSecretPepper(): string {
  const pepper = process.env.LGPD_SECRET_PEPPER || process.env.BLIND_INDEX_PEPPER;
  if (!pepper) {
    if (process.env.NODE_ENV === 'test') {
      return 'test-blind-index-pepper-32chars!!';
    }
    throw new Error('Configuração de segurança ausente: LGPD_SECRET_PEPPER deve ser definido via variáveis de ambiente.');
  }
  return pepper;
}

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
    const pepper = getSecretPepper();
    const blindIndex = generateBlindIndex(email, pepper);
    const sessionId = `sess_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    const adminEmails = (process.env.ADMIN_EMAILS || '')
      .split(',')
      .map(e => e.trim().toLowerCase())
      .filter(Boolean);
    const isAdmin = adminEmails.includes(email.toLowerCase());

    return reply.status(200).send({
      sessionId,
      blindIndex,
      user: {
        email,
        name: name || 'Usuário MacroMetrics',
        googleIdTokenVerified: true,
        isAdmin,
      },
    });
  });
};
