import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildApp } from '../src/app.js';
import { authService } from '../src/services/auth.service.js';
import type { FastifyInstance } from 'fastify';

describe('Etapa 3: Controle de Acesso e Isolamento por Usuário (Policies Mínimas)', () => {
  let app: FastifyInstance;

  // Usuário A (Comum)
  const tokenUserA = authService.createSessionToken({
    sub: 'usr_alice_regular',
    email: 'alice@example.com',
    name: 'Alice Silva',
    isAdmin: false,
    blindUserId: authService.getBlindUserId('usr_alice_regular'),
  });

  // Usuário B (Comum)
  const tokenUserB = authService.createSessionToken({
    sub: 'usr_bob_regular',
    email: 'bob@example.com',
    name: 'Bob Santos',
    isAdmin: false,
    blindUserId: authService.getBlindUserId('usr_bob_regular'),
  });

  // Usuário Admin
  const tokenAdmin = authService.createSessionToken({
    sub: 'usr_admin_master',
    email: 'thcborges@example.com',
    name: 'Admin Master',
    isAdmin: true,
    blindUserId: authService.getBlindUserId('usr_admin_master'),
  });

  beforeAll(async () => {
    app = await buildApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('deve impedir que Alice leia o diário de Bob forçando x-user-id diferente do token autenticado (403 FORBIDDEN)', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/diaries/2026-10-30',
      headers: {
        authorization: `Bearer ${tokenUserA}`,
        'x-user-id': 'usr_bob_regular', // Alice tentando personificar Bob
      },
    });

    expect(response.statusCode).toBe(403);
    const body = response.json();
    expect(body.error).toBe('FORBIDDEN');
    expect(body.message).toContain('outro usuário');
  });

  it('deve impedir que Alice grave refeições no diário de Bob (403 FORBIDDEN)', async () => {
    const response = await app.inject({
      method: 'PUT',
      url: '/api/v1/diaries/2026-10-30',
      headers: {
        authorization: `Bearer ${tokenUserA}`,
        'x-user-id': 'usr_bob_regular',
      },
      payload: {
        meals: {
          breakfast: [
            {
              id: 'item_tamper_1',
              foodId: 'food_1',
              name: 'Comida Injetada',
              grams: 100,
              calories: 100,
              protein: 10,
              carbs: 10,
              fat: 2,
            },
          ],
        },
      },
    });

    expect(response.statusCode).toBe(403);
    const body = response.json();
    expect(body.error).toBe('FORBIDDEN');
  });

  it('deve permitir que Alice leia e salve normalmente em seu próprio diário', async () => {
    const putRes = await app.inject({
      method: 'PUT',
      url: '/api/v1/diaries/2026-10-30',
      headers: {
        authorization: `Bearer ${tokenUserA}`,
      },
      payload: {
        meals: {
          breakfast: [
            {
              id: 'alice_item_1',
              foodId: 'food_alice',
              name: 'Ovos Mexidos Alice',
              grams: 120,
              calories: 180,
              protein: 14,
              carbs: 2,
              fat: 12,
            },
          ],
        },
      },
    });

    expect(putRes.statusCode).toBe(200);

    const getRes = await app.inject({
      method: 'GET',
      url: '/api/v1/diaries/2026-10-30',
      headers: {
        authorization: `Bearer ${tokenUserA}`,
      },
    });

    expect(getRes.statusCode).toBe(200);
    const getBody = getRes.json();
    expect(getBody.meals.breakfast[0].name).toBe('Ovos Mexidos Alice');
  });

  it('deve impedir que Alice altere ou exclua receita pertencente a Bob', async () => {
    // 1. Bob cria uma receita
    const createRes = await app.inject({
      method: 'POST',
      url: '/api/v1/recipes',
      headers: {
        authorization: `Bearer ${tokenUserB}`,
      },
      payload: {
        name: 'Bolo Secreto do Bob',
        servings: 4,
        ingredients: [
          { foodId: 'food_whey', gramsOrUnits: 60 },
        ],
      },
    });

    expect(createRes.statusCode).toBe(201);
    const bobRecipe = createRes.json();

    // 2. Alice tenta atualizar a receita do Bob
    const updateRes = await app.inject({
      method: 'PUT',
      url: `/api/v1/recipes/${bobRecipe.id}`,
      headers: {
        authorization: `Bearer ${tokenUserA}`,
      },
      payload: {
        name: 'Bolo Hackeado pela Alice',
        servings: 1,
        ingredients: [
          { foodId: 'food_whey', gramsOrUnits: 30 },
        ],
      },
    });

    expect(updateRes.statusCode).toBe(404); // Not found / forbidden para Alice

    // 3. Alice tenta excluir a receita do Bob
    const deleteRes = await app.inject({
      method: 'DELETE',
      url: `/api/v1/recipes/${bobRecipe.id}`,
      headers: {
        authorization: `Bearer ${tokenUserA}`,
      },
    });

    expect(deleteRes.statusCode).toBe(404);
  });

  it('deve bloquear usuário sem perfil de administrador de executar expurgo LGPD em DELETE /api/v1/admin/users/:userId', async () => {
    const response = await app.inject({
      method: 'DELETE',
      url: '/api/v1/admin/users/usr_victim_123',
      headers: {
        authorization: `Bearer ${tokenUserA}`, // Alice (não é admin)
      },
    });

    expect(response.statusCode).toBe(403);
    const body = response.json();
    expect(body.error).toBe('UNAUTHORIZED_ADMIN');
  });

  it('deve permitir que usuário com perfil de administrador autenticado execute expurgo LGPD', async () => {
    const response = await app.inject({
      method: 'DELETE',
      url: '/api/v1/admin/users/usr_purged_test_456',
      headers: {
        authorization: `Bearer ${tokenAdmin}`, // Admin autenticado
      },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.success).toBe(true);
    expect(body.purgedUserId).toBe('usr_purged_test_456');
  });

  it('deve bloquear usuário comum de aprovar alimentos globalmente em PATCH /api/v1/foods/:id/validate', async () => {
    const response = await app.inject({
      method: 'PATCH',
      url: '/api/v1/foods/food_cust_123/validate',
      headers: {
        authorization: `Bearer ${tokenUserA}`,
      },
    });

    expect(response.statusCode).toBe(403);
  });
});
