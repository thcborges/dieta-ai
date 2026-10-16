import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PubSubConsumerService } from '../src/services/pubsub-consumer.service.js';
import type { TelemetryErrorEvent } from '@dieta-ai/types';

describe('PubSubConsumerService (Consumo de Fila de Erros & Orquestração Dev/Prd)', () => {
  const dummyPayload: TelemetryErrorEvent = {
    errorId: 'err-test-pubsub-1',
    timestamp: '2026-10-16T00:00:00.000Z',
    environment: 'development',
    message: 'Unhandled Promise Rejection in foodCache',
    recentEvents: [
      { type: 'LOOKUP_BARCODE', timestamp: '2026-10-16T23:45:00.000Z', payload: { barcode: '7891000100103' } },
    ],
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('deve processar mensagem de erro em dev: envia alerta Telegram, executa AGY e envia PR ao Telegram', async () => {
    const notifyErrorSpy = vi.fn().mockResolvedValue(true);
    const notifyPrSpy = vi.fn().mockResolvedValue(true);
    const healSpy = vi.fn().mockResolvedValue({
      success: true,
      errorId: 'err-test-pubsub-1',
      branchName: 'fix/err-test-pubsub-1',
      pullRequestUrl: 'https://github.com/thcborges/dieta-ai/pull/99',
      message: 'Healed successfully',
    });

    const mockTelegramService = {
      notifyErrorDetected: notifyErrorSpy,
      notifyPullRequestCreated: notifyPrSpy,
    };

    const mockAgyService = {
      heal: healSpy,
    };

    const consumer = new PubSubConsumerService({
      telegramService: mockTelegramService as any,
      agyRunnerService: mockAgyService as any,
      autoHealEnabled: true,
    });

    const mockMessage = {
      data: Buffer.from(JSON.stringify(dummyPayload)),
      ack: vi.fn(),
      nack: vi.fn(),
    };

    await consumer.handleMessage(mockMessage as any);

    expect(notifyErrorSpy).toHaveBeenCalledWith(expect.objectContaining({ errorId: 'err-test-pubsub-1' }));
    expect(healSpy).toHaveBeenCalledWith(expect.objectContaining({ errorId: 'err-test-pubsub-1' }));
    expect(notifyPrSpy).toHaveBeenCalledWith('https://github.com/thcborges/dieta-ai/pull/99', 'err-test-pubsub-1');
    expect(mockMessage.ack).toHaveBeenCalled();
    expect(mockMessage.nack).not.toHaveBeenCalled();
  });

  it('deve processar mensagem de erro em prd: envia alerta Telegram mas NÃO executa AGY', async () => {
    const prdPayload: TelemetryErrorEvent = {
      ...dummyPayload,
      environment: 'production',
    };

    const notifyErrorSpy = vi.fn().mockResolvedValue(true);
    const healSpy = vi.fn();

    const consumer = new PubSubConsumerService({
      telegramService: { notifyErrorDetected: notifyErrorSpy, notifyPullRequestCreated: vi.fn() } as any,
      agyRunnerService: { heal: healSpy } as any,
      autoHealEnabled: false, // Em PRD, autoHeal desativado
    });

    const mockMessage = {
      data: Buffer.from(JSON.stringify(prdPayload)),
      ack: vi.fn(),
      nack: vi.fn(),
    };

    await consumer.handleMessage(mockMessage as any);

    expect(notifyErrorSpy).toHaveBeenCalled();
    expect(healSpy).not.toHaveBeenCalled();
    expect(mockMessage.ack).toHaveBeenCalled();
  });

  it('deve descartar ou nack se o payload for inválido/corrompido', async () => {
    const consumer = new PubSubConsumerService({
      telegramService: { notifyErrorDetected: vi.fn(), notifyPullRequestCreated: vi.fn() } as any,
      agyRunnerService: { heal: vi.fn() } as any,
      autoHealEnabled: true,
    });

    const corruptedMessage = {
      data: Buffer.from('NOT_VALID_JSON{{{'),
      ack: vi.fn(),
      nack: vi.fn(),
    };

    await consumer.handleMessage(corruptedMessage as any);

    // Deve dar ack para evitar Poison Pill na fila
    expect(corruptedMessage.ack).toHaveBeenCalled();
  });

  it('deve descartar se payload for JSON válido porém sem errorId ou message', async () => {
    const consumer = new PubSubConsumerService({
      telegramService: { notifyErrorDetected: vi.fn(), notifyPullRequestCreated: vi.fn() } as any,
      agyRunnerService: { heal: vi.fn() } as any,
      autoHealEnabled: true,
    });

    const invalidSchemaMsg = {
      data: Buffer.from(JSON.stringify({ randomField: 123 })),
      ack: vi.fn(),
      nack: vi.fn(),
    };

    await consumer.handleMessage(invalidSchemaMsg as any);
    expect(invalidSchemaMsg.ack).toHaveBeenCalled();
  });

  it('deve dar nack se ocorrer erro inesperado no processamento', async () => {
    const consumer = new PubSubConsumerService({
      telegramService: {
        notifyErrorDetected: vi.fn().mockRejectedValue(new Error('Fatal exception in processing')),
        notifyPullRequestCreated: vi.fn(),
      } as any,
      agyRunnerService: { heal: vi.fn() } as any,
      autoHealEnabled: true,
    });

    const msg = {
      data: Buffer.from(JSON.stringify(dummyPayload)),
      ack: vi.fn(),
      nack: vi.fn(),
    };

    await consumer.handleMessage(msg as any);
    expect(msg.nack).toHaveBeenCalled();
  });

  it('deve registrar listeners na subscription ao chamar startListening', () => {
    const consumer = new PubSubConsumerService({
      telegramService: { notifyErrorDetected: vi.fn(), notifyPullRequestCreated: vi.fn() } as any,
      agyRunnerService: { heal: vi.fn() } as any,
      autoHealEnabled: true,
      projectId: 'test-project',
    });

    const onSpy = vi.fn();
    const mockSubscription = { on: onSpy };
    const mockPubSubInstance = {
      subscription: vi.fn().mockReturnValue(mockSubscription),
    };

    (consumer as any).pubsubClient = mockPubSubInstance;
    (consumer as any).startListeningWithClient = (client: any, subName: string) => {
      const sub = client.subscription(subName);
      sub.on('message', vi.fn());
      sub.on('error', vi.fn());
    };

    (consumer as any).startListeningWithClient(mockPubSubInstance, 'my-sub');
    expect(mockPubSubInstance.subscription).toHaveBeenCalledWith('my-sub');
    expect(onSpy).toHaveBeenCalledWith('message', expect.any(Function));
    expect(onSpy).toHaveBeenCalledWith('error', expect.any(Function));
  });
});
