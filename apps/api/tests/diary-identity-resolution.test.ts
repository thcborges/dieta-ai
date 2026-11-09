import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildApp } from '../src/app.js';
import type { FastifyInstance } from 'fastify';
import { firestoreDiaryService } from '../src/services/firestore-diary.service.js';
import { authService } from '../src/services/auth.service.js';
import { generateBlindIndex } from '@dieta-ai/core';

describe('Regression: Recuperação de Relacionamentos e Identidade de Usuário no Diário', () => {
  let app: FastifyInstance;
  const pepper = authService.getSecretPepper();
  const testEmail = 'thcborges@gmail.com';
  const canonicalUserId = 'usr_thcborges_gmail_com';
  const testDate = '2026-11-09';

  beforeAll(async () => {
    app = await buildApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('POST /api/v1/auth/google deve emitir user.id e sub canônicos no formato usr_<email_sanitizado>', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/google',
      payload: {
        googleIdToken: `mock-google-id-token-${Date.now()}`,
        email: testEmail,
        name: 'Thiago Borges',
      },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.user.id).toBe(canonicalUserId);
    expect(body.blindIndex).toBe(generateBlindIndex(canonicalUserId, pepper));

    const parts = body.sessionToken.split('.');
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
    expect(payload.sub).toBe(canonicalUserId);
    expect(payload.blindUserId).toBe(generateBlindIndex(canonicalUserId, pepper));
  });

  it('deve salvar e recuperar diário diretamente com o ID canônico sem code smells ou workarounds', async () => {
    // 1. Grava um diário com o ID canônico do usuário
    const sampleMeals = {
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

    const saved = await firestoreDiaryService.saveDiary(canonicalUserId, testDate, sampleMeals);
    const expectedBlindUserId = generateBlindIndex(canonicalUserId, pepper);
    expect(saved.blindUserId).toBe(expectedBlindUserId);

    // 2. Consulta direta pelo canonicalUserId encontra o registro com exatidão
    const diary = await firestoreDiaryService.getDiary(canonicalUserId, testDate);
    expect(diary.blindUserId).toBe(expectedBlindUserId);
    expect(diary.meals.breakfast).toHaveLength(1);
    expect(diary.meals.breakfast[0].name).toBe('Sassami Grelhado');
  });

  it('GET /api/v1/diaries/:date com Bearer sessionToken e x-user-id canônico deve retornar 200 com os dados do diário sem 403', async () => {
    // 1. Obtém token autenticado
    const loginRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/google',
      payload: {
        googleIdToken: `mock-google-id-token-${Date.now()}`,
        email: testEmail,
        name: 'Thiago Borges',
      },
    });
    const { sessionToken } = loginRes.json();

    // 2. Chama GET /api/v1/diaries/:date
    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/diaries/${testDate}`,
      headers: {
        authorization: `Bearer ${sessionToken}`,
        'x-user-id': canonicalUserId,
      },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.meals.breakfast).toHaveLength(1);
    expect(body.meals.breakfast[0].name).toBe('Sassami Grelhado');
  });
});
