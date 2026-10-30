import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildApp } from '../src/app.js';
import type { FastifyInstance } from 'fastify';

describe('Recipe Management & Composition API (Módulo 3: Módulo de Receitas)', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp();
  });

  afterAll(async () => {
    await app.close();
  });

  const userId = 'user_recipe_tester_123';
  let createdRecipeId: string;

  it('deve rejeitar criação de receita sem ingredientes ou com payload inválido', async () => {
    const invalidPayload = {
      name: 'Receita Vazia',
      servings: 2,
      ingredients: [],
    };

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/recipes',
      headers: { 'x-user-id': userId },
      payload: invalidPayload,
    });

    expect(res.statusCode).toBe(400);
    const body = res.json();
    expect(body.error).toBe('INVALID_PAYLOAD');
  });

  it('deve criar uma receita composta, calcular macros totais e por porção e sincronizar com o banco de alimentos', async () => {
    const recipePayload = {
      name: 'Bolo de Caneca com Whey e Claras',
      servings: 2,
      servingUnitName: 'porção',
      ingredients: [
        { foodId: 'whey_growth_30g', gramsOrUnits: 30 }, // 30g whey: ~124 kcal, 24g P, 3g C, 1.8g F
        { foodId: 'claras_pasteurizadas', gramsOrUnits: 100 }, // 100g claras: 52 kcal, 11g P, 0.7g C, 0.2g F
      ],
    };

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/recipes',
      headers: { 'x-user-id': userId },
      payload: recipePayload,
    });

    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.id).toBeDefined();
    expect(body.name).toBe('Bolo de Caneca com Whey e Claras');
    expect(body.servings).toBe(2);
    expect(body.totalMacros).toBeDefined();
    expect(body.totalMacros.proteinGrams).toBeCloseTo(35, 1);
    expect(body.perServing.proteinGrams).toBeCloseTo(17.5, 1);
    expect(body.totalWeightGrams).toBe(130);
    expect(body.userId).toBe(userId);

    createdRecipeId = body.id;

    // Deve também estar disponível na busca de alimentos com a tag isRecipe
    const searchRes = await app.inject({
      method: 'GET',
      url: '/api/v1/foods/search?q=Caneca',
      headers: { 'x-user-id': userId },
    });
    expect(searchRes.statusCode).toBe(200);
    const searchBody = searchRes.json();
    expect(searchBody.foods.some((f: { name: string; isRecipe?: boolean }) => f.name.includes('Caneca') && f.isRecipe)).toBe(true);
  });

  it('deve listar as receitas criadas pelo usuário respeitando isolamento de conta', async () => {
    // Busca com o usuário criador
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/recipes',
      headers: { 'x-user-id': userId },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.recipes).toBeDefined();
    expect(body.recipes.length).toBeGreaterThanOrEqual(1);
    expect(body.recipes.some((r: { id: string }) => r.id === createdRecipeId)).toBe(true);

    // Outro usuário não deve ver a receita não validada
    const otherRes = await app.inject({
      method: 'GET',
      url: '/api/v1/recipes',
      headers: { 'x-user-id': 'other_intruder_user_456' },
    });
    expect(otherRes.statusCode).toBe(200);
    const otherBody = otherRes.json();
    expect(otherBody.recipes.some((r: { id: string }) => r.id === createdRecipeId)).toBe(false);
  });

  it('deve obter uma receita pelo ID específico', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/recipes/${createdRecipeId}`,
      headers: { 'x-user-id': userId },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.id).toBe(createdRecipeId);
    expect(body.name).toBe('Bolo de Caneca com Whey e Claras');

    // 404 para receita inexistente
    const notFoundRes = await app.inject({
      method: 'GET',
      url: '/api/v1/recipes/recipe_inexistente_999',
      headers: { 'x-user-id': userId },
    });
    expect(notFoundRes.statusCode).toBe(404);
  });

  it('deve permitir atualizar uma receita existente recalculando seus macros', async () => {
    const updatedPayload = {
      name: 'Bolo de Caneca Duplo com Whey',
      servings: 4,
      servingUnitName: 'fatia',
      ingredients: [
        { foodId: 'whey_growth_30g', gramsOrUnits: 60 }, // 60g whey
        { foodId: 'claras_pasteurizadas', gramsOrUnits: 200 }, // 200g claras
      ],
    };

    const res = await app.inject({
      method: 'PUT',
      url: `/api/v1/recipes/${createdRecipeId}`,
      headers: { 'x-user-id': userId },
      payload: updatedPayload,
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.name).toBe('Bolo de Caneca Duplo com Whey');
    expect(body.servings).toBe(4);
    expect(body.totalMacros.proteinGrams).toBeCloseTo(70, 1);
    expect(body.perServing.proteinGrams).toBeCloseTo(17.5, 1);
    expect(body.totalWeightGrams).toBe(260);

    // Validação com payload inválido em PUT
    const invalidPut = await app.inject({
      method: 'PUT',
      url: `/api/v1/recipes/${createdRecipeId}`,
      headers: { 'x-user-id': userId },
      payload: { name: '', servings: 0, ingredients: [] },
    });
    expect(invalidPut.statusCode).toBe(400);

    // Tentativa de atualizar receita inexistente
    const notFoundPut = await app.inject({
      method: 'PUT',
      url: '/api/v1/recipes/recipe_inexistente_xyz',
      headers: { 'x-user-id': userId },
      payload: updatedPayload,
    });
    expect(notFoundPut.statusCode).toBe(404);
  });

  it('deve permitir excluir uma receita e removê-la da busca de alimentos', async () => {
    // Tentativa de excluir receita inexistente
    const notFoundDelete = await app.inject({
      method: 'DELETE',
      url: '/api/v1/recipes/recipe_inexistente_xyz',
      headers: { 'x-user-id': userId },
    });
    expect(notFoundDelete.statusCode).toBe(404);

    const deleteRes = await app.inject({
      method: 'DELETE',
      url: `/api/v1/recipes/${createdRecipeId}`,
      headers: { 'x-user-id': userId },
    });
    expect(deleteRes.statusCode).toBe(200);

    const checkRes = await app.inject({
      method: 'GET',
      url: `/api/v1/recipes/${createdRecipeId}`,
      headers: { 'x-user-id': userId },
    });
    expect(checkRes.statusCode).toBe(404);
  });
});
