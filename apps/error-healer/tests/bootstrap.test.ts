import { describe, it, expect, vi, beforeEach } from 'vitest';
import { bootstrap } from '../src/index.js';

describe('ErrorHealer Bootstrap', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  it('deve inicializar todos os serviços com variáveis de ambiente configuradas', () => {
    process.env.TELEGRAM_BOT_TOKEN = 'mock-token';
    process.env.TELEGRAM_CHAT_ID = 'mock-chat-id';
    process.env.PUBSUB_SUBSCRIPTION = 'test-sub';
    process.env.GCP_PROJECT_ID = 'thcborges-dieta-ai-dev';
    process.env.NODE_ENV = 'test';

    const services = bootstrap();

    expect(services.telegramService).toBeDefined();
    expect(services.agyRunnerService).toBeDefined();
    expect(services.consumer).toBeDefined();
  });

  it('deve lidar com ausência de TELEGRAM_BOT_TOKEN emitindo aviso', () => {
    delete process.env.TELEGRAM_BOT_TOKEN;
    delete process.env.TELEGRAM_CHAT_ID;
    process.env.NODE_ENV = 'test';

    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const services = bootstrap();

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('TELEGRAM_BOT_TOKEN ou TELEGRAM_CHAT_ID não definidos'));
    expect(services.telegramService).toBeDefined();
  });
});
