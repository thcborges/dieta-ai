import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { diaryService, type MealMap } from '../services/diary.service.js';

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
  // Consulta as refeições do diário pertencentes estritamente ao usuário autenticado
  app.get('/api/v1/diary', async (req, reply) => {
    const userId = (req.headers['x-user-id'] as string) || (req.headers['authorization'] as string);
    if (!userId || userId.trim() === '') {
      return reply.status(401).send({
        error: 'USER_AUTHENTICATION_REQUIRED',
        message: 'Acesso negado: Diário vinculado exclusivamente a contas autenticadas.',
      });
    }

    const cleanUserId = userId.replace(/^Bearer\s+/i, '').trim();
    const meals = diaryService.getDiary(cleanUserId);

    return reply.status(200).send({
      userId: cleanUserId,
      meals,
    });
  });

  // Atualiza/persiste as refeições do diário vinculado à conta do usuário autenticado
  app.put('/api/v1/diary', async (req, reply) => {
    const userId = (req.headers['x-user-id'] as string) || (req.headers['authorization'] as string);
    if (!userId || userId.trim() === '') {
      return reply.status(401).send({
        error: 'USER_AUTHENTICATION_REQUIRED',
        message: 'Acesso negado: Diário vinculado exclusivamente a contas autenticadas.',
      });
    }

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
