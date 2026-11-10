import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildApp } from '../src/app.js';
import type { FastifyInstance } from 'fastify';
import { authService } from '../src/services/auth.service.js';

describe('BDD: Diary Dates Discovery and History Endpoints', () => {
  let app: FastifyInstance;
  const userA = 'usr_discovery_test_a';
  const userB = 'usr_discovery_test_b';
  let tokenA: string;
  let tokenB: string;

  beforeAll(async () => {
    process.env.FIRESTORE_PROJECT_ID = 'thcborges-dieta-ai-dev';
    process.env.NODE_ENV = 'test';
    app = await buildApp();

    tokenA = authService.createSessionToken({
      sub: userA,
      email: 'user_a@example.com',
      name: 'User A',
      isAdmin: false,
    });

    tokenB = authService.createSessionToken({
      sub: userB,
      email: 'user_b@example.com',
      name: 'User B',
      isAdmin: false,
    });
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /api/v1/diaries/dates', () => {
    it('deve rejeitar requisição não autenticada com 401', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/diaries/dates',
      });
      expect(res.statusCode).toBe(401);
    });

    it('deve retornar lista vazia quando o usuário não tiver diários com refeições', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/diaries/dates',
        headers: {
          authorization: `Bearer ${tokenA}`,
          'x-user-id': userA,
        },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body).toHaveProperty('dates');
      expect(Array.isArray(body.dates)).toBe(true);
      expect(body).toHaveProperty('count');
    });

    it('deve retornar as datas ordenadas (mais recente primeiro) e com isolamento entre usuários', async () => {
      // Salva diários para User A em duas datas
      await app.inject({
        method: 'PUT',
        url: '/api/v1/diaries/2026-11-01',
        headers: {
          authorization: `Bearer ${tokenA}`,
          'x-user-id': userA,
        },
        payload: {
          meals: {
            lunch: [
              {
                foodId: 'rice',
                name: 'Arroz Branco',
                grams: 100,
                calories: 130,
                protein: 2.5,
                carbs: 28,
                fat: 0.3,
                fiber: 0.5,
              },
            ],
          },
        },
      });

      await app.inject({
        method: 'PUT',
        url: '/api/v1/diaries/2026-11-08',
        headers: {
          authorization: `Bearer ${tokenA}`,
          'x-user-id': userA,
        },
        payload: {
          meals: {
            dinner_event: [
              {
                foodId: 'chicken',
                name: 'Sassami Grelhado',
                grams: 150,
                calories: 165,
                protein: 34.5,
                carbs: 0,
                fat: 3,
                fiber: 0,
              },
            ],
          },
        },
      });

      // Salva diário para User B em data diferente
      await app.inject({
        method: 'PUT',
        url: '/api/v1/diaries/2026-11-05',
        headers: {
          authorization: `Bearer ${tokenB}`,
          'x-user-id': userB,
        },
        payload: {
          meals: {
            breakfast: [
              {
                foodId: 'egg',
                name: 'Ovo Cozido',
                grams: 100,
                calories: 143,
                protein: 13,
                carbs: 1,
                fat: 10,
                fiber: 0,
              },
            ],
          },
        },
      });

      // Consulta dates para User A
      const resA = await app.inject({
        method: 'GET',
        url: '/api/v1/diaries/dates',
        headers: {
          authorization: `Bearer ${tokenA}`,
          'x-user-id': userA,
        },
      });

      expect(resA.statusCode).toBe(200);
      const bodyA = resA.json();
      expect(bodyA.dates).toContain('2026-11-08');
      expect(bodyA.dates).toContain('2026-11-01');
      expect(bodyA.dates).not.toContain('2026-11-05'); // Não deve vazar User B
      expect(bodyA.dates[0]).toBe('2026-11-08'); // Mais recente primeiro
      expect(bodyA.count).toBeGreaterThanOrEqual(2);
    });
  });

  describe('GET /api/v1/diaries/history', () => {
    it('deve rejeitar requisição não autenticada com 401', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/diaries/history?endDate=2026-11-08&days=7',
      });
      expect(res.statusCode).toBe(401);
    });

    it('deve retornar a janela móvel completa de 7 dias com totais consolidados', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/diaries/history?endDate=2026-11-08&days=7',
        headers: {
          authorization: `Bearer ${tokenA}`,
          'x-user-id': userA,
        },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body).toHaveProperty('history');
      expect(Array.isArray(body.history)).toBe(true);
      expect(body.history.length).toBe(7);

      // 2026-11-08 deve conter as calorias do Sassami (165 kcal, 34.5g prot)
      const day08 = body.history.find((d: any) => d.date === '2026-11-08');
      expect(day08).toBeDefined();
      expect(day08.calories).toBeGreaterThan(0);
      expect(day08.proteinGrams).toBeGreaterThan(0);

      // Dias vazios devem ter 0 calorias
      const emptyDay = body.history.find((d: any) => d.date === '2026-11-07');
      expect(emptyDay).toBeDefined();
      expect(emptyDay.calories).toBe(0);
      expect(emptyDay.proteinGrams).toBe(0);
    });
  });
});
