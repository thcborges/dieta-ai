import type { FastifyPluginAsync, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { recipeService } from '../services/recipe.service.js';
import { requireAuth } from '../middleware/auth.middleware.js';

const recipeSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1),
  servings: z.number().positive(),
  servingUnitName: z.string().optional(),
  ingredients: z
    .array(
      z.object({
        foodId: z.string().min(1),
        gramsOrUnits: z.number().positive(),
      })
    )
    .min(1),
});

function getUserId(req: FastifyRequest): string | undefined {
  return req.user?.id || (req.headers['x-user-id'] as string | undefined);
}

export const recipeRoutes: FastifyPluginAsync = async (app) => {
  // Listar receitas do usuário
  app.get('/api/v1/recipes', { preHandler: [requireAuth] }, async (req) => {
    const userId = getUserId(req);
    const recipes = await recipeService.getRecipes(userId);
    return {
      recipes,
      total: recipes.length,
    };
  });

  // Obter receita por ID
  app.get<{ Params: { id: string } }>('/api/v1/recipes/:id', { preHandler: [requireAuth] }, async (req, reply) => {
    const { id } = req.params;
    const userId = getUserId(req);
    const recipe = await recipeService.getRecipeById(id, userId);
    if (!recipe) {
      return reply.status(404).send({
        error: 'RECIPE_NOT_FOUND',
        message: 'Receita não encontrada.',
      });
    }
    return recipe;
  });

  // Criar nova receita
  app.post('/api/v1/recipes', { preHandler: [requireAuth] }, async (req, reply) => {
    const parseResult = recipeSchema.safeParse(req.body);
    if (!parseResult.success) {
      return reply.status(400).send({
        error: 'INVALID_PAYLOAD',
        issues: parseResult.error.issues,
      });
    }

    const userId = getUserId(req);
    const saved = await recipeService.createRecipe(parseResult.data, userId);
    return reply.status(201).send(saved);
  });

  // Atualizar receita existente
  app.put<{ Params: { id: string } }>('/api/v1/recipes/:id', { preHandler: [requireAuth] }, async (req, reply) => {
    const { id } = req.params;
    const parseResult = recipeSchema.safeParse(req.body);
    if (!parseResult.success) {
      return reply.status(400).send({
        error: 'INVALID_PAYLOAD',
        issues: parseResult.error.issues,
      });
    }

    const userId = getUserId(req);
    const updated = await recipeService.updateRecipe(id, parseResult.data, userId);
    if (!updated) {
      return reply.status(404).send({
        error: 'RECIPE_NOT_FOUND',
        message: 'Receita não encontrada para atualização.',
      });
    }
    return reply.status(200).send(updated);
  });

  // Excluir receita
  app.delete<{ Params: { id: string } }>('/api/v1/recipes/:id', { preHandler: [requireAuth] }, async (req, reply) => {
    const { id } = req.params;
    const userId = getUserId(req);
    const deleted = await recipeService.deleteRecipe(id, userId);
    if (!deleted) {
      return reply.status(404).send({
        error: 'RECIPE_NOT_FOUND',
        message: 'Receita não encontrada para exclusão.',
      });
    }
    return reply.status(200).send({ success: true, message: 'Receita excluída com sucesso.' });
  });
};
