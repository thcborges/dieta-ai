import type { FastifyPluginAsync } from 'fastify';
import { firestoreDiaryService } from '../services/firestore-diary.service.js';

function getAdminToken(): string | undefined {
  return process.env.ADMIN_TOKEN;
}

export const adminRoutes: FastifyPluginAsync = async (app) => {
  // Exclusão irreversível de conta e dados por administrador
  app.delete<{ Params: { userId: string } }>('/api/v1/admin/users/:userId', async (req, reply) => {
    const adminToken = req.headers['x-admin-token'];
    const expectedToken = getAdminToken();

    if (!expectedToken || adminToken !== expectedToken) {
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
