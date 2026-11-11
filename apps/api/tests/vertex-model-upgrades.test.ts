import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { VertexFoodEstimateService } from '../src/services/vertex-food-estimate.service.js';
import { VertexPhotoAnalysisService } from '../src/services/vertex-photo-analysis.service.js';

describe('BDD & Regression: Upgrade dos Modelos Vertex AI Gemini Flash e Flash-Lite', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    delete process.env.VERTEX_AI_MODEL;
    delete process.env.VERTEX_AI_PHOTO_MODEL;
    delete process.env.VERTEX_AI_FOOD_ESTIMATE_MODEL;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  describe('VertexFoodEstimateService (Cadastro de Alimentos via Flash-Lite)', () => {
    it('deve adotar por padrão o modelo gemini flash-lite mais recente (gemini-2.5-flash-lite)', () => {
      const service = new VertexFoodEstimateService();
      expect(service.getModelName()).toBe('gemini-2.5-flash-lite');
    });

    it('deve priorizar a variável de ambiente VERTEX_AI_FOOD_ESTIMATE_MODEL quando definida', () => {
      process.env.VERTEX_AI_FOOD_ESTIMATE_MODEL = 'gemini-custom-flash-lite';
      const service = new VertexFoodEstimateService();
      expect(service.getModelName()).toBe('gemini-custom-flash-lite');
    });

    it('deve usar VERTEX_AI_MODEL como fallback caso VERTEX_AI_FOOD_ESTIMATE_MODEL não exista', () => {
      process.env.VERTEX_AI_MODEL = 'gemini-general-flash';
      const service = new VertexFoodEstimateService();
      expect(service.getModelName()).toBe('gemini-general-flash');
    });

    it('deve realizar fallback automático para gemini-2.0-flash-lite caso o modelo primário retorne 404 NOT_FOUND', async () => {
      const mockPrimaryModel = {
        generateContent: vi.fn().mockRejectedValue({
          message: 'Publisher model `projects/.../models/gemini-2.5-flash-lite` was not found or your project does not have access to it.',
          status: 404,
        }),
      };

      const mockFallbackModel = {
        generateContent: vi.fn().mockResolvedValue({
          response: {
            candidates: [
              {
                content: {
                  parts: [
                    {
                      text: JSON.stringify({
                        foodName: 'Ovo Poché',
                        servingSizeGrams: 50,
                        caloriesPer100g: 143,
                        proteinPer100g: 12.6,
                        carbsPer100g: 0.8,
                        fatPer100g: 9.5,
                        fiberPer100g: 0,
                        confidence: 'high',
                        sourceNote: 'Fallback 2.0 bem sucedido',
                      }),
                    },
                  ],
                },
              },
            ],
          },
        }),
      };

      const mockVertexAI = {
        getGenerativeModel: vi.fn().mockImplementation(({ model }: { model: string }) => {
          if (model === 'gemini-2.5-flash-lite') return mockPrimaryModel;
          return mockFallbackModel;
        }),
      };

      const service = new VertexFoodEstimateService({
        vertexAIClient: mockVertexAI as any,
      });

      const result = await service.estimateFoodNutrition({ foodName: 'Ovo Poché' });
      expect(result.foodName).toBe('Ovo Poché');
      expect(result.caloriesPer100g).toBe(143);
      expect(mockVertexAI.getGenerativeModel).toHaveBeenCalledWith(
        expect.objectContaining({ model: 'gemini-2.5-flash-lite' })
      );
      expect(mockVertexAI.getGenerativeModel).toHaveBeenCalledWith(
        expect.objectContaining({ model: 'gemini-2.0-flash-lite' })
      );
    });
  });

  describe('VertexPhotoAnalysisService (Processamento de Fotos de Refeição via Flash)', () => {
    it('deve adotar por padrão a versão mais recente do gemini flash (gemini-2.5-flash)', () => {
      const service = new VertexPhotoAnalysisService();
      expect(service.getModelName()).toBe('gemini-2.5-flash');
    });

    it('deve priorizar a variável de ambiente VERTEX_AI_PHOTO_MODEL quando definida', () => {
      process.env.VERTEX_AI_PHOTO_MODEL = 'gemini-custom-flash';
      const service = new VertexPhotoAnalysisService();
      expect(service.getModelName()).toBe('gemini-custom-flash');
    });

    it('deve usar VERTEX_AI_MODEL como fallback caso VERTEX_AI_PHOTO_MODEL não exista', () => {
      process.env.VERTEX_AI_MODEL = 'gemini-general-flash';
      const service = new VertexPhotoAnalysisService();
      expect(service.getModelName()).toBe('gemini-general-flash');
    });

    it('deve realizar fallback automático para gemini-2.0-flash caso o modelo primário retorne 404 NOT_FOUND', async () => {
      const mockPrimaryModel = {
        generateContent: vi.fn().mockRejectedValue({
          message: 'Publisher model `projects/.../models/gemini-2.5-flash` was not found or your project does not have access to it.',
          status: 404,
        }),
      };

      const mockFallbackModel = {
        generateContent: vi.fn().mockResolvedValue({
          response: {
            candidates: [
              {
                content: {
                  parts: [
                    {
                      text: JSON.stringify({
                        isFoodIdentified: true,
                        feedbackMessage: '1 item identificado.',
                        items: [
                          {
                            name: 'Arroz Branco',
                            estimatedGrams: 150,
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
                      }),
                    },
                  ],
                },
              },
            ],
          },
        }),
      };

      const mockVertexAI = {
        getGenerativeModel: vi.fn().mockImplementation(({ model }: { model: string }) => {
          if (model === 'gemini-2.5-flash') return mockPrimaryModel;
          return mockFallbackModel;
        }),
      };

      const service = new VertexPhotoAnalysisService({
        vertexAIClient: mockVertexAI as any,
      });

      const result = await service.analyzeMealPhoto({
        imageBase64: 'data:image/jpeg;base64,12345',
        mimeType: 'image/jpeg',
      });

      expect(result.isFoodIdentified).toBe(true);
      expect(result.items[0].name).toBe('Arroz Branco');
      expect(mockVertexAI.getGenerativeModel).toHaveBeenCalledWith(
        expect.objectContaining({ model: 'gemini-2.5-flash' })
      );
      expect(mockVertexAI.getGenerativeModel).toHaveBeenCalledWith(
        expect.objectContaining({ model: 'gemini-2.0-flash' })
      );
    });
  });
});
