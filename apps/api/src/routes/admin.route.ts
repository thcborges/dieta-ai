import type { FastifyPluginAsync } from 'fastify';
import { firestoreDiaryService } from '../services/firestore-diary.service.js';

const ADMIN_TOKEN = process.env.ADMIN_TOKEN || 'admin-secret-token-key-us-central1';

export const adminRoutes: FastifyPluginAsync = async (app) => {
  // Exclusão irreversível de conta e dados por administrador
  app.delete<{ Params: { userId: string } }>('/api/v1/admin/users/:userId', async (req, reply) => {
    const adminToken = req.headers['x-admin-token'];

    if (adminToken !== ADMIN_TOKEN) {
      return reply.status(403).send({
        error: 'UNAUTHORIZED_ADMIN',
        message: 'Acesso negado ao painel de administração.',
      });
    }

    const { userId } = req.params;

    // Remove registros do Firestore permanentemente em conformidade com a LGPD
    const deletedCount = await firestoreDiaryService.purgeUserDiaries(userId);

    return reply.status(200).send({
      success: true,
      purgedUserId: userId,
      purgedDiariesCount: deletedCount,
      message: `Usuário ${userId} e todos os seus dados biométricos e alimentares foram irreversivelmente eliminados.`,
      purgedAt: new Date().toISOString(),
    });
  });
};
