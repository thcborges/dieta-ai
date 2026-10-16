import { PubSub, type Message } from '@google-cloud/pubsub';
import type { TelemetryErrorEvent } from '@dieta-ai/types';
import type { TelegramService } from './telegram.service.js';
import type { AgyRunnerService } from './agy-runner.service.js';

export interface PubSubConsumerOptions {
  telegramService: TelegramService;
  agyRunnerService: AgyRunnerService;
  autoHealEnabled?: boolean;
  projectId?: string;
}

export class PubSubConsumerService {
  private readonly telegramService: TelegramService;
  private readonly agyRunnerService: AgyRunnerService;
  private readonly autoHealEnabled: boolean;
  private readonly projectId?: string;
  private pubsubClient?: PubSub;

  constructor(options: PubSubConsumerOptions) {
    this.telegramService = options.telegramService;
    this.agyRunnerService = options.agyRunnerService;
    this.autoHealEnabled = options.autoHealEnabled ?? true;
    this.projectId = options.projectId;
  }

  public async handleMessage(message: Pick<Message, 'data' | 'ack' | 'nack'>): Promise<void> {
    let payload: TelemetryErrorEvent;

    try {
      const rawText = message.data.toString('utf-8');
      payload = JSON.parse(rawText);

      if (!payload.errorId || !payload.message) {
        // Formato incompatível: ack para não reter na fila
        message.ack();
        return;
      }
    } catch {
      // JSON corrompido: ack para evitar loop infinito de poison pill
      message.ack();
      return;
    }

    try {
      // 1. Notifica via Telegram imediatamente
      await this.telegramService.notifyErrorDetected(payload);

      // 2. Se auto-cura estiver habilitada (geralmente em ambiente de desenvolvimento)
      if (this.autoHealEnabled && payload.environment !== 'production') {
        const healResult = await this.agyRunnerService.heal(payload);
        if (healResult.success && healResult.pullRequestUrl) {
          await this.telegramService.notifyPullRequestCreated(healResult.pullRequestUrl, payload.errorId);
        }
      }

      message.ack();
    } catch {
      // Em caso de falha transitória interna
      message.nack();
    }
  }

  public startListening(subscriptionName: string): void {
    this.pubsubClient = new PubSub({ projectId: this.projectId });
    const subscription = this.pubsubClient.subscription(subscriptionName);

    subscription.on('message', (message: Message) => {
      void this.handleMessage(message);
    });

    subscription.on('error', (err: Error) => {
      console.error('[PubSubConsumer] Erro na subscription:', err);
    });
  }
}
