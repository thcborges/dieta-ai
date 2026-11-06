import { describe, it, expect, vi, beforeEach } from 'vitest';
import Fastify from 'fastify';
import { photoAnalysisRoutes } from '../src/routes/photo-analysis.route.js';
import {
  VertexPhotoAnalysisService,
  type PhotoAnalysisResult,
} from '../src/services/vertex-photo-analysis.service.js';
import { recalculateMealItem } from '../src/services/macro-recalculation.service.js';
import { authService } from '../src/services/auth.service.js';

describe('Photo Meal Analysis via Vertex AI & Zero-Trust Audit Suite', () => {
  let app: ReturnType<typeof Fastify>;
  let mockAnalysisService: {
    analyzeMealPhoto: ReturnType<typeof vi.fn>;
  };

  let validAuthHeader: { authorization: string };

  beforeEach(async () => {
    mockAnalysisService = {
      analyzeMealPhoto: vi.fn(),
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

    await app.register(photoAnalysisRoutes, {
      photoAnalysisService: mockAnalysisService as unknown as VertexPhotoAnalysisService,
    });
    await app.ready();
  });

  it('deve retornar erro 401 se a requisição não for autenticada', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/meals/analyze-photo',
      payload: {
        imageBase64: 'dGVzdGU=',
        mimeType: 'image/jpeg',
      },
    });

    expect(response.statusCode).toBe(401);
    expect(response.json().error).toBe('UNAUTHORIZED');
  });

  it('deve rejeitar payload inválido sem imagem ou com formato inválido (400 Bad Request)', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/meals/analyze-photo',
      headers: validAuthHeader,
      payload: {
        mimeType: 'application/pdf', // Formato não suportado
      },
    });

    expect(response.statusCode).toBe(400);
    const body = response.json();
    expect(body.error).toBe('INVALID_PAYLOAD');
  });

  it('deve analisar imagem com sucesso e retornar itens estruturados com porção e densidade per100g', async () => {
    const expectedResult: PhotoAnalysisResult = {
      isFoodIdentified: true,
      feedbackMessage: 'Alimentos identificados com sucesso.',
      items: [
        {
          name: 'Filé de Frango Grelhado',
          estimatedGrams: 160,
          confidence: 'high',
          per100g: {
            calories: 159,
            protein: 32,
            carbs: 0,
            fat: 3.2,
            fiber: 0,
          },
        },
        {
          name: 'Arroz Branco Cozido',
          estimatedGrams: 130,
          confidence: 'high',
          per100g: {
            calories: 130,
            protein: 2.7,
            carbs: 28.2,
            fat: 0.3,
            fiber: 0.4,
          },
        },
      ],
    };

    mockAnalysisService.analyzeMealPhoto.mockResolvedValueOnce(expectedResult);

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/meals/analyze-photo',
      headers: validAuthHeader,
      payload: {
        imageBase64: 'base64-image-string-test',
        mimeType: 'image/jpeg',
        description: 'Frango com arroz',
      },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json() as PhotoAnalysisResult;
    expect(body.isFoodIdentified).toBe(true);
    expect(body.items).toHaveLength(2);
    expect(body.items[0].name).toBe('Filé de Frango Grelhado');
    expect(body.items[0].estimatedGrams).toBe(160);
    expect(body.items[0].per100g.protein).toBe(32);
    expect(mockAnalysisService.analyzeMealPhoto).toHaveBeenCalledWith(
      expect.objectContaining({
        imageBase64: 'base64-image-string-test',
        mimeType: 'image/jpeg',
        description: 'Frango com arroz',
      })
    );
  });

  it('deve retornar feedback amigável quando a IA não identificar nenhum alimento na imagem (isFoodIdentified: false)', async () => {
    mockAnalysisService.analyzeMealPhoto.mockResolvedValueOnce({
      isFoodIdentified: false,
      feedbackMessage: 'Nenhum alimento foi identificado com clareza na foto.',
      items: [],
    });

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/meals/analyze-photo',
      headers: validAuthHeader,
      payload: {
        imageBase64: 'foto-de-uma-mesa-vazia',
        mimeType: 'image/jpeg',
      },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json() as PhotoAnalysisResult;
    expect(body.isFoodIdentified).toBe(false);
    expect(body.items).toHaveLength(0);
    expect(body.feedbackMessage).toContain('Nenhum alimento');
  });

  it('deve incorporar clarificationNote e observações quando houver incerteza sobre método de preparo', async () => {
    mockAnalysisService.analyzeMealPhoto.mockResolvedValueOnce({
      isFoodIdentified: true,
      feedbackMessage: 'Alimentos identificados com observações de preparo.',
      items: [
        {
          name: 'Carne Vermelha Moída',
          estimatedGrams: 150,
          confidence: 'low',
          clarificationNote:
            'Não foi possível confirmar se a carne possui refogado com óleo abundante ou se é magra (patinho). Estimado teor médio de gordura.',
          per100g: {
            calories: 215,
            protein: 26,
            carbs: 0,
            fat: 12,
            fiber: 0,
          },
        },
      ],
    });

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/meals/analyze-photo',
      headers: validAuthHeader,
      payload: {
        imageBase64: 'foto-carne-moida',
        mimeType: 'image/png',
      },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json() as PhotoAnalysisResult;
    expect(body.items[0].clarificationNote).toBeDefined();
    expect(body.items[0].confidence).toBe('low');
  });

  it('deve auditar e recalcular os macros no servidor via macro-recalculation.service para itens photo_ai', () => {
    // Zero-Trust: o cliente envia gramas customizadas e a densidade per100g fornecida pelo Gemini
    const itemInput = {
      foodId: 'photo_ai_frango_123',
      name: 'Peito de Frango Grelhado',
      grams: 200, // Usuário alterou de 150 para 200g
      // Tentativa de fraude/erro de cálculo do cliente: cliente enviou macros errados
      calories: 999,
      protein: 10,
      carbs: 50,
      fat: 0,
      per100g: {
        calories: 160,
        protein: 32,
        carbs: 0,
        fat: 3,
        fiber: 0,
      },
    };

    const audited = recalculateMealItem(itemInput);

    // O servidor recalcula com base na densidade per100g real para 200g (ratio = 2):
    // calories = 160 * 2 = 320
    // protein = 32 * 2 = 64
    // carbs = 0 * 2 = 0
    // fat = 3 * 2 = 6
    expect(audited.grams).toBe(200);
    expect(audited.calories).toBe(320);
    expect(audited.protein).toBe(64);
    expect(audited.carbs).toBe(0);
    expect(audited.fat).toBe(6);
  });
});
