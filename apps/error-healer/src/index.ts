import { TelegramService } from './services/telegram.service.js';
import { AgyRunnerService } from './services/agy-runner.service.js';
import { PubSubConsumerService } from './services/pubsub-consumer.service.js';

export { TelegramService } from './services/telegram.service.js';
export { AgyRunnerService } from './services/agy-runner.service.js';
export { PubSubConsumerService } from './services/pubsub-consumer.service.js';

export function bootstrap() {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  const subscriptionName = process.env.PUBSUB_SUBSCRIPTION || 'dieta-ai-errors-dev-sub';
  const projectId = process.env.GCP_PROJECT_ID || 'thcborges-dieta-ai-dev';
  const autoHealEnabled = process.env.AUTO_HEAL_ENABLED !== 'false';

  if (!botToken || !chatId) {
    console.warn('[ErrorHealer] TELEGRAM_BOT_TOKEN ou TELEGRAM_CHAT_ID não definidos. O serviço operará em modo de espera.');
  }

  const telegramService = new TelegramService({
    botToken: botToken || 'dummy_token',
    chatId: chatId || 'dummy_chat',
  });

  const agyRunnerService = new AgyRunnerService();

  const consumer = new PubSubConsumerService({
    telegramService,
    agyRunnerService,
    autoHealEnabled,
    projectId,
  });

  if (process.env.NODE_ENV !== 'test') {
    console.log(`[ErrorHealer] Conectando à subscription ${subscriptionName} no projeto ${projectId}...`);
    consumer.startListening(subscriptionName);
  }

  return { telegramService, agyRunnerService, consumer };
}

if (process.env.NODE_ENV !== 'test') {
  bootstrap();
}
