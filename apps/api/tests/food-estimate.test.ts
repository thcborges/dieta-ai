import { describe, it, expect, vi, beforeEach } from 'vitest';
import Fastify from 'fastify';
import {
  VertexFoodEstimateService,
  FOOD_ESTIMATE_SYSTEM_INSTRUCTION,
} from '../src/services/vertex-food-estimate.service.js';
import { foodRoutes } from '../src/routes/foods.route.js';
import { authService } from '../src/services/auth.service.js';

describe('VertexFoodEstimateService Unit Suite', () => {
  it('deve instanciar o serviço com valores padrão de região e modelo', () => {
    const service = new VertexFoodEstimateService();
    expect(service.getModelName()).toBe('gemini-1.5-flash');
    expect(service.getRegion()).toBe('us-central1');
  });

  it('deve invocar o modelo Vertex AI com system instruction do macro-metrics-estimativa e formatar resposta estruturada', async () => {
    const mockGenerateContent = vi.fn().mockResolvedValue({
      response: {
        candidates: [
          {
            content: {
              parts: [
                {
                  text: JSON.stringify({
                    foodName: 'Iogurte Grego Natural',
                    servingSizeGrams: 100,
                    caloriesPer100g: 110,
                    proteinPer100g: 7.0,
                    carbsPer100g: 4.5,
                    fatPer100g: 7.0,
                    fiberPer100g: 0,
                    confidence: 'high',
                    sourceNote: 'Estimativa baseada na tabela TACO/IBGE para 100g.',
                  }),
                },
              ],
            },
          },
        ],
      },
    });

    const mockGenerativeModel = {
      generateContent: mockGenerateContent,
    };

    const mockVertexAI = {
      getGenerativeModel: vi.fn().mockReturnValue(mockGenerativeModel),
    };

    const service = new VertexFoodEstimateService({
      vertexAIClient: mockVertexAI as any,
      modelName: 'gemini-1.5-flash',
      region: 'us-central1',
      projectId: 'thcborges-dieta-ai-dev',
    });

    const result = await service.estimateFoodNutrition({
      foodName: 'Iogurte Grego Natural',
      portionGrams: 100,
    });

    expect(mockVertexAI.getGenerativeModel).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'gemini-1.5-flash',
        systemInstruction: FOOD_ESTIMATE_SYSTEM_INSTRUCTION,
      })
    );

    expect(result.foodName).toBe('Iogurte Grego Natural');
    expect(result.caloriesPer100g).toBe(110);
    expect(result.proteinPer100g).toBe(7);
    expect(result.carbsPer100g).toBe(4.5);
    expect(result.fatPer100g).toBe(7);
    expect(result.fiberPer100g).toBe(0);
    expect(result.servingSizeGrams).toBe(100);
  });

  it('deve lançar erro descritivo quando a resposta do Vertex AI falhar', async () => {
    const mockGenerativeModel = {
      generateContent: vi.fn().mockRejectedValue(new Error('Vertex AI Quota exceeded')),
    };
    const mockVertexAI = {
      getGenerativeModel: vi.fn().mockReturnValue(mockGenerativeModel),
    };

    const service = new VertexFoodEstimateService({
      vertexAIClient: mockVertexAI as any,
    });

    await expect(
      service.estimateFoodNutrition({ foodName: 'Alimento Inexistente' })
    ).rejects.toThrow(/Falha na estimativa nutricional pelo Vertex AI/i);
  });
});

describe('POST /api/v1/foods/estimate-ai Integration Route Suite', () => {
  let app: ReturnType<typeof Fastify>;
  let mockEstimateService: {
    estimateFoodNutrition: ReturnType<typeof vi.fn>;
  };
  let validAuthHeader: { authorization: string };

  beforeEach(async () => {
    mockEstimateService = {
      estimateFoodNutrition: vi.fn(),
    };

    const sessionToken = authService.createSessionToken({
      sub: 'test-user-123',
      blindUserId: 'blind-123',
      email: 'user@example.com',
      name: 'Test User',
      isAdmin: false,
    });
    validAuthHeader = { authorization: `Bearer ${sessionToken}` };

    app = Fastify({ logger: false });
    await app.register(foodRoutes, {
      foodEstimateService: mockEstimateService as unknown as VertexFoodEstimateService,
    });
    await app.ready();
  });

  it('deve retornar 401 se a requisição não contiver cabeçalho de autenticação', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/foods/estimate-ai',
      payload: { foodName: 'Frango Grelhado' },
    });

    expect(res.statusCode).toBe(401);
  });

  it('deve retornar 400 se o nome do alimento não for informado', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/foods/estimate-ai',
      headers: validAuthHeader,
      payload: { foodName: '   ' },
    });

    expect(res.statusCode).toBe(400);
    expect(res.json().error).toBe('INVALID_PAYLOAD');
  });

  it('deve retornar 200 com a estimativa nutricional calculada pelo modelo', async () => {
    mockEstimateService.estimateFoodNutrition.mockResolvedValue({
      foodName: 'Filé de Tilápia Grelhado',
      servingSizeGrams: 150,
      caloriesPer100g: 128,
      proteinPer100g: 26.0,
      carbsPer100g: 0,
      fatPer100g: 2.7,
      fiberPer100g: 0,
      confidence: 'high',
      sourceNote: 'TACO/USDA',
    });

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/foods/estimate-ai',
      headers: validAuthHeader,
      payload: { foodName: 'Filé de Tilápia Grelhado', portionGrams: 150 },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.foodName).toBe('Filé de Tilápia Grelhado');
    expect(body.proteinPer100g).toBe(26);
    expect(body.servingSizeGrams).toBe(150);
  });
});
