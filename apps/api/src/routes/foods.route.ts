import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { foodCacheService } from '../services/food-cache.service.js';

const customFoodSchema = z.object({
  name: z.string().min(1),
  servingSizeGrams: z.number().positive(),
  caloriesPer100g: z.number().nonnegative(),
  proteinPer100g: z.number().nonnegative(),
  carbsPer100g: z.number().nonnegative(),
  fatPer100g: z.number().nonnegative(),
  fiberPer100g: z.number().nonnegative().optional(),
  barcode: z.string().optional(),
});

export const foodRoutes: FastifyPluginAsync = async (app) => {
  // Consulta alimento por código de barras
  app.get<{ Params: { barcode: string } }>('/api/v1/foods/barcode/:barcode', async (req, reply) => {
    const { barcode } = req.params;
    const food = await foodCacheService.getByBarcode(barcode);

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

  // Listagem de alimentos no banco de dados / cache
  app.get('/api/v1/foods', async () => {
    const foods = foodCacheService.getAllFoods();
    return {
      foods,
      total: foods.length,
    };
  });

  // Busca de alimentos (Cache/Banco de dados primeiro -> Open Food Facts API -> Salva no banco de dados)
  app.get<{ Querystring: { q?: string } }>('/api/v1/foods/search', async (req) => {
    const query = req.query.q || '';
    const result = await foodCacheService.searchFoods(query);
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

    const saved = await foodCacheService.saveCustomFood(parseResult.data);
    return reply.status(201).send(saved);
  });
};

