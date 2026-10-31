import type { FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { auditDailyIntake } from '@dieta-ai/core';
import {
  firestoreDiaryService,
  type MealWindow,
  type MealMap,
} from '../services/firestore-diary.service.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import {
  recalculateMealItem,
  recalculateMealMap,
  type RawMealItemInput,
} from '../services/macro-recalculation.service.js';
import { userGoalsService } from '../services/user-goals.service.js';

const loggedFoodSchema = z.object({
  id: z.string().min(1).optional(),
  foodId: z.string().min(1),
  name: z.string().min(1).optional(),
  grams: z.number().positive(),
  calories: z.number().nonnegative().optional(),
  protein: z.number().nonnegative().optional(),
  carbs: z.number().nonnegative().optional(),
  fat: z.number().nonnegative().optional(),
  fiber: z.number().nonnegative().optional().default(0),
});

const mealsSchema = z.object({
  meals: z.object({
    breakfast: z.array(loggedFoodSchema).optional().default([]),
    lunch: z.array(loggedFoodSchema).optional().default([]),
    afternoon_snack: z.array(loggedFoodSchema).optional().default([]),
    dinner_event: z.array(loggedFoodSchema).optional().default([]),
  }),
});

const VALID_WINDOWS: MealWindow[] = ['breakfast', 'lunch', 'afternoon_snack', 'dinner_event'];

function isValidDate(dateStr: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return false;
  const d = new Date(dateStr);
  return !isNaN(d.getTime());
}

function checkUserAccess(req: FastifyRequest, reply: FastifyReply): string | null {
  const authUserId = req.user?.id;
  const clientUserId = req.headers['x-user-id'] as string | undefined;

  if (authUserId && clientUserId && clientUserId !== authUserId) {
    reply.status(403).send({
      error: 'FORBIDDEN',
      message: 'Acesso negado: Tentativa de acesso a dados de outro usuário.',
    });
    return null;
  }

  const effectiveUserId = authUserId || clientUserId;
  if (!effectiveUserId) {
    reply.status(401).send({
      error: 'UNAUTHORIZED',
      message: 'Autenticação necessária para acessar o diário alimentar.',
    });
    return null;
  }

  return effectiveUserId;
}

export const diaryRoutes: FastifyPluginAsync = async (app) => {
  // Consulta o diário de refeições de uma data específica
  app.get<{ Params: { date: string } }>('/api/v1/diaries/:date', { preHandler: [requireAuth] }, async (req, reply) => {
    const userId = checkUserAccess(req, reply);
    if (!userId) return;

    const { date } = req.params;
    if (!isValidDate(date)) {
      return reply.status(400).send({
        error: 'INVALID_DATE_FORMAT',
        message: 'A data deve estar no formato YYYY-MM-DD.',
      });
    }

    const diary = await firestoreDiaryService.getDiary(userId, date);
    const goals = userGoalsService.getGoals(userId);
    const auditReport = auditDailyIntake({
      weightKg: goals.weightKg,
      plannedDailyDeficitKcal: goals.dailyDeficitKcal,
      targetCalories: goals.calories,
      targetProteinGrams: goals.proteinGrams,
      currentCalories: diary.totals.calories,
      currentProteinGrams: diary.totals.protein,
    });

    return reply.status(200).send({
      ...diary,
      goals,
      auditReport,
    });
  });

  // Salva / Atualiza o diário completo de uma data no Firestore
  app.put<{ Params: { date: string } }>('/api/v1/diaries/:date', { preHandler: [requireAuth] }, async (req, reply) => {
    const userId = checkUserAccess(req, reply);
    if (!userId) return;

    const { date } = req.params;
    if (!isValidDate(date)) {
      return reply.status(400).send({
        error: 'INVALID_DATE_FORMAT',
        message: 'A data deve estar no formato YYYY-MM-DD.',
      });
    }

    const parseResult = mealsSchema.safeParse(req.body);
    if (!parseResult.success) {
      return reply.status(400).send({
        error: 'INVALID_PAYLOAD',
        issues: parseResult.error.issues,
      });
    }

    const recalculatedMeals = recalculateMealMap(
      parseResult.data.meals as Record<string, RawMealItemInput[]>,
      userId
    );

    const saved = await firestoreDiaryService.saveDiary(
      userId,
      date,
      recalculatedMeals
    );

    const goals = userGoalsService.getGoals(userId);
    const auditReport = auditDailyIntake({
      weightKg: goals.weightKg,
      plannedDailyDeficitKcal: goals.dailyDeficitKcal,
      targetCalories: goals.calories,
      targetProteinGrams: goals.proteinGrams,
      currentCalories: saved.totals.calories,
      currentProteinGrams: saved.totals.protein,
    });

    return reply.status(200).send({
      success: true,
      ...saved,
      goals,
      auditReport,
    });
  });

  // Adiciona um alimento diretamente a uma janela de refeição
  app.post<{ Params: { date: string; window: string } }>(
    '/api/v1/diaries/:date/meals/:window',
    { preHandler: [requireAuth] },
    async (req, reply) => {
      const userId = checkUserAccess(req, reply);
      if (!userId) return;

      const { date, window } = req.params;
      if (!isValidDate(date)) {
        return reply.status(400).send({
          error: 'INVALID_DATE_FORMAT',
          message: 'A data deve estar no formato YYYY-MM-DD.',
        });
      }

      if (!VALID_WINDOWS.includes(window as MealWindow)) {
        return reply.status(400).send({
          error: 'INVALID_WINDOW',
          message: `Janela de refeição inválida. Permitidas: ${VALID_WINDOWS.join(', ')}`,
        });
      }

      const parseResult = loggedFoodSchema.safeParse(req.body);
      if (!parseResult.success) {
        return reply.status(400).send({
          error: 'INVALID_PAYLOAD',
          issues: parseResult.error.issues,
        });
      }

      const recalculatedItem = recalculateMealItem(
        parseResult.data as RawMealItemInput,
        userId
      );

      const updated = await firestoreDiaryService.addFoodToMeal(
        userId,
        date,
        window as MealWindow,
        recalculatedItem
      );

      return reply.status(200).send(updated);
    }
  );

  // Remove um alimento específico do diário no Firestore
  app.delete<{ Params: { date: string; window: string; itemId: string } }>(
    '/api/v1/diaries/:date/meals/:window/:itemId',
    { preHandler: [requireAuth] },
    async (req, reply) => {
      const userId = checkUserAccess(req, reply);
      if (!userId) return;

      const { date, window, itemId } = req.params;
      if (!isValidDate(date)) {
        return reply.status(400).send({
          error: 'INVALID_DATE_FORMAT',
          message: 'A data deve estar no formato YYYY-MM-DD.',
        });
      }

      if (!VALID_WINDOWS.includes(window as MealWindow)) {
        return reply.status(400).send({
          error: 'INVALID_WINDOW',
          message: `Janela de refeição inválida. Permitidas: ${VALID_WINDOWS.join(', ')}`,
        });
      }

      const updated = await firestoreDiaryService.removeFoodFromMeal(
        userId,
        date,
        window as MealWindow,
        itemId
      );

      return reply.status(200).send(updated);
    }
  );
};
