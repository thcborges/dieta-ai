import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AgyRunnerService } from '../src/services/agy-runner.service.js';
import type { TelemetryErrorEvent } from '@dieta-ai/types';

describe('AgyRunnerService (Pipeline de Auto-Cura com Antigravity CLI e GitHub PR)', () => {
  const dummyEvent: TelemetryErrorEvent = {
    errorId: 'err-test-xyz99',
    timestamp: '2026-10-16T00:00:00.000Z',
    environment: 'development',
    message: 'Division by zero in calculateDailyDeficit',
    stack: 'Error: Division by zero\n    at calculateDailyDeficit (auditor.ts:12)',
    recentEvents: [
      { type: 'LOGIN_GOOGLE', timestamp: '2026-10-16T23:50:00.000Z' },
      { type: 'LOAD_BIOMETRICS', timestamp: '2026-10-16T23:51:00.000Z' },
      { type: 'CALCULATE_DEFICIT', timestamp: '2026-10-16T23:52:00.000Z', payload: { maintenanceCalories: 0 } },
    ],
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('deve gerar o prompt com regras estritas: BDD regression test, >= 90% coverage e contexto dos eventos', () => {
    const service = new AgyRunnerService();
    const prompt = service.buildAgyPrompt(dummyEvent);

    expect(prompt).toContain('Erro detectado em runtime');
    expect(prompt).toContain('Division by zero in calculateDailyDeficit');
    expect(prompt).toContain('err-test-xyz99');
    expect(prompt).toContain('BDD (Behavior Driven Development)');
    expect(prompt).toContain('teste de regressão');
    expect(prompt).toContain('>= 90%');
    expect(prompt).toContain('Contexto dos últimos eventos da sessão:');
    expect(prompt).toContain('[CALCULATE_DEFICIT]');
  });

  it('deve orquestrar a execução do AGY: criar branch a partir da main, rodar agy e criar PR via gh cli', async () => {
    const executedCommands: string[] = [];
    const mockExecutor = vi.fn().mockImplementation(async (cmd: string) => {
      executedCommands.push(cmd);
      if (cmd.includes('gh pr create')) {
        return { stdout: 'https://github.com/thcborges/dieta-ai/pull/123\n', stderr: '', exitCode: 0 };
      }
      return { stdout: 'Success', stderr: '', exitCode: 0 };
    });

    const service = new AgyRunnerService({
      commandExecutor: mockExecutor,
      agyPath: 'agy',
      ghPath: 'gh',
    });

    const result = await service.heal(dummyEvent);

    expect(result.success).toBe(true);
    expect(result.branchName).toBe('fix/err-test-xyz99');
    expect(result.pullRequestUrl).toBe('https://github.com/thcborges/dieta-ai/pull/123');

    // Verifica se os passos mandatórios foram executados
    // 1. Branch criada a partir da main
    const branchCmd = executedCommands.find(c => c.includes('git checkout -b fix/err-test-xyz99 main'));
    expect(branchCmd).toBeDefined();

    // 2. Invocação do agy com prompt de autocura
    const agyCmd = executedCommands.find(c => c.includes('agy'));
    expect(agyCmd).toBeDefined();

    // 3. Push para origin
    const pushCmd = executedCommands.find(c => c.includes('git push origin fix/err-test-xyz99'));
    expect(pushCmd).toBeDefined();

    // 4. Criação do PR via gh CLI
    const prCmd = executedCommands.find(c => c.includes('gh pr create'));
    expect(prCmd).toBeDefined();
    expect(prCmd).toContain('--base main');
    expect(prCmd).toContain('--head fix/err-test-xyz99');
  });

  it('deve capturar e retornar falha controlada caso comando falhe', async () => {
    const mockExecutor = vi.fn().mockRejectedValue(new Error('Git checkout failed: branch already exists'));

    const service = new AgyRunnerService({
      commandExecutor: mockExecutor,
    });

    const result = await service.heal(dummyEvent);

    expect(result.success).toBe(false);
    expect(result.message).toContain('Git checkout failed');
    expect(result.pullRequestUrl).toBeUndefined();
  });
});
