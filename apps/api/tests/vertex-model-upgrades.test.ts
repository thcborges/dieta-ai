import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  VertexFoodEstimateService,
  DEFAULT_FOOD_ESTIMATE_MODEL,
  FALLBACK_FOOD_ESTIMATE_MODELS,
} from '../src/services/vertex-food-estimate.service.js';
import {
  VertexPhotoAnalysisService,
  DEFAULT_PHOTO_ANALYSIS_MODEL,
  FALLBACK_PHOTO_ANALYSIS_MODELS,
} from '../src/services/vertex-photo-analysis.service.js';

describe('BDD & Regression: Catálogo de Modelos Vertex AI com Fallbacks Automáticos', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    delete process.env.VERTEX_AI_MODEL;
    delete process.env.VERTEX_AI_PHOTO_MODEL;
    delete process.env.VERTEX_AI_FOOD_ESTIMATE_MODEL;
    delete process.env.VERTEX_AI_FALLBACK_MODELS;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  describe('VertexFoodEstimateService (Cadastro de Alimentos)', () => {
    it('deve adotar por padrão o modelo estável gemini-1.5-flash', () => {
      const service = new VertexFoodEstimateService();
      expect(service.getModelName()).toBe(DEFAULT_FOOD_ESTIMATE_MODEL);
      expect(service.getModelName()).toBe('gemini-1.5-flash');
      expect(service.getFallbackModels()).toEqual(FALLBACK_FOOD_ESTIMATE_MODELS);
    });

    it('deve priorizar a variável de ambiente VERTEX_AI_FOOD_ESTIMATE_MODEL quando definida', () => {
      process.env.VERTEX_AI_FOOD_ESTIMATE_MODEL = 'gemini-custom-flash';
      const service = new VertexFoodEstimateService();
      expect(service.getModelName()).toBe('gemini-custom-flash');
    });

    it('deve usar VERTEX_AI_MODEL como fallback caso VERTEX_AI_FOOD_ESTIMATE_MODEL não exista', () => {
      process.env.VERTEX_AI_MODEL = 'gemini-env-flash';
      const service = new VertexFoodEstimateService();
      expect(service.getModelName()).toBe('gemini-env-flash');
    });

    it('deve carregar VERTEX_AI_FALLBACK_MODELS da variável de ambiente quando definida', () => {
      process.env.VERTEX_AI_FALLBACK_MODELS = 'gemini-custom-1, gemini-custom-2';
      const service = new VertexFoodEstimateService();
      expect(service.getFallbackModels()).toEqual(['gemini-custom-1', 'gemini-custom-2']);
    });

    it('deve executar fallback automático caso o modelo primário retorne 404', async () => {
      const mockPrimaryModel = {
        generateContent: vi.fn().mockRejectedValue({
          message: 'Publisher model `projects/.../models/gemini-custom-flash` was not found or your project does not have access to it.',
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
                        sourceNote: 'Fallback bem sucedido',
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
          if (model === 'gemini-custom-flash') return mockPrimaryModel;
          return mockFallbackModel;
        }),
      };

      const service = new VertexFoodEstimateService({
        vertexAIClient: mockVertexAI as any,
        modelName: 'gemini-custom-flash',
      });

      const result = await service.estimateFoodNutrition({ foodName: 'Ovo Poché' });
      expect(result.foodName).toBe('Ovo Poché');
      expect(result.caloriesPer100g).toBe(143);
      expect(mockVertexAI.getGenerativeModel).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'gemini-custom-flash',
          generationConfig: expect.objectContaining({ maxOutputTokens: 150 }),
        })
      );
      expect(mockVertexAI.getGenerativeModel).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'gemini-1.5-flash-002',
          generationConfig: expect.objectContaining({ maxOutputTokens: 150 }),
        })
      );
    });
  });

  describe('VertexPhotoAnalysisService (Fotos de Refeição)', () => {
    it('deve adotar por padrão o modelo estável gemini-1.5-flash', () => {
      const service = new VertexPhotoAnalysisService();
      expect(service.getModelName()).toBe(DEFAULT_PHOTO_ANALYSIS_MODEL);
      expect(service.getModelName()).toBe('gemini-1.5-flash');
      expect(service.getFallbackModels()).toEqual(FALLBACK_PHOTO_ANALYSIS_MODELS);
    });

    it('deve priorizar a variável de ambiente VERTEX_AI_PHOTO_MODEL quando definida', () => {
      process.env.VERTEX_AI_PHOTO_MODEL = 'gemini-custom-photo-flash';
      const service = new VertexPhotoAnalysisService();
      expect(service.getModelName()).toBe('gemini-custom-photo-flash');
    });

    it('deve usar VERTEX_AI_MODEL como fallback caso VERTEX_AI_PHOTO_MODEL não exista', () => {
      process.env.VERTEX_AI_MODEL = 'gemini-env-photo-flash';
      const service = new VertexPhotoAnalysisService();
      expect(service.getModelName()).toBe('gemini-env-photo-flash');
    });

    it('deve carregar VERTEX_AI_FALLBACK_MODELS da variável de ambiente quando definida', () => {
      process.env.VERTEX_AI_FALLBACK_MODELS = 'gemini-photo-fb1, gemini-photo-fb2';
      const service = new VertexPhotoAnalysisService();
      expect(service.getFallbackModels()).toEqual(['gemini-photo-fb1', 'gemini-photo-fb2']);
    });

    it('deve executar fallback automático caso o modelo primário retorne 404', async () => {
      const mockPrimaryModel = {
        generateContent: vi.fn().mockRejectedValue({
          message: 'Publisher model `projects/.../models/gemini-custom-photo-flash` was not found or your project does not have access to it.',
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
          if (model === 'gemini-custom-photo-flash') return mockPrimaryModel;
          return mockFallbackModel;
        }),
      };

      const service = new VertexPhotoAnalysisService({
        vertexAIClient: mockVertexAI as any,
        modelName: 'gemini-custom-photo-flash',
      });

      const result = await service.analyzeMealPhoto({
        imageBase64: 'data:image/jpeg;base64,12345',
        mimeType: 'image/jpeg',
      });

      expect(result.isFoodIdentified).toBe(true);
      expect(result.items[0].name).toBe('Arroz Branco');
      expect(mockVertexAI.getGenerativeModel).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'gemini-custom-photo-flash',
          generationConfig: expect.objectContaining({ maxOutputTokens: 150 }),
        })
      );
      expect(mockVertexAI.getGenerativeModel).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'gemini-1.5-flash-002',
          generationConfig: expect.objectContaining({ maxOutputTokens: 150 }),
        })
      );
    });
  });
});
