import type { TelemetryErrorEvent } from '@dieta-ai/types';

export interface TelegramServiceOptions {
  botToken: string;
  chatId: string;
  fetchImpl?: typeof fetch;
}

export class TelegramService {
  private readonly botToken: string;
  private readonly chatId: string;
  private readonly fetchImpl: typeof fetch;

  constructor(options: TelegramServiceOptions) {
    this.botToken = options.botToken;
    this.chatId = options.chatId;
    this.fetchImpl = options.fetchImpl ?? globalThis.fetch;
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
