import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildApp } from '../src/app.js';
import { authService } from '../src/services/auth.service.js';
import type { FastifyInstance } from 'fastify';

describe('Etapa 4: Recálculo Obrigatório de Macros pelo Servidor (Zero-Trust Browser Security)', () => {
  let app: FastifyInstance;

  const tokenUser = authService.createSessionToken({
    sub: 'usr_zerotrust_tester',
    email: 'zerotrust@example.com',
    name: 'Zero Trust Tester',
    isAdmin: false,
    blindUserId: authService.getBlindUserId('usr_zerotrust_tester'),
  });

  beforeAll(async () => {
    app = await buildApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('deve descartar calorias e macros forjados enviados pelo cliente em PUT /api/v1/diaries/:date e recalcular a partir do banco oficial', async () => {
    // Sassami real por 100g: 165 kcal, 31g P, 0g C, 3.6g G, 0g fibra
    // Para 200g, o valor matemático exato é: 330 kcal, 62g P, 0g C, 7.2g G, 0g fibra.
    // O cliente malicioso envia números forjados: 10 kcal, 500g proteína.
    const forgedPayload = {
      meals: {
        lunch: [
          {
            id: 'item_forged_sassami',
            foodId: 'sassami',
            grams: 200,
            calories: 10, // FORJADO
            protein: 500, // FORJADO
            carbs: 0,
            fat: 0,
            fiber: 0,
          },
        ],
      },
      // Cliente também tenta enviar totais adulterados
      totals: {
        calories: 10,
        protein: 500,
        carbs: 0,
        fat: 0,
        fiber: 0,
      },
    };

    const putRes = await app.inject({
      method: 'PUT',
      url: '/api/v1/diaries/2026-10-30',
      headers: {
        authorization: `Bearer ${tokenUser}`,
      },
      payload: forgedPayload,
    });

    expect(putRes.statusCode).toBe(200);
    const body = putRes.json();

    // 1. O item gravado DEVE ter os macros matemáticos reais recalculados pelo servidor
    const savedItem = body.meals.lunch[0];
    expect(savedItem.foodId).toBe('sassami');
    expect(savedItem.name).toBe('Filé de Sassami Desfiado Cozido (Frango)'); // Nome canônico oficial restaurado
    expect(savedItem.calories).toBe(330);
    expect(savedItem.protein).toBe(62);
    expect(savedItem.carbs).toBe(0);
    expect(savedItem.fat).toBe(7.2);

    // 2. Os totais diários DEVEM ser calculados pelo servidor, ignorando o objeto de totais do cliente
    expect(body.totals.calories).toBe(330);
    expect(body.totals.protein).toBe(62);
    expect(body.totals.fat).toBe(7.2);

    // 3. Consulta subsequente via GET deve atestar a persistência dos valores recalculados
    const getRes = await app.inject({
      method: 'GET',
      url: '/api/v1/diaries/2026-10-30',
      headers: {
        authorization: `Bearer ${tokenUser}`,
      },
    });

    expect(getRes.statusCode).toBe(200);
    const getBody = getRes.json();
    expect(getBody.meals.lunch[0].calories).toBe(330);
    expect(getBody.meals.lunch[0].protein).toBe(62);
    expect(getBody.totals.calories).toBe(330);
    expect(getBody.totals.protein).toBe(62);
  });

  it('deve aceitar payload mínimo contendo apenas { id, foodId, grams } e calcular todos os macros no servidor', async () => {
    // Arroz branco por 100g: 130 kcal, 2.5g P, 28g C, 0.3g G, 0.4g fibra
    // Para 150g: 195 kcal, 3.8g P (ou 3.75 arredondado para 3.8), 42g C, 0.5g G, 0.6g fibra.
    const minimalPayload = {
      meals: {
        lunch: [
          {
            id: 'item_minimal_arroz',
            foodId: 'arroz_branco',
            grams: 150,
          },
        ],
      },
    };

    const putRes = await app.inject({
      method: 'PUT',
      url: '/api/v1/diaries/2026-10-30',
      headers: {
        authorization: `Bearer ${tokenUser}`,
      },
      payload: minimalPayload,
    });

    expect(putRes.statusCode).toBe(200);
    const body = putRes.json();
    const item = body.meals.lunch[0];
    expect(item.name).toBe('Arroz Branco Cozido');
    expect(item.calories).toBe(195);
    expect(item.protein).toBe(4.1);
    expect(item.carbs).toBe(42.3);
    expect(body.totals.calories).toBe(195);
  });

  it('deve recalcular calorias e macros ao adicionar alimento diretamente via POST /api/v1/diaries/:date/meals/:window', async () => {
    // Adiciona feijão preto (100g: 77 kcal, 4.5g P, 14g C, 0.5g G, 4.2g fibra)
    // Para 100g com valores forjados:
    const addRes = await app.inject({
      method: 'POST',
      url: '/api/v1/diaries/2026-10-30/meals/lunch',
      headers: {
        authorization: `Bearer ${tokenUser}`,
      },
      payload: {
        id: 'item_feijao_add',
        foodId: 'feijao_preto',
        grams: 100,
        calories: 999, // Forjado
        protein: 0,   // Forjado
        carbs: 0,
        fat: 0,
      },
    });

    expect(addRes.statusCode).toBe(200);
    const body = addRes.json();
    const addedItem = body.meals.lunch.find((i: { id: string }) => i.id === 'item_feijao_add');
    expect(addedItem).toBeDefined();
    expect(addedItem.name).toBe('Feijão Preto Cozido');
    expect(addedItem.calories).toBe(77);
    expect(addedItem.protein).toBe(4.5);
    expect(addedItem.carbs).toBe(14);
  });

  it('deve preservar macros manuais legítimos quando foodId for quick_macro', async () => {
    const quickMacroPayload = {
      meals: {
        dinner_event: [
          {
            id: 'item_quick_macro_1',
            foodId: 'quick_macro',
            name: 'Almoço Executivo Restaurante',
            grams: 350,
            calories: 650,
            protein: 45,
            carbs: 55,
            fat: 22,
            fiber: 5,
          },
        ],
      },
    };

    const putRes = await app.inject({
      method: 'PUT',
      url: '/api/v1/diaries/2026-10-30',
      headers: {
        authorization: `Bearer ${tokenUser}`,
      },
      payload: quickMacroPayload,
    });

    expect(putRes.statusCode).toBe(200);
    const body = putRes.json();
    const item = body.meals.dinner_event[0];
    expect(item.name).toBe('Almoço Executivo Restaurante');
    expect(item.calories).toBe(650);
    expect(item.protein).toBe(45);
    expect(item.carbs).toBe(55);
    expect(item.fat).toBe(22);
  });

  it('deve recalcular macros no endpoint in-memory PUT /api/v1/diary descartando valores forjados', async () => {
    const putRes = await app.inject({
      method: 'PUT',
      url: '/api/v1/diary',
      headers: {
        authorization: `Bearer ${tokenUser}`,
      },
      payload: {
        meals: {
          breakfast: [
            {
              id: 'item_egg',
              foodId: 'ovos_inteiros',
              grams: 100, // 2 ovos médios ~100g: 143 kcal, 13g P, 1g C, 10g G
              calories: 1, // Forjado
              protein: 99, // Forjado
            },
          ],
          lunch: [],
          afternoon_snack: [],
          dinner_event: [],
        },
      },
    });

    expect(putRes.statusCode).toBe(200);
    const body = putRes.json();
    const eggItem = body.meals.breakfast[0];
    expect(eggItem.name).toBe('Ovo de Galinha Inteiro Cozido/Mexido');
    expect(eggItem.calories).toBe(143);
    expect(eggItem.protein).toBe(13);
  });
});
