import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildApp } from '../src/app.js';
import type { FastifyInstance } from 'fastify';

describe('LGPD Account Management & Admin Purge API', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('deve registrar solicitação de autoexclusão do usuário com aviso legal de 15 dias', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/users/me/deletion-request',
      headers: {
        'x-user-id': 'usr_user123',
        'x-user-email': 'user123@example.com',
      },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.status).toBe('SCHEDULED_FOR_PURGE');
    expect(body.daysRemaining).toBe(15);
    expect(body.legalNotice).toContain('Lei 13.709/2018 (LGPD)');
    expect(body.legalNotice).toContain('15 dias');
    expect(body.scheduledPurgeDate).toBeDefined();
  });

  it('deve permitir ao administrador expurgar irreversivelmente uma conta', async () => {
    const response = await app.inject({
      method: 'DELETE',
      url: '/api/v1/admin/users/usr_target_delete_999',
      headers: {
        'x-admin-token': 'admin-secret-token-key-us-central1',
      },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.success).toBe(true);
    expect(body.purgedUserId).toBe('usr_target_delete_999');
    expect(body.message).toContain('irreversivelmente eliminado');
  });

  it('deve bloquear tentativa de expurgo administrativo sem token de admin válido', async () => {
    const response = await app.inject({
      method: 'DELETE',
      url: '/api/v1/admin/users/usr_target_delete_999',
      headers: {
        'x-admin-token': 'invalid-token',
      },
    });

    expect(response.statusCode).toBe(403);
    const body = response.json();
    expect(body.error).toBe('UNAUTHORIZED_ADMIN');
  });
});
