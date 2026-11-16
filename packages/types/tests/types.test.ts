import { describe, it, expect } from 'vitest';
import type { TelemetryErrorEvent, SessionContextEvent, HealerJob } from '../src/index.js';

describe('Shared Types Package', () => {
  it('deve validar estrutura correta de TelemetryErrorEvent e SessionContextEvent', () => {
    const events: SessionContextEvent[] = [
      { type: 'NAVIGATE', timestamp: '2026-10-16T00:00:00Z', path: '/meals' },
      { type: 'ADD_FOOD', timestamp: '2026-10-16T00:00:01Z', payload: { foodId: 'sassami', grams: 200 } },
    ];

    const errorEvent: TelemetryErrorEvent = {
      errorId: 'err-test-123',
      timestamp: '2026-10-16T00:00:02Z',
      environment: 'development',
      message: 'Uncaught TypeError in MealBuilder',
      stack: 'TypeError: Cannot read properties of undefined',
      userId: 'user-xyz',
      recentEvents: events,
    };

    expect(errorEvent.errorId).toBe('err-test-123');
    expect(errorEvent.recentEvents).toHaveLength(2);
    expect(errorEvent.environment).toBe('development');
  });

  it('deve validar estrutura de HealerJob', () => {
    const job: HealerJob = {
      errorId: 'err-test-456',
      errorMessage: 'Database connection failed',
      recentEvents: [],
      environment: 'development',
      branchName: 'fix/err-test-456',
    };

    expect(job.branchName).toBe('fix/err-test-456');
    expect(job.environment).toBe('development');
  });

  it('deve validar estrutura de UserProfileDto e UserMacroTargetsDto com fibra', () => {
    const profile = {
      id: 'usr_123',
      email: 'user@example.com',
      name: 'João Silva',
      customMacros: {
        calories: 2200,
        proteinGrams: 200,
        carbGrams: 180,
        fatGrams: 60,
        fiberGrams: 38,
      },
    };

    expect(profile.customMacros.fiberGrams).toBe(38);
    expect(profile.id).toBe('usr_123');
  });

  it('deve validar estrutura de TokenUsageRecord e AdminTokenUsageResponse', () => {
    const record: import('../src/index.js').TokenUsageRecord = {
      id: 'tok_123',
      blindUserId: 'buser_abc',
      feature: 'photo_meal',
      model: 'gemini-2.5-flash-image',
      promptTokens: 800,
      candidatesTokens: 200,
      totalTokens: 1000,
      date: '2026-11-16',
      timestamp: '2026-11-16T17:00:00Z',
    };

    const response: import('../src/index.js').AdminTokenUsageResponse = {
      summary: {
        totalTokens: 1000,
        promptTokens: 800,
        candidatesTokens: 200,
        estimatedCostUsd: 0.00012,
        avgTokensPhotoMeal: 1000,
        avgTokensFoodEstimate: 0,
        projectedMonthlyTokensPerUser: 30000,
        totalRequests: 1,
        totalPhotoRequests: 1,
        totalFoodEstimateRequests: 0,
      },
      dailySeries: [
        {
          date: '2026-11-16',
          totalTokens: 1000,
          photoTokens: 1000,
          foodEstimateTokens: 0,
          costUsd: 0.00012,
          requestsCount: 1,
        },
      ],
      userList: ['User_abc123'],
      startDate: '2026-11-01',
      endDate: '2026-11-16',
      selectedUserHash: 'User_abc123',
    };

    expect(record.feature).toBe('photo_meal');
    expect(response.summary.totalTokens).toBe(1000);
    expect(response.userList).toContain('User_abc123');
  });
});
