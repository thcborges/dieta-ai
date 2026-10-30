import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { foodCacheService } from '../services/food-cache.service.js';

const ADMIN_TOKEN = process.env.ADMIN_TOKEN || 'admin-secret-token-key-us-central1';

const customFoodSchema = z.object({
  name: z.string().min(1),
  servingSizeGrams: z.number().positive(),
  caloriesPer100g: z.number().nonnegative(),
  proteinPer100g: z.number().nonnegative(),
  carbsPer100g: z.number().nonnegative(),
  fatPer100g: z.number().nonnegative(),
  fiberPer100g: z.number().nonnegative().optional(),
  barcode: z.string().optional(),
  userId: z.string().optional(),
});

export const foodRoutes: FastifyPluginAsync = async (app) => {
  // Consulta alimento por código de barras
  app.get<{ Params: { barcode: string } }>('/api/v1/foods/barcode/:barcode', async (req, reply) => {
    const { barcode } = req.params;
    const userId = req.headers['x-user-id'] as string | undefined;
    const isAdmin = req.headers['x-admin-token'] === ADMIN_TOKEN;

    const food = await foodCacheService.getByBarcode(barcode, userId, isAdmin);

    if (!food) {
      return reply.status(404).send({
        error: 'PRODUCT_NOT_FOUND',
        message: `Alimento não encontrado para o código de barras ${barcode}. Por favor, cadastre os macronutrientes.`,
        barcode,
      });
    }

    return {
      source: food.source,
      food,
    };
  });

  // Listagem de alimentos no banco de dados / cache (respeita isolamento de alimentos não-validados)
  app.get('/api/v1/foods', async (req) => {
    const userId = req.headers['x-user-id'] as string | undefined;
    const isAdmin = req.headers['x-admin-token'] === ADMIN_TOKEN;

    const foods = foodCacheService.getAllFoods(userId, isAdmin);
    return {
      foods,
      total: foods.length,
    };
  });

  // Busca de alimentos (respeita isolamento de alimentos não-validados por usuário)
  app.get<{ Querystring: { q?: string; include_remote?: string } }>('/api/v1/foods/search', async (req) => {
    const query = req.query.q || '';
    const includeRemote = req.query.include_remote === 'true';
    const userId = req.headers['x-user-id'] as string | undefined;
    const isAdmin = req.headers['x-admin-token'] === ADMIN_TOKEN;

    const result = await foodCacheService.searchFoods(query, userId, isAdmin, includeRemote);
    return {
      source: result.source,
      query,
      foods: result.foods,
      total: result.foods.length,
    };
  });

  // Cadastro de alimento customizado
  app.post('/api/v1/foods/custom', async (req, reply) => {
    const parseResult = customFoodSchema.safeParse(req.body);
    if (!parseResult.success) {
      return reply.status(400).send({
        error: 'INVALID_PAYLOAD',
        issues: parseResult.error.issues,
      });
    }

    const userId = (req.headers['x-user-id'] as string | undefined) || parseResult.data.userId;
    const saved = await foodCacheService.saveCustomFood({
      ...parseResult.data,
      userId,
    });
    return reply.status(201).send(saved);
  });

  // Validação de alimento por administrador do sistema (torna disponível globalmente)
  app.patch<{ Params: { id: string } }>('/api/v1/foods/:id/validate', async (req, reply) => {
    const adminToken = req.headers['x-admin-token'];
    if (adminToken !== ADMIN_TOKEN) {
      return reply.status(403).send({
        error: 'UNAUTHORIZED_ADMIN',
        message: 'Apenas administradores podem validar informações nutricionais de alimentos.',
      });
    }

    const { id } = req.params;
    const food = foodCacheService.validateFood(id);
    if (!food) {
      return reply.status(404).send({
        error: 'FOOD_NOT_FOUND',
        message: `Alimento com ID ${id} não encontrado.`,
      });
    }

    return reply.status(200).send({
      success: true,
      food,
      message: 'Alimento validado com sucesso e disponibilizado publicamente.',
    });
  });
};


