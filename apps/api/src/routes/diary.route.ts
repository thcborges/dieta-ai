import type { FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { auditDailyIntake } from '@dieta-ai/core';
import { diaryService, type MealMap } from '../services/diary.service.js';
import { calculateDiaryTotals } from '../services/firestore-diary.service.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import {
  recalculateMealMap,
  type RawMealItemInput,
} from '../services/macro-recalculation.service.js';
import { userGoalsService } from '../services/user-goals.service.js';

const loggedFoodSchema = z.object({
  id: z.string().optional(),
  foodId: z.string().min(1),
  name: z.string().optional(),
  grams: z.number().nonnegative(),
  calories: z.number().nonnegative().optional(),
  protein: z.number().nonnegative().optional(),
  carbs: z.number().nonnegative().optional(),
  fat: z.number().nonnegative().optional(),
  fiber: z.number().nonnegative().optional().default(0),
});

const updateDiarySchema = z.object({
  meals: z.object({
    breakfast: z.array(loggedFoodSchema).optional().default([]),
    lunch: z.array(loggedFoodSchema).optional().default([]),
    afternoon_snack: z.array(loggedFoodSchema).optional().default([]),
    dinner_event: z.array(loggedFoodSchema).optional().default([]),
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
    const totals = calculateDiaryTotals(meals);
    const goals = userGoalsService.getGoals(cleanUserId);
    const auditReport = auditDailyIntake({
      weightKg: goals.weightKg,
      plannedDailyDeficitKcal: goals.dailyDeficitKcal,
      targetCalories: goals.calories,
      targetProteinGrams: goals.proteinGrams,
      currentCalories: totals.calories,
      currentProteinGrams: totals.protein,
    });

    return reply.status(200).send({
      userId: cleanUserId,
      meals,
      totals,
      goals,
      auditReport,
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
    const recalculatedMeals = recalculateMealMap(
      parseResult.data.meals as Record<string, RawMealItemInput[]>,
      cleanUserId
    );
    const savedMeals = diaryService.saveDiary(cleanUserId, recalculatedMeals);
    const totals = calculateDiaryTotals(savedMeals);
    const goals = userGoalsService.getGoals(cleanUserId);
    const auditReport = auditDailyIntake({
      weightKg: goals.weightKg,
      plannedDailyDeficitKcal: goals.dailyDeficitKcal,
      targetCalories: goals.calories,
      targetProteinGrams: goals.proteinGrams,
      currentCalories: totals.calories,
      currentProteinGrams: totals.protein,
    });

    return reply.status(200).send({
      success: true,
      userId: cleanUserId,
      meals: savedMeals,
      totals,
      goals,
      auditReport,
    });
  });
};
