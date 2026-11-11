import { describe, it, expect, vi } from 'vitest';
import { VertexPhotoAnalysisService } from '../src/services/vertex-photo-analysis.service.js';

describe('VertexPhotoAnalysisService Unit Suite', () => {
  it('deve instanciar o serviço com valores padrão de região e modelo', () => {
    const service = new VertexPhotoAnalysisService();
    expect(service.getModelName()).toBe('gemini-1.5-flash-latest');
    expect(service.getRegion()).toBe('us-central1');
  });

  it('deve invocar o modelo Vertex AI com system instruction e formatar resposta estruturada', async () => {
    const mockGenerateContent = vi.fn().mockResolvedValue({
      response: {
        candidates: [
          {
            content: {
              parts: [
                {
                  text: JSON.stringify({
                    isFoodIdentified: true,
                    feedbackMessage: '2 itens detectados.',
                    items: [
                      {
                        name: 'Ovo Cozido',
                        estimatedGrams: 50,
                        confidence: 'high',
                        per100g: {
                          calories: 155,
                          protein: 13,
                          carbs: 1.1,
                          fat: 11,
                          fiber: 0,
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
    });

    const mockGenerativeModel = {
      generateContent: mockGenerateContent,
    };

    const mockVertexAI = {
      getGenerativeModel: vi.fn().mockReturnValue(mockGenerativeModel),
    };

    const service = new VertexPhotoAnalysisService({
      vertexAIClient: mockVertexAI as any,
      modelName: 'gemini-1.5-flash',
      region: 'us-central1',
      projectId: 'thcborges-dieta-ai-dev',
    });

    const result = await service.analyzeMealPhoto({
      imageBase64: 'abc12345',
      mimeType: 'image/jpeg',
      description: 'Café da manhã com ovo',
    });

    expect(result.isFoodIdentified).toBe(true);
    expect(result.items).toHaveLength(1);
    expect(result.items[0].name).toBe('Ovo Cozido');
    expect(result.items[0].estimatedGrams).toBe(50);
    expect(result.items[0].per100g.protein).toBe(13);
    expect(mockGenerateContent).toHaveBeenCalled();
  });

  it('deve retornar isFoodIdentified = false se a resposta do modelo indicar que não é alimento', async () => {
    const mockGenerateContent = vi.fn().mockResolvedValue({
      response: {
        candidates: [
          {
            content: {
              parts: [
                {
                  text: JSON.stringify({
                    isFoodIdentified: false,
                    feedbackMessage: 'A imagem contém apenas um teclado de computador.',
                    items: [],
                  }),
                },
              ],
            },
          },
        ],
      },
    });

    const mockGenerativeModel = { generateContent: mockGenerateContent };
    const mockVertexAI = { getGenerativeModel: vi.fn().mockReturnValue(mockGenerativeModel) };

    const service = new VertexPhotoAnalysisService({
      vertexAIClient: mockVertexAI as any,
    });

    const result = await service.analyzeMealPhoto({
      imageBase64: 'abc-teclado',
      mimeType: 'image/jpeg',
    });

    expect(result.isFoodIdentified).toBe(false);
    expect(result.items).toHaveLength(0);
    expect(result.feedbackMessage).toContain('teclado');
  });

  it('deve tratar resposta com markdown codefence (```json ... ```) de forma transparente', async () => {
    const jsonStr = JSON.stringify({
      isFoodIdentified: true,
      feedbackMessage: 'Sucesso',
      items: [
        {
          name: 'Banana Prata',
          estimatedGrams: 90,
          confidence: 'high',
          per100g: {
            calories: 98,
            protein: 1.3,
            carbs: 26,
            fat: 0.1,
            fiber: 2,
          },
        },
      ],
    });

    const mockGenerateContent = vi.fn().mockResolvedValue({
      response: {
        candidates: [
          {
            content: {
              parts: [
                {
                  text: `\`\`\`json\n${jsonStr}\n\`\`\``,
                },
              ],
            },
          },
        ],
      },
    });

    const mockGenerativeModel = { generateContent: mockGenerateContent };
    const mockVertexAI = { getGenerativeModel: vi.fn().mockReturnValue(mockGenerativeModel) };

    const service = new VertexPhotoAnalysisService({
      vertexAIClient: mockVertexAI as any,
    });

    const result = await service.analyzeMealPhoto({
      imageBase64: 'abc-banana',
      mimeType: 'image/png',
    });

    expect(result.isFoodIdentified).toBe(true);
    expect(result.items[0].name).toBe('Banana Prata');
  });

  it('deve lançar erro estruturado se o modelo retornar conteúdo ininteligível ou falhar', async () => {
    const mockGenerateContent = vi.fn().mockRejectedValue(new Error('Vertex AI Quota exceeded'));
    const mockGenerativeModel = { generateContent: mockGenerateContent };
    const mockVertexAI = { getGenerativeModel: vi.fn().mockReturnValue(mockGenerativeModel) };

    const service = new VertexPhotoAnalysisService({
      vertexAIClient: mockVertexAI as any,
    });

    await expect(
      service.analyzeMealPhoto({
        imageBase64: 'abc',
        mimeType: 'image/jpeg',
      })
    ).rejects.toThrow('Falha na análise da foto pelo Vertex AI: Vertex AI Quota exceeded');
  });
});
