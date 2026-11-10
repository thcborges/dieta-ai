import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import { buildApp } from '../src/app.js';
import type { FastifyInstance } from 'fastify';
import type { VertexPhotoAnalysisService } from '../src/services/vertex-photo-analysis.service.js';

describe('API Photo Analysis Body Limit & Auth Regression', () => {
  let app: FastifyInstance;

  const mockPhotoService = {
    analyzeMealPhoto: vi.fn().mockResolvedValue({
      isFoodIdentified: true,
      items: [
        {
          id: 'item_1',
          name: 'Arroz Branco',
          estimatedGrams: 150,
          confidence: 'high',
          per100g: { calories: 130, protein: 2.6, carbs: 28, fat: 0.3, fiber: 0.4 },
        },
      ],
      totalMealMacros: { calories: 195, protein: 3.9, carbs: 42, fat: 0.45, fiber: 0.6 },
    }),
  } as unknown as VertexPhotoAnalysisService;

  beforeAll(async () => {
    process.env.SESSION_SECRET = 'test-session-secret-key-32chars!!';
    process.env.LGPD_SECRET_PEPPER = 'test-blind-index-pepper-32chars!!';

    app = await buildApp({ photoAnalysisService: mockPhotoService });
  });

  afterAll(async () => {
    await app.close();
  });

  it('deve aceitar payload de imagem maior que 1MB (ex: 2.5MB) sem retornar 413 Request body is too large', async () => {
    // Cria string base64 simulando imagem de 2.5MB (~2.600.000 caracteres)
    const largeBase64 = 'data:image/jpeg;base64,' + 'A'.repeat(2500000);

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/meals/analyze-photo',
      headers: {
        'content-type': 'application/json',
        'x-user-id': 'usr_test_large_photo',
      },
      payload: {
        imageBase64: largeBase64,
        mimeType: 'image/jpeg',
      },
    });

    // Não deve retornar 413 Payload Too Large
    expect(res.statusCode).not.toBe(413);
    expect(res.json()).not.toHaveProperty('code', 'FST_ERR_CTP_BODY_TOO_LARGE');
  });
});
