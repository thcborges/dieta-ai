import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  VertexFoodEstimateService,
  DEFAULT_FOOD_ESTIMATE_MODEL,
} from '../src/services/vertex-food-estimate.service.js';
import {
  VertexPhotoAnalysisService,
  DEFAULT_PHOTO_ANALYSIS_MODEL,
} from '../src/services/vertex-photo-analysis.service.js';

describe('BDD & Regression: Invocação Direta do Vertex AI sem Try/Catch', () => {
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
    it('deve adotar por padrão o modelo gemini-2.5-flash-image', () => {
      const service = new VertexFoodEstimateService();
      expect(service.getModelName()).toBe(DEFAULT_FOOD_ESTIMATE_MODEL);
      expect(service.getModelName()).toBe('gemini-2.5-flash-image');
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

    it('deve executar chamada direta ao modelo configurado e propagar o erro original na íntegra (sem try/catch)', async () => {
      const originalError = new Error('Original Vertex AI Error: 404 Model Not Found or Project Access Denied');
      (originalError as any).status = 404;

      const mockGenerativeModel = {
        generateContent: vi.fn().mockRejectedValue(originalError),
      };

      const mockVertexAI = {
        getGenerativeModel: vi.fn().mockReturnValue(mockGenerativeModel),
      };

      const service = new VertexFoodEstimateService({
        vertexAIClient: mockVertexAI as any,
        modelName: 'gemini-2.5-flash-image',
      });

      await expect(
        service.estimateFoodNutrition({ foodName: 'Ovo Poché' })
      ).rejects.toThrow('Original Vertex AI Error: 404 Model Not Found or Project Access Denied');

      expect(mockVertexAI.getGenerativeModel).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'gemini-2.5-flash-image',
          generationConfig: expect.objectContaining({ maxOutputTokens: 250 }),
        })
      );
    });
  });

  describe('VertexPhotoAnalysisService (Fotos de Refeição)', () => {
    it('deve adotar por padrão o modelo gemini-2.5-flash-image', () => {
      const service = new VertexPhotoAnalysisService();
      expect(service.getModelName()).toBe(DEFAULT_PHOTO_ANALYSIS_MODEL);
      expect(service.getModelName()).toBe('gemini-2.5-flash-image');
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

    it('deve executar chamada direta ao modelo configurado e propagar o erro original na íntegra (sem try/catch)', async () => {
      const originalError = new Error('Original Vertex AI Photo Error: 404 Location us-central1 not accessible');
      (originalError as any).status = 404;

      const mockGenerativeModel = {
        generateContent: vi.fn().mockRejectedValue(originalError),
      };

      const mockVertexAI = {
        getGenerativeModel: vi.fn().mockReturnValue(mockGenerativeModel),
      };

      const service = new VertexPhotoAnalysisService({
        vertexAIClient: mockVertexAI as any,
        modelName: 'gemini-2.5-flash-image',
      });

      await expect(
        service.analyzeMealPhoto({
          imageBase64: 'data:image/jpeg;base64,12345',
          mimeType: 'image/jpeg',
        })
      ).rejects.toThrow('Original Vertex AI Photo Error: 404 Location us-central1 not accessible');

      expect(mockVertexAI.getGenerativeModel).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'gemini-2.5-flash-image',
          generationConfig: expect.objectContaining({ maxOutputTokens: 1000 }),
        })
      );
    });
  });
});
