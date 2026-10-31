import type { FastifyPluginAsync } from 'fastify';
import { validateDeletionRequest } from '@dieta-ai/core';
import { requireAuth } from '../middleware/auth.middleware.js';

export const userRoutes: FastifyPluginAsync = async (app) => {
  // Solicitação de autoatendimento para exclusão da conta pelo usuário
  app.post('/api/v1/users/me/deletion-request', { preHandler: [requireAuth] }, async (req, reply) => {
    const userId = req.user?.id || (req.headers['x-user-id'] as string) || 'usr_anonymous';
    const userEmail = req.user?.email || (req.headers['x-user-email'] as string) || 'user@example.com';

    const result = validateDeletionRequest({
      userId,
      userEmail,
      requestedAt: new Date(),
    });

    return reply.status(200).send(result);
  });
};
