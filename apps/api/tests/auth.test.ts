import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildApp } from '../src/app.js';
import type { FastifyInstance } from 'fastify';

describe('Google Authentication & Blind Indexing API', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('deve autenticar com token do Google e retornar sessão com Blind Index gerado', async () => {
    const payload = {
      googleIdToken: 'valid-mock-google-id-token-xyz',
      email: 'techlead@dataeng.io',
      name: 'Tech Lead',
    };

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/google',
      payload,
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.sessionId).toBeDefined();
    expect(body.blindIndex).toBeDefined();
    expect(body.blindIndex).toHaveLength(64); // SHA-256 HMAC
    expect(body.user.email).toBe(payload.email);
  });

  it('deve rejeitar requisição sem token do Google', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/google',
      payload: {
        email: 'invalid@example.com',
      },
    });

    expect(response.statusCode).toBe(400);
    const body = response.json();
    expect(body.error).toBe('INVALID_PAYLOAD');
  });
});
