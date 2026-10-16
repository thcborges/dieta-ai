import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildApp } from '../src/app.js';
import type { FastifyInstance } from 'fastify';

import net from 'net';

async function isPortOpen(port: number, host: string): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(600);
    socket.on('connect', () => {
      socket.destroy();
      resolve(true);
    });
    socket.on('timeout', () => {
      socket.destroy();
      resolve(false);
    });
    socket.on('error', () => {
      socket.destroy();
      resolve(false);
    });
    socket.connect(port, host);
  });
}

describe('Firestore Daily Food Diary API (/api/v1/diaries)', { timeout: 20000 }, () => {
  let app: FastifyInstance;
  const testUserId = 'usr_lider_tecnico_190cm';
  const testDate = '2026-10-16';

  beforeAll(async () => {
    process.env.FIRESTORE_PROJECT_ID = 'thcborges-dieta-ai-dev';
    const isEmulatorRunning = await isPortOpen(8080, '127.0.0.1');
    if (isEmulatorRunning) {
      process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080';
    } else {
      delete process.env.FIRESTORE_EMULATOR_HOST;
    }
    app = await buildApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('deve retornar 401 se x-user-id não for fornecido', async () => {
    const response = await app.inject({
      method: 'GET',
      url: `/api/v1/diaries/${testDate}`,
    });

    expect(response.statusCode).toBe(401);
    const body = response.json();
    expect(body.error).toBe('UNAUTHORIZED');
  });

  it('deve retornar diário padrão/vazio para nova data sem registros', async () => {
    const response = await app.inject({
      method: 'GET',
      url: `/api/v1/diaries/2099-01-01`,
      headers: {
        'x-user-id': testUserId,
      },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.date).toBe('2099-01-01');
    expect(body.meals).toBeDefined();
    expect(body.meals.breakfast).toEqual([]);
    expect(body.meals.lunch).toEqual([]);
    expect(body.meals.afternoon_snack).toEqual([]);
    expect(body.meals.dinner_event).toEqual([]);
    expect(body.totals.calories).toBe(0);
    expect(body.totals.protein).toBe(0);
  });

  it('deve salvar e persistir os alimentos cadastrados no diário no Firestore com validação matemática dos totais', async () => {
    const mealsPayload = {
      meals: {
        breakfast: [
          {
            id: 'item_breakfast_1',
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
        lunch: [
          {
            id: 'item_lunch_1',
            foodId: 'sassami',
            name: 'Filé de Sassami Desfiado Cozido',
            grams: 200,
            calories: 330,
            protein: 62,
            carbs: 0,
            fat: 7.2,
            fiber: 0,
          },
        ],
        afternoon_snack: [
          {
            id: 'item_snack_1',
            foodId: 'whey_growth_30g',
            name: 'Whey Protein Concentrado 80% (Growth)',
            grams: 30,
            calories: 124,
            protein: 24,
            carbs: 3,
            fat: 1.8,
            fiber: 0,
          },
        ],
        dinner_event: [],
      },
    };

    const putResponse = await app.inject({
      method: 'PUT',
      url: `/api/v1/diaries/${testDate}`,
      headers: {
        'x-user-id': testUserId,
      },
      payload: mealsPayload,
    });

    expect(putResponse.statusCode).toBe(200);
    const putBody = putResponse.json();
    expect(putBody.success).toBe(true);
    expect(putBody.date).toBe(testDate);
    expect(putBody.meals.breakfast.length).toBe(1);
    expect(putBody.meals.lunch.length).toBe(1);
    expect(putBody.meals.afternoon_snack.length).toBe(1);

    // Totais calculados com precisão analítica
    // Calorias: 143 + 330 + 124 = 597
    expect(putBody.totals.calories).toBe(597);
    // Proteínas: 13 + 62 + 24 = 99g
    expect(putBody.totals.protein).toBe(99);
    // Gorduras: 10 + 7.2 + 1.8 = 19g
    expect(putBody.totals.fat).toBe(19);

    // Consulta de volta no Firestore para garantir que foi persistido de forma duradoura
    const getResponse = await app.inject({
      method: 'GET',
      url: `/api/v1/diaries/${testDate}`,
      headers: {
        'x-user-id': testUserId,
      },
    });

    expect(getResponse.statusCode).toBe(200);
    const getBody = getResponse.json();
    expect(getBody.date).toBe(testDate);
    expect(getBody.meals.lunch[0].name).toBe('Filé de Sassami Desfiado Cozido');
    expect(getBody.meals.lunch[0].grams).toBe(200);
    expect(getBody.totals.calories).toBe(597);
    expect(getBody.totals.protein).toBe(99);
  });

  it('deve adicionar um alimento diretamente em uma refeição do diário', async () => {
    const newFood = {
      id: 'item_snack_2',
      foodId: 'feijao_preto',
      name: 'Feijão Preto Cozido',
      grams: 100,
      calories: 77,
      protein: 4.5,
      carbs: 14,
      fat: 0.5,
      fiber: 8,
    };

    const addResponse = await app.inject({
      method: 'POST',
      url: `/api/v1/diaries/${testDate}/meals/afternoon_snack`,
      headers: {
        'x-user-id': testUserId,
      },
      payload: newFood,
    });

    expect(addResponse.statusCode).toBe(200);
    const body = addResponse.json();
    expect(body.meals.afternoon_snack.length).toBe(2);
    expect(body.meals.afternoon_snack.some((i: { foodId: string }) => i.foodId === 'feijao_preto')).toBe(true);
    expect(body.totals.calories).toBe(597 + 77);
  });

  it('deve remover um alimento de uma refeição do diário no Firestore', async () => {
    const deleteResponse = await app.inject({
      method: 'DELETE',
      url: `/api/v1/diaries/${testDate}/meals/afternoon_snack/item_snack_2`,
      headers: {
        'x-user-id': testUserId,
      },
    });

    expect(deleteResponse.statusCode).toBe(200);
    const body = deleteResponse.json();
    expect(body.meals.afternoon_snack.some((i: { id: string }) => i.id === 'item_snack_2')).toBe(false);
    expect(body.totals.calories).toBe(597);
  });

  it('deve validar payload com erro 400 se formato de data for inválido', async () => {
    const response = await app.inject({
      method: 'GET',
      url: `/api/v1/diaries/data-invalida`,
      headers: {
        'x-user-id': testUserId,
      },
    });

    expect(response.statusCode).toBe(400);
    const body = response.json();
    expect(body.error).toBe('INVALID_DATE_FORMAT');
  });

  it('deve expurgar todos os diários de um usuário no Firestore quando o admin executar a exclusão LGPD', async () => {
    // 1. Salva um diário para um usuário temporário
    const purgeUserId = 'usr_temp_purge_target_456';
    await app.inject({
      method: 'PUT',
      url: `/api/v1/diaries/2026-10-17`,
      headers: {
        'x-user-id': purgeUserId,
      },
      payload: {
        meals: {
          breakfast: [
            {
              id: 'purge_item_1',
              foodId: 'sassami',
              name: 'Sassami',
              grams: 100,
              calories: 165,
              protein: 31,
              carbs: 0,
              fat: 3.6,
              fiber: 0,
            },
          ],
          lunch: [],
          afternoon_snack: [],
          dinner_event: [],
        },
      },
    });

    // 2. Chama rota de admin para expurgo
    const adminResponse = await app.inject({
      method: 'DELETE',
      url: `/api/v1/admin/users/${purgeUserId}`,
      headers: {
        'x-admin-token': 'admin-secret-token-key-us-central1',
      },
    });

    expect(adminResponse.statusCode).toBe(200);
    const adminBody = adminResponse.json();
    expect(adminBody.success).toBe(true);

    // 3. Verifica que o diário foi permanentemente removido
    const checkResponse = await app.inject({
      method: 'GET',
      url: `/api/v1/diaries/2026-10-17`,
      headers: {
        'x-user-id': purgeUserId,
      },
    });

    const checkBody = checkResponse.json();
    expect(checkBody.meals.breakfast).toEqual([]);
    expect(checkBody.totals.calories).toBe(0);
  });

  it('deve validar erros em PUT /diaries/:date (401, 400 data inválida, 400 payload inválido)', async () => {
    // 401
    const resNoAuth = await app.inject({
      method: 'PUT',
      url: `/api/v1/diaries/${testDate}`,
      payload: { meals: {} },
    });
    expect(resNoAuth.statusCode).toBe(401);

    // 400 data inválida
    const resBadDate = await app.inject({
      method: 'PUT',
      url: `/api/v1/diaries/bad-date`,
      headers: { 'x-user-id': testUserId },
      payload: { meals: {} },
    });
    expect(resBadDate.statusCode).toBe(400);

    // 400 payload inválido
    const resBadPayload = await app.inject({
      method: 'PUT',
      url: `/api/v1/diaries/${testDate}`,
      headers: { 'x-user-id': testUserId },
      payload: { meals: { breakfast: [{ grams: -10 }] } },
    });
    expect(resBadPayload.statusCode).toBe(400);
  });

  it('deve validar erros em POST /diaries/:date/meals/:window (401, 400 data inválida, 400 janela inválida, 400 payload inválido)', async () => {
    // 401
    const resNoAuth = await app.inject({
      method: 'POST',
      url: `/api/v1/diaries/${testDate}/meals/lunch`,
      payload: {},
    });
    expect(resNoAuth.statusCode).toBe(401);

    // 400 data inválida
    const resBadDate = await app.inject({
      method: 'POST',
      url: `/api/v1/diaries/invalid-date/meals/lunch`,
      headers: { 'x-user-id': testUserId },
      payload: {},
    });
    expect(resBadDate.statusCode).toBe(400);

    // 400 janela inválida
    const resBadWindow = await app.inject({
      method: 'POST',
      url: `/api/v1/diaries/${testDate}/meals/midnight_feast`,
      headers: { 'x-user-id': testUserId },
      payload: {},
    });
    expect(resBadWindow.statusCode).toBe(400);

    // 400 payload inválido
    const resBadPayload = await app.inject({
      method: 'POST',
      url: `/api/v1/diaries/${testDate}/meals/lunch`,
      headers: { 'x-user-id': testUserId },
      payload: { name: 'Invalid' },
    });
    expect(resBadPayload.statusCode).toBe(400);
  });

  it('deve validar erros em DELETE /diaries/:date/meals/:window/:itemId (401, 400 data inválida, 400 janela inválida)', async () => {
    // 401
    const resNoAuth = await app.inject({
      method: 'DELETE',
      url: `/api/v1/diaries/${testDate}/meals/lunch/item_1`,
    });
    expect(resNoAuth.statusCode).toBe(401);

    // 400 data inválida
    const resBadDate = await app.inject({
      method: 'DELETE',
      url: `/api/v1/diaries/invalid-date/meals/lunch/item_1`,
      headers: { 'x-user-id': testUserId },
    });
    expect(resBadDate.statusCode).toBe(400);

    // 400 janela inválida
    const resBadWindow = await app.inject({
      method: 'DELETE',
      url: `/api/v1/diaries/${testDate}/meals/midnight_feast/item_1`,
      headers: { 'x-user-id': testUserId },
    });
    expect(resBadWindow.statusCode).toBe(400);
  });
});
