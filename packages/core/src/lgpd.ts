import { createHmac } from 'node:crypto';

export const LGPD_STATUTORY_DAYS = 15;

export interface DeletionRequestInput {
  userId: string;
  userEmail: string;
  requestedAt: Date;
}

export interface DeletionRequestResult {
  userId: string;
  status: 'SCHEDULED_FOR_PURGE' | 'COMPLETED' | 'CANCELLED';
  requestedAt: Date;
  scheduledPurgeDate: Date;
  daysRemaining: number;
  legalNotice: string;
}

/**
 * Calcula a data limite de exclusão irreversível conforme o prazo legal da LGPD (Art. 18 e 19).
 */
export function calculateLgpdDeletionDeadline(requestDate: Date): Date {
  const deadline = new Date(requestDate.getTime());
  deadline.setUTCDate(deadline.getUTCDate() + LGPD_STATUTORY_DAYS);
  return deadline;
}

/**
 * Gera um Blind Index determinístico via HMAC-SHA256 para buscas anônimas de dados de usuário.
 */
export function generateBlindIndex(value: string, secretPepper: string): string {
  return createHmac('sha256', secretPepper).update(value).digest('hex');
}

/**
 * Valida e formata a solicitação de autoexclusão do usuário com o aviso legal da LGPD.
 */
export function validateDeletionRequest(input: DeletionRequestInput): DeletionRequestResult {
  const scheduledPurgeDate = calculateLgpdDeletionDeadline(input.requestedAt);

  const legalNotice = `Conforme os artigos 18 e 19 da Lei 13.709/2018 (LGPD), sua solicitação de exclusão foi registrada. A sua conta e todos os dados associados (biometria, refeições, histórico) serão permanentemente e irreversivelmente eliminados no prazo legal de até ${LGPD_STATUTORY_DAYS} dias corridos (em ${scheduledPurgeDate.toISOString().slice(0, 10)}).`;

  return {
    userId: input.userId,
    status: 'SCHEDULED_FOR_PURGE',
    requestedAt: input.requestedAt,
    scheduledPurgeDate,
    daysRemaining: LGPD_STATUTORY_DAYS,
    legalNotice,
  };
}
