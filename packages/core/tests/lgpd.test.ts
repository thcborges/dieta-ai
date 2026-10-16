import { describe, it, expect } from 'vitest';
import {
  calculateLgpdDeletionDeadline,
  generateBlindIndex,
  validateDeletionRequest,
  LGPD_STATUTORY_DAYS,
} from '../src/lgpd.js';

describe('LGPD & Privacy Engine (Módulo 6: Conformidade e Exclusão)', () => {
  it('deve calcular o prazo legal estrito de 15 dias conforme Art. 19 da LGPD', () => {
    const requestDate = new Date('2026-10-15T12:00:00Z');
    const deadline = calculateLgpdDeletionDeadline(requestDate);

    expect(LGPD_STATUTORY_DAYS).toBe(15);
    const expected = new Date('2026-10-30T12:00:00Z');
    expect(deadline.toISOString()).toBe(expected.toISOString());
  });

  it('deve gerar blind index determinístico consistente via HMAC para busca de dados', () => {
    const googleSub = 'google-oauth2|109283746501928374650';
    const secretPepper = 'production-grade-pepper-secret-key-32chars';

    const index1 = generateBlindIndex(googleSub, secretPepper);
    const index2 = generateBlindIndex(googleSub, secretPepper);

    expect(index1).toBe(index2);
    expect(index1).toHaveLength(64); // SHA-256 hex string
    expect(index1).not.toContain('google-oauth2'); // identidade protegida
  });

  it('deve validar requisição de exclusão de usuário e retornar status e notificação formal', () => {
    const request = validateDeletionRequest({
      userId: 'usr_abc123',
      requestedAt: new Date('2026-10-15T00:00:00Z'),
      userEmail: 'user@example.com',
    });

    expect(request.status).toBe('SCHEDULED_FOR_PURGE');
    expect(request.daysRemaining).toBe(15);
    expect(request.legalNotice).toContain('Lei 13.709/2018 (LGPD)');
    expect(request.legalNotice).toContain('15 dias');
  });
});
