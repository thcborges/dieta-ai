import type { TelemetryErrorEvent } from '@dieta-ai/types';

export interface TelegramServiceOptions {
  botToken: string;
  chatId: string;
  fetchImpl?: typeof fetch;
  onDeployDevRequest?: () => Promise<{ success: boolean; workflowRunUrl?: string; error?: string }>;
  githubToken?: string;
  repoOwner?: string;
  repoName?: string;
}

export interface IncomingTelegramMessage {
  chatId: string | number;
  text?: string;
  messageId?: number;
}

export interface ProcessMessageResult {
  handled: boolean;
  action?: string;
  error?: string;
}

export class TelegramService {
  private readonly botToken: string;
  private readonly chatId: string;
  private readonly fetchImpl: typeof fetch;
  private readonly onDeployDevRequest?: () => Promise<{ success: boolean; workflowRunUrl?: string; error?: string }>;
  private readonly githubToken?: string;
  private readonly repoOwner: string;
  private readonly repoName: string;
  private lastUpdateId: number = 0;

  constructor(options: TelegramServiceOptions) {
    this.botToken = options.botToken;
    this.chatId = String(options.chatId);
    this.fetchImpl = options.fetchImpl ?? globalThis.fetch;
    this.onDeployDevRequest = options.onDeployDevRequest;
    this.githubToken = options.githubToken;
    this.repoOwner = options.repoOwner ?? 'thcborges';
    this.repoName = options.repoName ?? 'dieta-ai';
  }

  public getLastUpdateId(): number {
    return this.lastUpdateId;
  }

  public formatErrorMessage(event: TelemetryErrorEvent): string {
    const eventsList = (event.recentEvents || [])
      .slice(-10)
      .map((e, idx) => {
        const payloadStr = e.payload ? ` ${JSON.stringify(e.payload)}` : '';
        const pathStr = e.path ? ` ${e.path}` : '';
        return `  ${idx + 1}. \`[${e.type}]\`${pathStr}${payloadStr} (${e.timestamp})`;
      })
      .join('\n');

    const stackSnippet = event.stack ? `\n\`\`\`\n${event.stack.slice(0, 500)}\n\`\`\`` : '';

    return [
      '🚨 *ALERTA DE ERRO EM TEMPO DE EXECUÇÃO*',
      `*Produto:* MacroMetrics Pro (\`dieta-ai\`)`,
      `*ID:* \`${event.errorId}\``,
      `*Ambiente:* \`${event.environment}\``,
      `*Horário:* ${event.timestamp}`,
      `*Usuário/Pseudônimo:* \`${event.userId ?? 'anônimo'}\``,
      `*Mensagem:* ${event.message}`,
      stackSnippet,
      `*Últimos Eventos de Contexto da Sessão (${(event.recentEvents || []).length}):*`,
      eventsList || '  (Nenhum evento registrado)',
    ].filter(Boolean).join('\n');
  }

  public async notifyErrorDetected(event: TelemetryErrorEvent): Promise<boolean> {
    const text = this.formatErrorMessage(event);
    return this.sendMessage(text);
  }

  public async notifyPullRequestCreated(pullRequestUrl: string, errorId: string): Promise<boolean> {
    const text = [
      '🛠️ *AGY AUTO-HEALING: PULL REQUEST CRIADO*',
      `*Erro ID:* \`${errorId}\``,
      `*Status:* Teste de regressão BDD aplicado e validado com sucesso.`,
      `*Link do Pull Request:*`,
      `${pullRequestUrl}`,
      '',
      '_Acesse o GitHub para revisar o código e aprovar a mesclagem em produção._',
    ].join('\n');

    return this.sendMessage(text);
  }

