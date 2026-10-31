import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildApp } from '../src/app.js';
import type { FastifyInstance } from 'fastify';

describe('Etapa 2: Autenticação Criptográfica com Google Auth & Middleware JWT', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('deve autenticar com token válido do Google, retornar sessionToken criptográfico assinado e blindIndex', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/google',
      payload: {
        googleIdToken: 'valid-mock-google-id-token-abc123',
        email: 'techlead@dataeng.io',
        name: 'Tech Lead',
      },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.sessionId).toBeDefined();
    expect(body.sessionToken).toBeDefined();
    expect(body.sessionToken.split('.')).toHaveLength(3); // JWT formato header.payload.signature
    expect(body.blindIndex).toHaveLength(64);
    expect(body.user.email).toBe('techlead@dataeng.io');
    expect(body.user.googleIdTokenVerified).toBe(true);
  });

  it('deve rejeitar token inválido do Google com status 401 e código INVALID_GOOGLE_TOKEN', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/google',
      payload: {
        googleIdToken: 'invalid-forged-google-token',
        email: 'attacker@evil.com',
      },
    });

    expect(response.statusCode).toBe(401);
    const body = response.json();
    expect(body.error).toBe('INVALID_GOOGLE_TOKEN');
    expect(body.message).toContain('Token do Google inválido');
  });

  it('deve validar sessionToken no endpoint /api/v1/auth/me retornando dados do usuário autenticado', async () => {
    // 1. Obtém token autenticado
    const loginRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/google',
      payload: {
        googleIdToken: 'valid-mock-google-id-token-abc123',
        email: 'thcborges@example.com',
        name: 'Líder Técnico',
      },
    });
    const { sessionToken } = loginRes.json();

    // 2. Consulta /api/v1/auth/me com Bearer token
    const meRes = await app.inject({
      method: 'GET',
      url: '/api/v1/auth/me',
      headers: {
        authorization: `Bearer ${sessionToken}`,
      },
    });

    expect(meRes.statusCode).toBe(200);
    const meBody = meRes.json();
    expect(meBody.user.email).toBe('thcborges@example.com');
    expect(meBody.user.isAdmin).toBe(true); // configurado em ADMIN_EMAILS
    expect(meBody.user.blindUserId).toBeDefined();
  });

  it('deve rejeitar requisição a /api/v1/auth/me sem header de autorização com 401 UNAUTHORIZED', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/auth/me',
    });

    expect(response.statusCode).toBe(401);
    const body = response.json();
    expect(body.error).toBe('UNAUTHORIZED');
  });

  it('deve rejeitar requisição a /api/v1/auth/me com token adulterado (assinatura inválida)', async () => {
    // 1. Obtém token legítimo
    const loginRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/google',
      payload: {
        googleIdToken: 'valid-mock-google-id-token-abc123',
        email: 'user@example.com',
      },
    });
    const { sessionToken } = loginRes.json();
    const parts = sessionToken.split('.');
    // Adultera o payload mantendo a assinatura original
    const tamperedToken = `${parts[0]}.${Buffer.from(JSON.stringify({ sub: 'victim', email: 'victim@ex.com', isAdmin: true })).toString('base64url')}.${parts[2]}`;

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/auth/me',
      headers: {
        authorization: `Bearer ${tamperedToken}`,
      },
    });

    expect(response.statusCode).toBe(401);
    const body = response.json();
    expect(body.error).toBe('UNAUTHORIZED');
  });
});
