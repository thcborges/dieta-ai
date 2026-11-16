import { describe, it, expect } from 'vitest';
import type { TokenUsageRecord, AdminTokenUsageResponse, AIFeatureType } from '../src/token-usage.js';

describe('Token Usage Types & Contracts (@dieta-ai/core)', () => {
  it('deve validar tipos e propriedades de TokenUsageRecord', () => {
    const feature: AIFeatureType = 'photo_meal';
    const record: TokenUsageRecord = {
      id: 'tok_001',
      blindUserId: 'buser_123',
      feature,
      model: 'gemini-2.5-flash-image',
      promptTokens: 500,
      candidatesTokens: 100,
      totalTokens: 600,
      date: '2026-11-16',
      timestamp: '2026-11-16T12:00:00Z',
    };

    expect(record.feature).toBe('photo_meal');
    expect(record.totalTokens).toBe(600);
  });

  it('deve validar estrutura de resposta do AdminTokenUsageResponse', () => {
    const res: AdminTokenUsageResponse = {
      summary: {
        totalTokens: 2000,
        promptTokens: 1500,
        candidatesTokens: 500,
        estimatedCostUsd: 0.00026,
        avgTokensPhotoMeal: 1200,
        avgTokensFoodEstimate: 400,
        projectedMonthlyTokensPerUser: 60000,
        totalRequests: 2,
        totalPhotoRequests: 1,
        totalFoodEstimateRequests: 1,
      },
      dailySeries: [],
      userList: ['User_abc'],
      startDate: '2026-11-01',
      endDate: '2026-11-16',
    };

    expect(res.summary.totalTokens).toBe(2000);
    expect(res.userList).toContain('User_abc');
  });
});