  public async notifyIterationCompleted(pullRequestUrl: string, description: string): Promise<boolean> {
    const text = [
      '🚀 *ITERAÇÃO CONCLUÍDA: PR PRONTO PARA MERGE*',
      `*Produto:* MacroMetrics Pro (\`dieta-ai\`)`,
      `*Branch Alvo:* \`main\``,
      '',
      '*📋 Resumo do que foi desenvolvido nesta iteração:*',
      description,
      '',
      `*🔗 Link do Pull Request:*`,
      `${pullRequestUrl}`,
      '',
      '✅ _Testes unitários BDD/TDD, auditoria matemática e suíte E2E executados e aprovados._',
    ].join('\n');

    return this.sendMessage(text);
  }

  public async processIncomingMessage(msg: IncomingTelegramMessage): Promise<ProcessMessageResult> {
    const callerChatId = String(msg.chatId);
    if (callerChatId !== this.chatId) {
      return {
        handled: false,
        error: `Não autorizado: chatId ${callerChatId} difere do administrador configurado.`,
      };
    }

    const command = (msg.text || '').trim();
    if (command === '/deploy-dev') {
      try {
        let runUrl: string | undefined;
        if (this.onDeployDevRequest) {
          const res = await this.onDeployDevRequest();
          runUrl = res.workflowRunUrl;
        } else {
          const res = await this.triggerGithubDeploy();
          runUrl = res.workflowRunUrl;
        }

        const runInfo = runUrl ? `\n*Acompanhamento:* ${runUrl}` : '';
        await this.sendMessage(
          `🚀 Deploy do ambiente de desenvolvimento (branch \`develop\`) acionado com sucesso!${runInfo}\n_A esteira de CI/CD aplicará as atualizações no Cloud Run (thcborges-dieta-ai-dev)._`
        );

        return { handled: true, action: 'DEPLOY_DEV' };
      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        await this.sendMessage(`❌ Falha ao acionar deploy dev: ${errorMsg}`);
        return { handled: false, error: errorMsg };
      }
    }

    return { handled: false };
  }

  public async triggerGithubDeploy(): Promise<{ success: boolean; workflowRunUrl?: string; error?: string }> {
    const token = this.githubToken ?? process.env.GITHUB_TOKEN;
    if (!token) {
      return { success: false, error: 'GITHUB_TOKEN não configurado para disparo de workflow.' };
    }

    const url = `https://api.github.com/repos/${this.repoOwner}/${this.repoName}/actions/workflows/ci-dev.yml/dispatches`;
    const response = await this.fetchImpl(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ref: 'develop' }),
    });

    if (!response.ok) {
      return { success: false, error: `GitHub API error: ${response.status} ${response.statusText}` };
    }

    return {
      success: true,
      workflowRunUrl: `https://github.com/${this.repoOwner}/${this.repoName}/actions/workflows/ci-dev.yml`,
    };
  }

  public async pollUpdatesOnce(): Promise<number> {
    const url = `https://api.telegram.org/bot${this.botToken}/getUpdates?offset=${this.lastUpdateId + 1}&timeout=5`;
    try {
      const response = await this.fetchImpl(url);
      if (!response.ok) return 0;

      const data = await response.json() as {
        ok: boolean;
        result?: Array<{
          update_id: number;
          message?: {
            message_id: number;
            chat: { id: number | string };
            text?: string;
          };
        }>;
      };

      if (!data.ok || !Array.isArray(data.result)) return 0;

      let processed = 0;
      for (const update of data.result) {
        this.lastUpdateId = Math.max(this.lastUpdateId, update.update_id);
        if (update.message) {
          await this.processIncomingMessage({
            chatId: update.message.chat.id,
            text: update.message.text,
            messageId: update.message.message_id,
          });
          processed++;
        }
      }

      return processed;
    } catch {
      return 0;
    }
  }

  private async sendMessage(text: string): Promise<boolean> {
    const url = `https://api.telegram.org/bot${this.botToken}/sendMessage`;
    try {
      const response = await this.fetchImpl(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: this.chatId,
          text,
          parse_mode: 'Markdown',
        }),
      });

      return response.ok;
    } catch {
      return false;
    }
  }
}
