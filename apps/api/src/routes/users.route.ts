import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { validateDeletionRequest } from '@dieta-ai/core';
import { requireAuth } from '../middleware/auth.middleware.js';
import { userGoalsService, type SaveGoalsInput } from '../services/user-goals.service.js';

const goalsSchema = z.object({
  ageYears: z.number().int().min(1, 'Idade deve ser maior que zero').max(120, 'Idade máxima permitida é 120 anos'),
  gender: z.enum(['male', 'female']),
  heightCm: z.number().min(50, 'Altura mínima 50cm').max(260, 'Altura máxima 260cm'),
  weightKg: z.number().min(20, 'Peso mínimo 20kg').max(350, 'Peso máximo 350kg'),
  activityLevel: z.enum(['sedentary', 'light', 'moderate', 'heavy', 'athlete']),
  dailyDeficitKcal: z.number().min(0, 'Déficit não pode ser negativo').max(1500, 'Déficit calórico extremo e perigoso (> 1500 kcal)').optional(),
  customProteinPerKg: z.number().min(1.0).max(4.0).optional(),
  customFatPerKg: z.number().min(0.3).max(2.5).optional(),
  customFiberGrams: z.number().min(0).max(100).optional(),
  goal: z.enum(['weight_loss', 'maintenance', 'muscle_gain', 'weight_gain']).optional(),
  bmrSource: z.enum(['mifflin_st_jeor', 'manual_bioimpedance']).optional(),
  manualBmr: z.number().min(500).max(5000).optional(),
});

export const userRoutes: FastifyPluginAsync = async (app) => {
  // Consulta as metas biométricas do usuário autenticado
  app.get('/api/v1/users/me/goals', { preHandler: [requireAuth] }, async (req, reply) => {
    const userId = req.user!.id;
    const goals = userGoalsService.getGoals(userId);
    return reply.status(200).send({
      success: true,
      goals,
    });
  });

  // Atualiza e calcula as metas biométricas com validação estrita no servidor
  app.put('/api/v1/users/me/goals', { preHandler: [requireAuth] }, async (req, reply) => {
    const userId = req.user!.id;
    const parseResult = goalsSchema.safeParse(req.body);

    if (!parseResult.success) {
      return reply.status(400).send({
        error: 'INVALID_GOALS_PAYLOAD',
        message: 'Parâmetros biométricos inválidos ou fora dos limites seguros de saúde.',
        issues: parseResult.error.issues,
      });
    }

    const savedGoals = userGoalsService.saveGoals(userId, parseResult.data as SaveGoalsInput);
    return reply.status(200).send({
      success: true,
      goals: savedGoals,
    });
  });

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
