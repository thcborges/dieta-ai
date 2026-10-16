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
});
