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

  it('deve formatar e enviar notificação de iteração concluída e PR pronto para merge', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true }),
    });

    const service = new TelegramService({
      botToken: 'test-token',
      chatId: 'test-chat',
      fetchImpl: mockFetch as unknown as typeof fetch,
    });

    const description = '1. Login Google obrigatório\n2. Controle de macros por usuário\n3. Fibra por idade';
    const prUrl = 'https://github.com/thcborges/dieta-ai/pull/50';

    const success = await service.notifyIterationCompleted(prUrl, description);

    expect(success).toBe(true);
    const [, options] = mockFetch.mock.calls[0];
    const body = JSON.parse(options.body as string);
    expect(body.text).toContain('🚀 *ITERAÇÃO CONCLUÍDA: PR PRONTO PARA MERGE*');
    expect(body.text).toContain(prUrl);
    expect(body.text).toContain('Login Google obrigatório');
    expect(body.text).toContain('Fibra por idade');
  });

  it('deve processar comando /deploy-dev de usuário autorizado e disparar deploy', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true }),
    });

    const mockDeployCallback = vi.fn().mockResolvedValue({
      success: true,
      workflowRunUrl: 'https://github.com/thcborges/dieta-ai/actions/runs/123456',
    });

    const service = new TelegramService({
      botToken: 'test-token',
      chatId: '12345678',
      fetchImpl: mockFetch as unknown as typeof fetch,
      onDeployDevRequest: mockDeployCallback,
    });

    const result = await service.processIncomingMessage({
      chatId: '12345678',
      text: '/deploy-dev',
      messageId: 99,
    });

    expect(result.handled).toBe(true);
    expect(result.action).toBe('DEPLOY_DEV');
    expect(mockDeployCallback).toHaveBeenCalledTimes(1);

    // Deve ter enviado resposta de confirmação no Telegram
    expect(mockFetch).toHaveBeenCalled();
    const lastCall = mockFetch.mock.calls[mockFetch.mock.calls.length - 1];
    const body = JSON.parse(lastCall[1].body as string);
    expect(body.text).toContain('🚀 Deploy do ambiente de desenvolvimento (branch `develop`) acionado com sucesso!');
  });

  it('deve rejeitar comando /deploy-dev de usuário não autorizado', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true }),
    });

    const mockDeployCallback = vi.fn();

    const service = new TelegramService({
      botToken: 'test-token',
      chatId: '12345678',
      fetchImpl: mockFetch as unknown as typeof fetch,
      onDeployDevRequest: mockDeployCallback,
    });

    const result = await service.processIncomingMessage({
      chatId: '99999999', // Usuário não autorizado
      text: '/deploy-dev',
      messageId: 100,
    });

    expect(result.handled).toBe(false);
    expect(result.error).toContain('Não autorizado');
    expect(mockDeployCallback).not.toHaveBeenCalled();
  });

  it('deve consultar getUpdates e despachar mensagens pendentes no long-polling', async () => {
    const mockFetch = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          ok: true,
          result: [
            {
              update_id: 1001,
              message: {
                message_id: 55,
                chat: { id: 12345678 },
                text: '/deploy-dev',
              },
            },
          ],
        }),
      })
      .mockResolvedValue({
        ok: true,
        json: async () => ({ ok: true }),
      });

    const mockDeployCallback = vi.fn().mockResolvedValue({ success: true });

    const service = new TelegramService({
      botToken: 'test-token',
      chatId: '12345678',
      fetchImpl: mockFetch as unknown as typeof fetch,
      onDeployDevRequest: mockDeployCallback,
    });

    const processedCount = await service.pollUpdatesOnce();

    expect(processedCount).toBe(1);
    expect(service.getLastUpdateId()).toBe(1001);
    expect(mockDeployCallback).toHaveBeenCalledTimes(1);
  });

  it('deve executar triggerGithubDeploy com sucesso quando GITHUB_TOKEN estiver presente', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 204,
      statusText: 'No Content',
    });

    const service = new TelegramService({
      botToken: 'test-token',
      chatId: '12345678',
      githubToken: 'ghp_secret_token_1234',
      repoOwner: 'thcborges',
      repoName: 'dieta-ai',
      fetchImpl: mockFetch as unknown as typeof fetch,
    });

    const result = await service.triggerGithubDeploy();

    expect(result.success).toBe(true);
    expect(result.workflowRunUrl).toContain('actions/workflows/ci-dev.yml');
    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.github.com/repos/thcborges/dieta-ai/actions/workflows/ci-dev.yml/dispatches',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer ghp_secret_token_1234',
        }),
      })
    );
  });

  it('deve retornar erro em triggerGithubDeploy quando GITHUB_TOKEN estiver ausente', async () => {
    const originalToken = process.env.GITHUB_TOKEN;
    delete process.env.GITHUB_TOKEN;

    const service = new TelegramService({
      botToken: 'test-token',
      chatId: '12345678',
    });

    const result = await service.triggerGithubDeploy();
    expect(result.success).toBe(false);
    expect(result.error).toContain('GITHUB_TOKEN não configurado');

    if (originalToken) process.env.GITHUB_TOKEN = originalToken;
  });

  it('deve retornar erro em triggerGithubDeploy quando a API do GitHub falhar', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 403,
      statusText: 'Forbidden',
    });

    const service = new TelegramService({
      botToken: 'test-token',
      chatId: '12345678',
      githubToken: 'ghp_token',
      fetchImpl: mockFetch as unknown as typeof fetch,
    });

    const result = await service.triggerGithubDeploy();
    expect(result.success).toBe(false);
    expect(result.error).toContain('GitHub API error: 403 Forbidden');
  });

  it('deve tratar exceção e avisar usuário quando deploy-dev falhar na execução', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true }),
    });

    const mockDeployCallback = vi.fn().mockRejectedValue(new Error('GitHub workflow trigger timeout'));

    const service = new TelegramService({
      botToken: 'test-token',
      chatId: '12345678',
      fetchImpl: mockFetch as unknown as typeof fetch,
      onDeployDevRequest: mockDeployCallback,
    });

    const result = await service.processIncomingMessage({
      chatId: '12345678',
      text: '/deploy-dev',
    });

    expect(result.handled).toBe(false);
    expect(result.error).toBe('GitHub workflow trigger timeout');

    const lastCall = mockFetch.mock.calls[mockFetch.mock.calls.length - 1];
    const body = JSON.parse(lastCall[1].body as string);
    expect(body.text).toContain('Falha ao acionar deploy dev');
  });

  it('deve ignorar comandos não mapeados', async () => {
    const service = new TelegramService({
      botToken: 'test-token',
      chatId: '12345678',
    });

    const result = await service.processIncomingMessage({
      chatId: '12345678',
      text: '/ajuda',
    });

    expect(result.handled).toBe(false);
  });

  it('deve tratar falhas de rede no pollUpdatesOnce sem interromper o serviço', async () => {
    const mockFetch = vi.fn().mockRejectedValue(new Error('Network offline'));

    const service = new TelegramService({
      botToken: 'test-token',
      chatId: '12345678',
      fetchImpl: mockFetch as unknown as typeof fetch,
    });

    const count = await service.pollUpdatesOnce();
    expect(count).toBe(0);
  });

  it('deve retornar 0 quando getUpdates responder com status HTTP inválido ou payload inesperado', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 502,
    });

    const service = new TelegramService({
      botToken: 'test-token',
      chatId: '12345678',
      fetchImpl: mockFetch as unknown as typeof fetch,
    });

    const count = await service.pollUpdatesOnce();
    expect(count).toBe(0);
  });
});
