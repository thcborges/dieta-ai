import { describe, it, expect, beforeEach, vi } from 'vitest';
import fastify, { FastifyInstance } from 'fastify';
import { adminRoutes } from '../src/routes/admin.route.js';
import { tokenUsageService } from '../src/services/token-usage.service.js';
import { authService } from '../src/services/auth.service.js';

describe('Admin AI Token Usage Dashboard & Security Suite', () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    vi.restoreAllMocks();
    app = fastify();
    await app.register(adminRoutes);
    await app.ready();
  });

  it('deve rejeitar acesso com 401 se não houver autenticação', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/token-usage',
    });

    expect(res.statusCode).toBe(401);
    expect(res.json().error).toBe('UNAUTHORIZED');
  });

  it('deve rejeitar acesso com 403 se o usuário não for o admin thcborges@gmail.com', async () => {
    const commonUserToken = authService.createSessionToken({
      sub: 'usr_common_user',
      email: 'comum@example.com',
      name: 'Comum',
      isAdmin: false,
      blindUserId: authService.getBlindUserId('usr_common_user'),
    });

    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/token-usage',
      headers: {
        authorization: `Bearer ${commonUserToken}`,
      },
    });

    expect(res.statusCode).toBe(403);
    expect(res.json().error).toBe('UNAUTHORIZED_ADMIN');
  });

  it('deve liberar acesso com 200 para thcborges@gmail.com e retornar estrutura correta', async () => {
    const adminToken = authService.createSessionToken({
      sub: 'usr_thcborges_gmail_com',
      email: 'thcborges@gmail.com',
      name: 'Thiago Borges',
      isAdmin: true,
      blindUserId: authService.getBlindUserId('usr_thcborges_gmail_com'),
    });

    // Simula registros de uso
    vi.spyOn(tokenUsageService, 'getUsageStats').mockResolvedValueOnce({
      summary: {
        totalTokens: 1500,
        promptTokens: 1200,
        candidatesTokens: 300,
        estimatedCostUsd: 0.00018,
        avgTokensPhotoMeal: 1000,
        avgTokensFoodEstimate: 500,
        projectedMonthlyTokensPerUser: 45000,
        totalRequests: 2,
        totalPhotoRequests: 1,
        totalFoodEstimateRequests: 1,
      },
      dailySeries: [
        {
          date: '2026-11-16',
          totalTokens: 1500,
          photoTokens: 1000,
          foodEstimateTokens: 500,
          costUsd: 0.00018,
          requestsCount: 2,
        },
      ],
      userList: ['User_b12345'],
      startDate: '2026-11-01',
      endDate: '2026-11-16',
      selectedUserHash: undefined,
    });

    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/token-usage?startDate=2026-11-01&endDate=2026-11-16',
      headers: {
        authorization: `Bearer ${adminToken}`,
      },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.summary.totalTokens).toBe(1500);
    expect(body.summary.avgTokensPhotoMeal).toBe(1000);
    expect(body.summary.avgTokensFoodEstimate).toBe(500);
    expect(body.summary.projectedMonthlyTokensPerUser).toBe(45000);
    expect(body.userList).toContain('User_b12345');
    expect(body.dailySeries).toHaveLength(1);
  });

  it('deve calcular métricas, séries diárias e custos no TokenUsageService', async () => {
    // Teste direto de unidade do service
    const mockDb = {
      collection: vi.fn().mockReturnValue({
        doc: vi.fn().mockReturnValue({
          set: vi.fn().mockResolvedValue(undefined),
        }),
        get: vi.fn().mockResolvedValue({
          docs: [
            {
              id: 'tok_1',
              data: () => ({
                id: 'tok_1',
                blindUserId: 'blind_hash_alpha_123456789',
                feature: 'photo_meal',
                model: 'gemini-2.5-flash-image',
                promptTokens: 1000,
                candidatesTokens: 250,
                totalTokens: 1250,
                date: '2026-11-15',
                timestamp: '2026-11-15T12:00:00Z',
              }),
            },
            {
              id: 'tok_2',
              data: () => ({
                id: 'tok_2',
                blindUserId: 'blind_hash_alpha_123456789',
                feature: 'food_estimate',
                model: 'gemini-2.5-flash-image',
                promptTokens: 200,
                candidatesTokens: 50,
                totalTokens: 250,
                date: '2026-11-15',
                timestamp: '2026-11-15T14:00:00Z',
              }),
            },
            {
              id: 'tok_3',
              data: () => ({
                id: 'tok_3',
                blindUserId: 'blind_hash_beta_987654321',
                feature: 'photo_meal',
                model: 'gemini-2.5-flash-image',
                promptTokens: 800,
                candidatesTokens: 200,
                totalTokens: 1000,
                date: '2026-11-16',
                timestamp: '2026-11-16T10:00:00Z',
              }),
            },
          ],
        }),
      }),
    };

    tokenUsageService.setDb(mockDb as any);

    const stats = await tokenUsageService.getUsageStats({
      startDate: '2026-11-15',
      endDate: '2026-11-16',
    });

    expect(stats.summary.totalTokens).toBe(2500);
    expect(stats.summary.promptTokens).toBe(2000);
    expect(stats.summary.candidatesTokens).toBe(500);
    expect(stats.summary.totalRequests).toBe(3);
    expect(stats.summary.totalPhotoRequests).toBe(2);
    expect(stats.summary.totalFoodEstimateRequests).toBe(1);
    expect(stats.summary.avgTokensPhotoMeal).toBe(1125); // (1250 + 1000) / 2
    expect(stats.summary.avgTokensFoodEstimate).toBe(250); // 250 / 1
    expect(stats.userList.length).toBe(2);
    expect(stats.dailySeries.length).toBe(2);

    // Filtro por usuário anônimo
    const userHash = stats.userList[0];
    const userStats = await tokenUsageService.getUsageStats({
      startDate: '2026-11-15',
      endDate: '2026-11-16',
      userHash,
    });
    expect(userStats.summary.totalRequests).toBeLessThan(3);
  });

  it('deve desvincular blindUserId para purged_user ao solicitar expurgo LGPD', async () => {
    const updateMock = vi.fn().mockResolvedValue(undefined);
    const mockDb = {
      collection: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          get: vi.fn().mockResolvedValue({
            docs: [
              {
                ref: { update: updateMock },
                data: () => ({ blindUserId: 'target_blind_user' }),
              },
            ],
          }),
        }),
      }),
    };

    tokenUsageService.setDb(mockDb as any);
    const count = await tokenUsageService.anonymizeUserUsage('target_blind_user');

    expect(count).toBe(1);
    expect(updateMock).toHaveBeenCalledWith({
      blindUserId: 'purged_user',
      anonymizedAt: expect.any(String),
    });
  });

  it('deve garantir que thcborges@gmail.com é sempre reconhecido como admin por isEmailAdmin', () => {
    expect(authService.isEmailAdmin('thcborges@gmail.com')).toBe(true);
    expect(authService.isEmailAdmin('THCBORGES@GMAIL.COM')).toBe(true);
    expect(authService.isEmailAdmin('random@domain.com')).toBe(false);
  });

  it('deve registrar telemetria de tokens em VertexPhotoAnalysisService quando usageMetadata for retornado', async () => {
    const { VertexPhotoAnalysisService } = await import('../src/services/vertex-photo-analysis.service.js');
    const recordSpy = vi.spyOn(tokenUsageService, 'recordUsage').mockResolvedValue({} as any);

    const mockVertexAI = {
      getGenerativeModel: vi.fn().mockReturnValue({
        generateContent: vi.fn().mockResolvedValue({
          response: {
            candidates: [
              {
                content: {
                  parts: [
                    {
                      text: JSON.stringify({
                        isFoodIdentified: true,
                        feedbackMessage: 'Sucesso',
                        items: [],
                      }),
                    },
                  ],
                },
              },
            ],
            usageMetadata: {
              promptTokenCount: 650,
              candidatesTokenCount: 120,
              totalTokenCount: 770,
            },
          },
        }),
      }),
    };

    const service = new VertexPhotoAnalysisService({
      vertexAIClient: mockVertexAI as any,
    });

    await service.analyzeMealPhoto({
      imageBase64: 'fake-base64',
      mimeType: 'image/jpeg',
      blindUserId: 'blind_usr_test',
    });

    expect(recordSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        blindUserId: 'blind_usr_test',
        feature: 'photo_meal',
        promptTokens: 650,
        candidatesTokens: 120,
        totalTokens: 770,
      })
    );
  });

  it('deve registrar telemetria de tokens em VertexFoodEstimateService quando usageMetadata for retornado', async () => {
    const { VertexFoodEstimateService } = await import('../src/services/vertex-food-estimate.service.js');
    const recordSpy = vi.spyOn(tokenUsageService, 'recordUsage').mockResolvedValue({} as any);

    const mockVertexAI = {
      getGenerativeModel: vi.fn().mockReturnValue({
        generateContent: vi.fn().mockResolvedValue({
          response: {
            candidates: [
              {
                content: {
                  parts: [
                    {
                      text: JSON.stringify({
                        foodName: 'Frango Grelhado',
                        servingSizeGrams: 100,
                        caloriesPer100g: 165,
                        proteinPer100g: 31,
                        carbsPer100g: 0,
                        fatPer100g: 3.6,
                        confidence: 'high',
                      }),
                    },
                  ],
                },
              },
            ],
            usageMetadata: {
              promptTokenCount: 150,
              candidatesTokenCount: 45,
              totalTokenCount: 195,
            },
          },
        }),
      }),
    };

    const service = new VertexFoodEstimateService({
      vertexAIClient: mockVertexAI as any,
    });

    await service.estimateFoodNutrition({
      foodName: 'Frango Grelhado',
      blindUserId: 'blind_usr_test_food',
    });

    expect(recordSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        blindUserId: 'blind_usr_test_food',
        feature: 'food_estimate',
        promptTokens: 150,
        candidatesTokens: 45,
        totalTokens: 195,
      })
    );
  });

  it('deve cobrir branches de fallback em memória do TokenUsageService', async () => {
    const { TokenUsageService } = await import('../src/services/token-usage.service.js');
    const service = new TokenUsageService(); // firestore null

    expect(service.getAnonymousUserHash('')).toBe('User_anonymized');
    expect(service.getAnonymousUserHash('purged_user')).toBe('User_anonymized');

    // Gravação in-memory
    const rec1 = await service.recordUsage({
      blindUserId: 'buser_mem1',
      feature: 'photo_meal',
      model: 'gemini-2.5-flash-image',
      promptTokens: 100,
      candidatesTokens: 50,
      totalTokens: 150,
    });
    expect(rec1.id).toBeDefined();

    const rec2 = await service.recordUsage({
      blindUserId: 'buser_mem2',
      feature: 'food_estimate',
      model: 'gemini-2.5-flash-image',
      promptTokens: 80,
      candidatesTokens: 20,
      totalTokens: 100,
    });
    expect(rec2.id).toBeDefined();

    // Consulta in-memory
    const stats = await service.getUsageStats();
    expect(stats.summary.totalTokens).toBe(250);
    expect(stats.userList.length).toBe(2);

    // Anonymize in-memory
    const purgedCount = await service.anonymizeUserUsage('buser_mem1');
    expect(purgedCount).toBe(1);

    // Fallback de erro no Firestore
    const throwingDb = {
      collection: vi.fn().mockReturnValue({
        doc: vi.fn().mockReturnValue({
          set: vi.fn().mockRejectedValue(new Error('Firestore down')),
        }),
        get: vi.fn().mockRejectedValue(new Error('Firestore get failed')),
        where: vi.fn().mockReturnValue({
          get: vi.fn().mockRejectedValue(new Error('Firestore where failed')),
        }),
      }),
    };

    service.setDb(throwingDb as any);
    await service.recordUsage({
      blindUserId: 'buser_err',
      feature: 'photo_meal',
      model: 'test',
      promptTokens: 10,
      candidatesTokens: 10,
      totalTokens: 20,
    });

    const errorStats = await service.getUsageStats();
    expect(errorStats.summary.totalTokens).toBeGreaterThan(0);

    const errorAnonCount = await service.anonymizeUserUsage('buser_err');
    expect(errorAnonCount).toBe(1);
  });
});
