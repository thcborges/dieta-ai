import type { FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { diaryService, type MealMap } from '../services/diary.service.js';
import { requireAuth } from '../middleware/auth.middleware.js';

const loggedFoodSchema = z.object({
  id: z.string(),
  foodId: z.string(),
  name: z.string(),
  grams: z.number().nonnegative(),
  calories: z.number().nonnegative(),
  protein: z.number().nonnegative(),
  carbs: z.number().nonnegative(),
  fat: z.number().nonnegative(),
  fiber: z.number().nonnegative().optional().default(0),
});

const updateDiarySchema = z.object({
  meals: z.object({
    breakfast: z.array(loggedFoodSchema),
    lunch: z.array(loggedFoodSchema),
    afternoon_snack: z.array(loggedFoodSchema),
    dinner_event: z.array(loggedFoodSchema),
  }),
});

export const diaryRoutes: FastifyPluginAsync = async (app) => {
  const authenticateDiary = async (req: FastifyRequest, reply: FastifyReply) => {
    const authHeader = req.headers.authorization;
    const legacyUserId = req.headers['x-user-id'] as string | undefined;

    if (!authHeader && !legacyUserId) {
      return reply.status(401).send({
        error: 'USER_AUTHENTICATION_REQUIRED',
        message: 'Acesso negado: Diário vinculado exclusivamente a contas autenticadas.',
      });
    }

    return requireAuth(req, reply);
  };

  // Consulta as refeições do diário pertencentes estritamente ao usuário autenticado
  app.get('/api/v1/diary', { preHandler: [authenticateDiary] }, async (req, reply) => {
    const authUserId = req.user?.id;
    const clientUserId = req.headers['x-user-id'] as string | undefined;

    if (authUserId && clientUserId && clientUserId !== authUserId) {
      return reply.status(403).send({
        error: 'FORBIDDEN',
        message: 'Acesso negado: Tentativa de acesso a dados de outro usuário.',
      });
    }

    const userId = (authUserId || clientUserId)!;
    const cleanUserId = userId.replace(/^Bearer\s+/i, '').trim();
    const meals = diaryService.getDiary(cleanUserId);

    return reply.status(200).send({
      userId: cleanUserId,
      meals,
    });
  });

  // Atualiza/persiste as refeições do diário vinculado à conta do usuário autenticado
  app.put('/api/v1/diary', { preHandler: [authenticateDiary] }, async (req, reply) => {
    const authUserId = req.user?.id;
    const clientUserId = req.headers['x-user-id'] as string | undefined;

    if (authUserId && clientUserId && clientUserId !== authUserId) {
      return reply.status(403).send({
        error: 'FORBIDDEN',
        message: 'Acesso negado: Tentativa de acesso a dados de outro usuário.',
      });
    }

    const userId = (authUserId || clientUserId)!;
    const parseResult = updateDiarySchema.safeParse(req.body);
    if (!parseResult.success) {
      return reply.status(400).send({
        error: 'INVALID_PAYLOAD',
        issues: parseResult.error.issues,
      });
    }

    const cleanUserId = userId.replace(/^Bearer\s+/i, '').trim();
    const savedMeals = diaryService.saveDiary(cleanUserId, parseResult.data.meals as MealMap);

    return reply.status(200).send({
      success: true,
      userId: cleanUserId,
      meals: savedMeals,
    });
  });
};
