import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildApp } from '../src/app.js';
import { authService } from '../src/services/auth.service.js';
import type { FastifyInstance } from 'fastify';

describe('Etapa 5: Metas Biométricas e Auditoria no Backend (Zero-Trust Logic)', () => {
  let app: FastifyInstance;

  const tokenAlice = authService.createSessionToken({
    sub: 'usr_goals_alice',
    email: 'alice.goals@example.com',
    name: 'Alice Goals',
    isAdmin: false,
    blindUserId: authService.getBlindUserId('usr_goals_alice'),
  });

  const tokenBob = authService.createSessionToken({
    sub: 'usr_goals_bob',
    email: 'bob.goals@example.com',
    name: 'Bob Goals',
    isAdmin: false,
    blindUserId: authService.getBlindUserId('usr_goals_bob'),
  });

  beforeAll(async () => {
    app = await buildApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('deve retornar metas padrão do usuário autenticado via GET /api/v1/users/me/goals', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/users/me/goals',
      headers: {
        authorization: `Bearer ${tokenAlice}`,
      },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.goals).toBeDefined();
    expect(body.goals.weightKg).toBeGreaterThan(0);
    expect(body.goals.calories).toBeGreaterThan(0);
    expect(body.goals.proteinGrams).toBeGreaterThan(0);
  });

  it('deve permitir atualizar e calcular metas no servidor via PUT /api/v1/users/me/goals usando Mifflin-St Jeor', async () => {
    // Parâmetros do usuário: 40 anos, 190cm, 95kg, musculação 4x/semana (moderate)
    // TMB Mifflin-St Jeor: 10*95 + 6.25*190 - 5*40 + 5 = 1943 kcal
    // GET (TDEE): 1943 * 1.55 = 3012 kcal
    // Déficit planejado: 500 kcal -> Meta = ~2512 kcal
    const payload = {
      ageYears: 40,
      gender: 'male',
      heightCm: 190,
      weightKg: 95,
      activityLevel: 'moderate',
      dailyDeficitKcal: 500,
      customProteinPerKg: 2.3, // 2.3 * 95 = ~219g (220g)
    };

    const response = await app.inject({
      method: 'PUT',
      url: '/api/v1/users/me/goals',
      headers: {
        authorization: `Bearer ${tokenAlice}`,
      },
      payload,
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.success).toBe(true);
    expect(body.goals.bmr).toBe(1943);
    expect(body.goals.tdee).toBe(3012);
    expect(body.goals.calories).toBe(2512);
    expect(body.goals.proteinGrams).toBe(218);
    expect(body.goals.fiberGrams).toBe(38); // Fibras por idade para homem de 40 anos
  });

  it('deve rejeitar parâmetros biológicos inválidos ou perigosos (400 Bad Request)', async () => {
    // Déficit extremo perigoso (> 1500 kcal)
    const dangerousPayload = {
      ageYears: 40,
      gender: 'male',
      heightCm: 190,
      weightKg: 95,
      activityLevel: 'sedentary',
      dailyDeficitKcal: 2000, // Perigoso
    };

    const response = await app.inject({
      method: 'PUT',
      url: '/api/v1/users/me/goals',
      headers: {
        authorization: `Bearer ${tokenAlice}`,
      },
      payload: dangerousPayload,
    });

    expect(response.statusCode).toBe(400);
    const body = response.json();
    expect(body.error).toBe('INVALID_GOALS_PAYLOAD');
  });

  it('deve garantir isolamento horizontal de metas entre contas distintas', async () => {
    // Bob define suas metas como 2000 kcal
    const bobPayload = {
      ageYears: 25,
      gender: 'female',
      heightCm: 165,
      weightKg: 60,
      activityLevel: 'light',
      dailyDeficitKcal: 300,
    };

    const bobPutRes = await app.inject({
      method: 'PUT',
      url: '/api/v1/users/me/goals',
      headers: {
        authorization: `Bearer ${tokenBob}`,
      },
      payload: bobPayload,
    });
    expect(bobPutRes.statusCode).toBe(200);
    const bobGoals = bobPutRes.json().goals;

    // Consulta de Alice não deve sofrer influência de Bob
    const aliceGetRes = await app.inject({
      method: 'GET',
      url: '/api/v1/users/me/goals',
      headers: {
        authorization: `Bearer ${tokenAlice}`,
      },
    });
    expect(aliceGetRes.statusCode).toBe(200);
    const aliceGoals = aliceGetRes.json().goals;

    expect(aliceGoals.weightKg).toBe(95);
    expect(bobGoals.weightKg).toBe(60);
    expect(aliceGoals.calories).not.toBe(bobGoals.calories);
  });

  it('deve incluir o auditReport no retorno de PUT e GET /api/v1/diaries/:date disparando alerta de inviabilidade matemática', async () => {
    // Se o usuário Alice consome quase todas as calorias do dia sem bater proteína:
    // Meta de Alice: 2512 kcal, 219g P.
    // Lança 2400 kcal com apenas 20g P:
    // Restam: 112 kcal, mas faltam 199g P. 199g P * 4 = 796 kcal puras necessárias!
    // Como 112 < 796, é fisicamente e matematicamente impossível bater a meta hoje!
    const putRes = await app.inject({
      method: 'PUT',
      url: '/api/v1/diaries/2026-10-30',
      headers: {
        authorization: `Bearer ${tokenAlice}`,
      },
      payload: {
        meals: {
          lunch: [
            {
              id: 'item_pizza_event',
              foodId: 'quick_macro',
              name: 'Pizza e Refrigerante',
              grams: 600,
              calories: 2400,
              protein: 20,
              carbs: 350,
              fat: 90,
            },
          ],
        },
      },
    });

    expect(putRes.statusCode).toBe(200);
    const body = putRes.json();
    expect(body.auditReport).toBeDefined();
    expect(body.auditReport.hasMathematicalImpossibility).toBe(true);
    expect(body.auditReport.alerts.some((a: { type: string }) => a.type === 'MATHEMATICAL_IMPOSSIBILITY')).toBe(true);

    // Consulta subsequente via GET também deve trazer o auditReport
    const getRes = await app.inject({
      method: 'GET',
      url: '/api/v1/diaries/2026-10-30',
      headers: {
        authorization: `Bearer ${tokenAlice}`,
      },
    });
    expect(getRes.statusCode).toBe(200);
    const getBody = getRes.json();
    expect(getBody.auditReport.hasMathematicalImpossibility).toBe(true);
  });

  it('deve incluir o auditReport no retorno de PUT /api/v1/diary (in-memory endpoint)', async () => {
    const putRes = await app.inject({
      method: 'PUT',
      url: '/api/v1/diary',
      headers: {
        authorization: `Bearer ${tokenAlice}`,
      },
      payload: {
        meals: {
          breakfast: [],
          lunch: [],
          afternoon_snack: [],
          dinner_event: [],
        },
      },
    });

    expect(putRes.statusCode).toBe(200);
    const body = putRes.json();
    expect(body.auditReport).toBeDefined();
    expect(Array.isArray(body.auditReport.alerts)).toBe(true);
  });
});
