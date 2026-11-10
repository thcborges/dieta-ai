import type { FastifyPluginAsync } from 'fastify';
import { firestoreDiaryService } from '../services/firestore-diary.service.js';
import { userGoalsService } from '../services/user-goals.service.js';
import { recipeService } from '../services/recipe.service.js';
import { foodCacheService } from '../services/food-cache.service.js';
import { userRepository } from '../services/user-repository.service.js';
import { requireAuth } from '../middleware/auth.middleware.js';

function getAdminToken(): string | undefined {
  return process.env.ADMIN_TOKEN;
}

export const adminRoutes: FastifyPluginAsync = async (app) => {
  // Exclusão irreversível de conta e dados por administrador
  app.delete<{ Params: { userId: string } }>(
    '/api/v1/admin/users/:userId',
    { preHandler: [requireAuth] },
    async (req, reply) => {
      const isTokenAdmin = Boolean(getAdminToken() && req.headers['x-admin-token'] === getAdminToken());
      const isSessionAdmin = Boolean(req.user?.isAdmin);

      if (!isSessionAdmin && !isTokenAdmin) {
        return reply.status(403).send({
          error: 'UNAUTHORIZED_ADMIN',
          message: 'Acesso negado ao painel de administração.',
        });
      }

      const { userId } = req.params;

      // Remove registros do Firestore permanentemente em conformidade com a LGPD
      const deletedCount = await firestoreDiaryService.purgeUserDiaries(userId);
      await userGoalsService.purgeUserGoals(userId);
      await recipeService.purgeUserRecipes(userId);
      await foodCacheService.purgeUserFoods(userId);
      await userRepository.deleteUser(userId);

      return reply.status(200).send({
        success: true,
        purgedUserId: userId,
        purgedDiariesCount: deletedCount,
        message: `Usuário ${userId} e todos os seus dados biométricos e alimentares foram irreversivelmente eliminados.`,
        purgedAt: new Date().toISOString(),
      });
    }
  );

  // Migração direta de registros no banco de dados para o ID canônico correto
  app.post<{ Body: { targetUserId?: string } }>(
    '/api/v1/admin/migrate-diaries',
    { preHandler: [requireAuth] },
    async (req, reply) => {
      const isTokenAdmin = Boolean(getAdminToken() && req.headers['x-admin-token'] === getAdminToken());
      const isSessionAdmin = Boolean(req.user?.isAdmin);

      if (!isSessionAdmin && !isTokenAdmin) {
        return reply.status(403).send({
          error: 'UNAUTHORIZED_ADMIN',
          message: 'Acesso negado ao painel de administração.',
        });
      }

      const targetUserId = req.body?.targetUserId || req.user?.id || 'usr_thcborges_gmail_com';
      const result = await firestoreDiaryService.migrateDiariesToUser(targetUserId);

      return reply.status(200).send({
        success: true,
        targetUserId,
        targetBlindUserId: firestoreDiaryService.getBlindUserId(targetUserId),
        migratedCount: result.migratedCount,
        totalScanned: result.totalScanned,
        message: `Migração concluída com sucesso no banco de dados. ${result.migratedCount} diários atualizados para o ID canônico.`,
        migratedAt: new Date().toISOString(),
      });
    }
  );
};
