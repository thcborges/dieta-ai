import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TelegramService } from '../src/services/telegram.service.js';
import type { TelemetryErrorEvent } from '@dieta-ai/types';

describe('TelegramService (Observabilidade & Notificações de Erro)', () => {
  const dummyEvent: TelemetryErrorEvent = {
    errorId: 'err-test-abc1234',
    timestamp: '2026-10-16T00:00:00.000Z',
    environment: 'development',
    message: 'TypeError: Cannot calculate density with zero calories',
    stack: 'TypeError: at calculateProteinDensity (auditor.ts:45:12)\n    at MealBuilder (MealBuilder.tsx:88:5)',
    userId: 'user-blind-idx-9988',
    recentEvents: [
      { type: 'APP_INIT', timestamp: '2026-10-16T23:59:50.000Z' },
      { type: 'NAVIGATE', timestamp: '2026-10-16T23:59:52.000Z', path: '/meals' },
      { type: 'SELECT_PRESET', timestamp: '2026-10-16T23:59:55.000Z', payload: { presetId: 'pizza' } },
      { type: 'TRIGGER_SOLVER', timestamp: '2026-10-16T23:59:58.000Z', payload: { targetFood: 'sassami' } },
    ],
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('deve formatar mensagem Markdown estruturada com os 10 eventos de contexto de sessão', () => {
    const service = new TelegramService({
      botToken: 'dummy-token',
      chatId: '12345678',
    });

    const formatted = service.formatErrorMessage(dummyEvent);

    expect(formatted).toContain('🚨 *ALERTA DE ERRO EM TEMPO DE EXECUÇÃO*');
    expect(formatted).toContain('*ID:* `err-test-abc1234`');
    expect(formatted).toContain('*Ambiente:* `development`');
    expect(formatted).toContain('*Mensagem:* TypeError: Cannot calculate density with zero calories');
    expect(formatted).toContain('*Últimos Eventos de Contexto da Sessão (4):*');
    expect(formatted).toContain('`[APP_INIT]`');
    expect(formatted).toContain('`[NAVIGATE]` /meals');
    expect(formatted).toContain('`[SELECT_PRESET]` {"presetId":"pizza"}');
  });

  it('deve enviar notificação para API do Telegram com sucesso', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true, result: { message_id: 42 } }),
    });

    const service = new TelegramService({
      botToken: '123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11',
      chatId: '987654321',
      fetchImpl: mockFetch as unknown as typeof fetch,
    });

    const success = await service.notifyErrorDetected(dummyEvent);

    expect(success).toBe(true);
    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, options] = mockFetch.mock.calls[0];
    expect(url).toBe('https://api.telegram.org/bot123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11/sendMessage');
    expect(options.method).toBe('POST');
    const body = JSON.parse(options.body as string);
    expect(body.chat_id).toBe('987654321');
    expect(body.parse_mode).toBe('Markdown');
    expect(body.text).toContain('err-test-abc1234');
  });

  it('deve formatar e enviar notificação de Pull Request criado pelo AGY', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true }),
    });

    const service = new TelegramService({
      botToken: 'test-token',
      chatId: 'test-chat',
      fetchImpl: mockFetch as unknown as typeof fetch,
    });

    const success = await service.notifyPullRequestCreated('https://github.com/thcborges/dieta-ai/pull/42', 'err-test-abc1234');

    expect(success).toBe(true);
    const [, options] = mockFetch.mock.calls[0];
    const body = JSON.parse(options.body as string);
    expect(body.text).toContain('🛠️ *AGY AUTO-HEALING: PULL REQUEST CRIADO*');
    expect(body.text).toContain('https://github.com/thcborges/dieta-ai/pull/42');
    expect(body.text).toContain('`err-test-abc1234`');
  });

  it('deve tratar falha na chamada HTTP do Telegram sem lançar exceção não capturada', async () => {
    const mockFetch = vi.fn().mockRejectedValue(new Error('Network timeout'));

    const service = new TelegramService({
      botToken: 'test-token',
      chatId: 'test-chat',
      fetchImpl: mockFetch as unknown as typeof fetch,
    });

    const success = await service.notifyErrorDetected(dummyEvent);
    expect(success).toBe(false);
  });
});
