import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { buildApp } from '../src/app.js';
import type { FastifyInstance } from 'fastify';

describe('Foods & Open Food Facts Cache API', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('deve cadastrar um alimento customizado e salvá-lo no cache', async () => {
    const payload = {
      name: 'Iogurte Natural Proteico',
      servingSizeGrams: 170,
      caloriesPer100g: 58,
      proteinPer100g: 10,
      carbsPer100g: 4.5,
      fatPer100g: 0,
      fiberPer100g: 2.5,
      barcode: '7891000100010',
    };

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/foods/custom',
      payload,
    });

    expect(response.statusCode).toBe(201);
    const body = response.json();
    expect(body.id).toBeDefined();
    expect(body.name).toBe(payload.name);
    expect(body.barcode).toBe(payload.barcode);
    expect(body.fiberPer100g).toBe(2.5);
  });

  it('deve retornar do cache quando o código de barras já foi cadastrado', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/foods/barcode/7891000100010',
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.source).toBe('cache');
    expect(body.food.name).toBe('Iogurte Natural Proteico');
    expect(body.food.proteinPer100g).toBe(10);
  });

  it('deve consultar a API do Open Food Facts quando o código de barras não estiver no cache', async () => {
    // Mock do fetch global para simular a resposta da API Open Food Facts
    const mockOFFResponse = {
      status: 1,
      product: {
        product_name: 'Queijo Cottage Zero Gordura',
        serving_quantity: '50',
        nutriments: {
          'energy-kcal_100g': 72,
          proteins_100g: 12.5,
          carbohydrates_100g: 3.2,
          fat_100g: 0.3,
          fiber_100g: 0.8,
        },
      },
    };

    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify(mockOFFResponse), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/foods/barcode/7892000200020',
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.source).toBe('open_food_facts');
    expect(body.food.name).toBe('Queijo Cottage Zero Gordura');
    expect(body.food.proteinPer100g).toBe(12.5);
    expect(body.food.fiberPer100g).toBe(0.8);

    fetchSpy.mockRestore();
  });

  it('deve retornar 404 com instrução de cadastro rápido se o código de barras não for encontrado', async () => {
    const mockNotFoundResponse = {
      status: 0,
      status_verbose: 'product not found',
    };

    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify(mockNotFoundResponse), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/foods/barcode/0000000000000',
    });

    expect(response.statusCode).toBe(404);
    const body = response.json();
    expect(body.error).toBe('PRODUCT_NOT_FOUND');
    expect(body.message).toContain('Alimento não encontrado');

    fetchSpy.mockRestore();
  });

  it('deve rejeitar cadastro customizado com dados inválidos (400 Bad Request)', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/foods/custom',
      payload: {
        name: '', // inválido
        servingSizeGrams: -10, // inválido
      },
    });

    expect(response.statusCode).toBe(400);
    const body = response.json();
    expect(body.error).toBe('INVALID_PAYLOAD');
  });

  it('deve buscar alimentos primeiro no banco de dados / cache', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/foods/search?q=Iogurte',
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.source).toBe('cache');
    expect(body.foods.length).toBeGreaterThan(0);
    expect(body.foods[0].name).toContain('Iogurte');
  });

  it('deve consultar Open Food Facts se não encontrado no cache e salvar o alimento no banco de dados', async () => {
    const mockOFFSearchResponse = {
      count: 1,
      products: [
        {
          code: '7893000300030',
          product_name: 'Granola Artesanal Zero Açúcar',
          serving_quantity: '40',
          nutriments: {
            'energy-kcal_100g': 380,
            proteins_100g: 11,
            carbohydrates_100g: 58,
            fat_100g: 10,
            fiber_100g: 12,
          },
        },
      ],
    };

    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify(mockOFFSearchResponse), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    // 1. Busca na API (não está no cache ainda)
    const response1 = await app.inject({
      method: 'GET',
      url: '/api/v1/foods/search?q=Granola',
    });

    expect(response1.statusCode).toBe(200);
    const body1 = response1.json();
    expect(body1.source).toBe('open_food_facts');
    expect(body1.foods.length).toBe(1);
    expect(body1.foods[0].name).toBe('Granola Artesanal Zero Açúcar');
    expect(body1.foods[0].fiberPer100g).toBe(12);

    fetchSpy.mockRestore();

    // 2. Segunda busca deve vir do CACHE (pois foi salvo no banco de dados) sem chamar o fetch
    const response2 = await app.inject({
      method: 'GET',
      url: '/api/v1/foods/search?q=Granola',
    });

    expect(response2.statusCode).toBe(200);
    const body2 = response2.json();
    expect(body2.source).toBe('cache');
    expect(body2.foods[0].name).toBe('Granola Artesanal Zero Açúcar');
  });

  it('deve listar todos os alimentos do banco de dados via GET /api/v1/foods', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/foods',
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(Array.isArray(body.foods)).toBe(true);
    expect(body.foods.length).toBeGreaterThan(0);
  });

  describe('Visibilidade Restrita e Moderação de Alimentos Cadastrados', () => {
    it('deve permitir que o autor visualize seu alimento customizado, mas não outro usuário, até aprovação do admin', async () => {
      // 1. Usuário A cadastra um alimento customizado
      const payloadA = {
        name: 'Muffin de Banana do Usuário A',
        servingSizeGrams: 80,
        caloriesPer100g: 220,
        proteinPer100g: 15,
        carbsPer100g: 30,
        fatPer100g: 4,
        barcode: '7899999990001',
      };

      const createRes = await app.inject({
        method: 'POST',
        url: '/api/v1/foods/custom',
        headers: { 'x-user-id': 'usr_user_A' },
        payload: payloadA,
      });

      expect(createRes.statusCode).toBe(201);
      const foodA = createRes.json();
      expect(foodA.id).toBeDefined();
      expect(foodA.isValidated).toBe(false);
      expect(foodA.userId).toBe('usr_user_A');

      // 2. Usuário A busca alimentos -> deve ver o seu Muffin
      const searchResA = await app.inject({
        method: 'GET',
        url: '/api/v1/foods/search?q=Muffin',
        headers: { 'x-user-id': 'usr_user_A' },
      });
      expect(searchResA.statusCode).toBe(200);
      const searchDataA = searchResA.json();
      expect(searchDataA.foods.some((f: { id: string }) => f.id === foodA.id)).toBe(true);

      // 3. Usuário B busca alimentos -> NÃO deve ver o Muffin do Usuário A (pois não foi validado)
      const searchResB = await app.inject({
        method: 'GET',
        url: '/api/v1/foods/search?q=Muffin',
        headers: { 'x-user-id': 'usr_user_B' },
      });
      expect(searchResB.statusCode).toBe(200);
      const searchDataB = searchResB.json();
      expect(searchDataB.foods.some((f: { id: string }) => f.id === foodA.id)).toBe(false);

      // 4. Usuário B tenta consultar por código de barras -> 404 (invisível para outros usuários)
      const barcodeResB = await app.inject({
        method: 'GET',
        url: `/api/v1/foods/barcode/${payloadA.barcode}`,
        headers: { 'x-user-id': 'usr_user_B' },
      });
      expect(barcodeResB.statusCode).toBe(404);

      // 5. Administrador valida as informações nutricionais do alimento
      const validateRes = await app.inject({
        method: 'PATCH',
        url: `/api/v1/foods/${foodA.id}/validate`,
        headers: { 'x-admin-token': 'admin-secret-token-key-us-central1' },
      });
      expect(validateRes.statusCode).toBe(200);
      expect(validateRes.json().food.isValidated).toBe(true);

      // 6. Agora o Usuário B deve conseguir ver o alimento validado
      const searchResBAfter = await app.inject({
        method: 'GET',
        url: '/api/v1/foods/search?q=Muffin',
        headers: { 'x-user-id': 'usr_user_B' },
      });
      expect(searchResBAfter.statusCode).toBe(200);
      const searchDataBAfter = searchResBAfter.json();
      expect(searchDataBAfter.foods.some((f: { id: string }) => f.id === foodA.id)).toBe(true);

      // E também pelo código de barras
      const barcodeResBAfter = await app.inject({
        method: 'GET',
        url: `/api/v1/foods/barcode/${payloadA.barcode}`,
        headers: { 'x-user-id': 'usr_user_B' },
      });
      expect(barcodeResBAfter.statusCode).toBe(200);
      expect(barcodeResBAfter.json().food.name).toBe(payloadA.name);
    });

    it('deve retornar 403 se o token de admin não for informado ou for inválido', async () => {
      const res = await app.inject({
        method: 'PATCH',
        url: '/api/v1/foods/food_123/validate',
        headers: { 'x-admin-token': 'wrong-token' },
      });
      expect(res.statusCode).toBe(403);
      expect(res.json().error).toBe('UNAUTHORIZED_ADMIN');
    });

    it('deve retornar 404 ao tentar validar alimento inexistente', async () => {
      const res = await app.inject({
        method: 'PATCH',
        url: '/api/v1/foods/non_existent_food/validate',
        headers: { 'x-admin-token': 'admin-secret-token-key-us-central1' },
      });
      expect(res.statusCode).toBe(404);
      expect(res.json().error).toBe('FOOD_NOT_FOUND');
    });
  });
});

