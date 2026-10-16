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
});
