import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildApp } from '../src/app.js';
import type { FastifyInstance } from 'fastify';
import { firestoreDiaryService } from '../src/services/firestore-diary.service.js';
import { authService } from '../src/services/auth.service.js';
import { generateBlindIndex } from '@dieta-ai/core';

describe('Migração Direta de Diários no Banco de Dados para o ID Correto', () => {
  let app: FastifyInstance;
  const pepper = authService.getSecretPepper();
  const targetEmail = 'thcborges@gmail.com';
  const targetUserId = `usr_${targetEmail.replace(/[^a-zA-Z0-9]/g, '_')}`;
  const targetBlindUserId = generateBlindIndex(targetUserId, pepper);

  const legacyUserId = 'legacy_user_account_old_hash';
  const legacyBlindUserId = generateBlindIndex(legacyUserId, pepper);
  const testDate = '2026-11-09';

  beforeAll(async () => {
    app = await buildApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('deve migrar registros legados para o blindUserId canônico do usuário', async () => {
    // 1. Simula a existência de um diário salvo sob um ID legado/antigo no banco
    const legacyMeals = {
      breakfast: [
        {
          id: 'item_1',
          foodId: 'food_sassami',
          name: 'Sassami Grelhado',
          grams: 200,
          calories: 240,
          protein: 46,
          carbs: 0,
          fat: 5,
          fiber: 0,
        },
      ],
      lunch: [],
      afternoon_snack: [],
      dinner_event: [],
    };

    await firestoreDiaryService.saveDiary(legacyUserId, testDate, legacyMeals);

    // 2. Executa a migração no banco para o ID correto do usuário
    const result = await firestoreDiaryService.migrateDiariesToUser(targetUserId);
    expect(result.migratedCount).toBeGreaterThanOrEqual(1);

    // 3. Consulta direta pelo targetUserId encontra o registro sem nenhum workaround
    const diary = await firestoreDiaryService.getDiary(targetUserId, testDate);
    expect(diary.blindUserId).toBe(targetBlindUserId);
    expect(diary.meals.breakfast).toHaveLength(1);
    expect(diary.meals.breakfast[0].name).toBe('Sassami Grelhado');
  });

  it('POST /api/v1/admin/migrate-diaries deve ser restrito a administradores e executar a migração', async () => {
    // 1. Requisição sem token deve retornar 401
    const unauthRes = await app.inject({
      method: 'POST',
      url: '/api/v1/admin/migrate-diaries',
      payload: { targetUserId },
    });
    expect(unauthRes.statusCode).toBe(401);

    // 2. Requisição com usuário comum (não-admin) deve retornar 403
    const regularLoginRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/google',
      payload: {
        googleIdToken: `mock-google-id-token-${Date.now()}`,
        email: 'regular_user@example.com',
        name: 'Regular User',
      },
    });
    const { sessionToken: regularToken } = regularLoginRes.json();

    const forbiddenRes = await app.inject({
      method: 'POST',
      url: '/api/v1/admin/migrate-diaries',
      headers: {
        authorization: `Bearer ${regularToken}`,
      },
      payload: { targetUserId },
    });
    expect(forbiddenRes.statusCode).toBe(403);

    // 3. Login com admin autorizado deve retornar 200
    const loginRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/google',
      payload: {
        googleIdToken: `mock-google-id-token-${Date.now()}`,
        email: 'admin@example.com', // configurado em ADMIN_EMAILS
        name: 'Tech Lead Admin',
      },
    });
    const { sessionToken } = loginRes.json();

    const authRes = await app.inject({
      method: 'POST',
      url: '/api/v1/admin/migrate-diaries',
      headers: {
        authorization: `Bearer ${sessionToken}`,
      },
      payload: { targetUserId },
    });

    expect(authRes.statusCode).toBe(200);
    const body = authRes.json();
    expect(body.success).toBe(true);
    expect(body.targetUserId).toBe(targetUserId);
    expect(body.targetBlindUserId).toBe(targetBlindUserId);
    expect(typeof body.migratedCount).toBe('number');
  });
});
