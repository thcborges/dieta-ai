import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildApp } from '../src/app.js';
import type { FastifyInstance } from 'fastify';

describe('Meal Diary per Account Isolation API (Módulo 3: Isolamento por Conta)', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('deve rejeitar acesso ao diário sem cabeçalho de identificação do usuário', async () => {
    const resGet = await app.inject({
      method: 'GET',
      url: '/api/v1/diary',
    });

    expect(resGet.statusCode).toBe(401);
    expect(resGet.json().error).toBe('USER_AUTHENTICATION_REQUIRED');

    const resPut = await app.inject({
      method: 'PUT',
      url: '/api/v1/diary',
      payload: {
        meals: {
          breakfast: [],
          lunch: [],
          afternoon_snack: [],
          dinner_event: [],
        },
      },
    });

    expect(resPut.statusCode).toBe(401);
    expect(resPut.json().error).toBe('USER_AUTHENTICATION_REQUIRED');
  });

  it('deve retornar diário vazio para um novo usuário autenticado', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/diary',
      headers: {
        'x-user-id': 'usr_new_user_1',
      },
    });

    expect(res.statusCode).toBe(200);
    const data = res.json();
    expect(data.meals).toBeDefined();
    expect(data.meals.breakfast).toEqual([]);
    expect(data.meals.lunch).toEqual([]);
    expect(data.meals.afternoon_snack).toEqual([]);
    expect(data.meals.dinner_event).toEqual([]);
  });

  it('deve salvar as refeições de um usuário e garantir isolamento estrito entre contas', async () => {
    const userAMeals = {
      breakfast: [
        {
          id: 'item_a_1',
          foodId: 'ovos_inteiros',
          name: 'Ovo de Galinha Inteiro',
          grams: 100,
          calories: 143,
          protein: 13,
          carbs: 1,
          fat: 10,
          fiber: 0,
        },
      ],
      lunch: [],
      afternoon_snack: [],
      dinner_event: [],
    };

    // 1. Usuário A salva suas refeições
    const saveResA = await app.inject({
      method: 'PUT',
      url: '/api/v1/diary',
      headers: {
        'x-user-id': 'usr_user_A',
      },
      payload: {
        meals: userAMeals,
      },
    });

    expect(saveResA.statusCode).toBe(200);
    expect(saveResA.json().success).toBe(true);

    // 2. Usuário B consulta o diário e NÃO PODE ver os alimentos cadastrados pelo Usuário A
    const getResB = await app.inject({
      method: 'GET',
      url: '/api/v1/diary',
      headers: {
        'x-user-id': 'usr_user_B',
      },
    });

    expect(getResB.statusCode).toBe(200);
    const mealsB = getResB.json().meals;
    expect(mealsB.breakfast).toEqual([]);
    expect(mealsB.lunch).toEqual([]);

    // 3. Usuário B salva suas próprias refeições
    const userBMeals = {
      breakfast: [],
      lunch: [
        {
          id: 'item_b_1',
          foodId: 'sassami',
          name: 'Filé de Sassami Desfiado',
          grams: 200,
          calories: 330,
          protein: 62,
          carbs: 0,
          fat: 7.2,
          fiber: 0,
        },
      ],
      afternoon_snack: [],
      dinner_event: [],
    };

    const saveResB = await app.inject({
      method: 'PUT',
      url: '/api/v1/diary',
      headers: {
        'x-user-id': 'usr_user_B',
      },
      payload: {
        meals: userBMeals,
      },
    });

    expect(saveResB.statusCode).toBe(200);

    // 4. Usuário A consulta novamente e vê APENAS seus alimentos
    const getResA2 = await app.inject({
      method: 'GET',
      url: '/api/v1/diary',
      headers: {
        'x-user-id': 'usr_user_A',
      },
    });

    expect(getResA2.statusCode).toBe(200);
    const mealsA2 = getResA2.json().meals;
    expect(mealsA2.breakfast).toHaveLength(1);
    expect(mealsA2.breakfast[0].foodId).toBe('ovos_inteiros');
    expect(mealsA2.lunch).toEqual([]);
  });

  it('deve rejeitar payload inválido na atualização do diário', async () => {
    const res = await app.inject({
      method: 'PUT',
      url: '/api/v1/diary',
      headers: {
        'x-user-id': 'usr_user_A',
      },
      payload: {
        invalidKey: 'bad',
      },
    });

    expect(res.statusCode).toBe(400);
    expect(res.json().error).toBe('INVALID_PAYLOAD');
  });
});
