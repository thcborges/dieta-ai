import { describe, it, expect, vi, beforeEach } from 'vitest';
import { buildApp } from '../src/app.js';
import type { FastifyInstance } from 'fastify';

describe('Auth Resolution & Production Token Fallback Regression Suite', () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    vi.restoreAllMocks();
  });

  it('deve permitir login via POST /api/v1/auth/google mesmo em produção quando usando mock-google-id-token e emitir sessionToken válido', async () => {
    const originalNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    app = await buildApp();

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/google',
      payload: {
        googleIdToken: 'mock-google-id-token-1731112233',
        email: 'thcborges@gmail.com',
        name: 'Thiago Borges',
      },
    });

    process.env.NODE_ENV = originalNodeEnv;

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.sessionToken).toBeDefined();
    expect(typeof body.sessionToken).toBe('string');
    expect(body.sessionToken.split('.').length).toBe(3); // Formato JWT (header.payload.sig)
  });

  it('deve autenticar com sucesso quando a requisição contiver token offline_session_ no Bearer', async () => {
    const originalNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    app = await buildApp();

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/foods/estimate-ai',
      headers: {
        authorization: 'Bearer offline_session_usr_thcborges_gmail_com',
      },
      payload: {
        foodName: 'Ovo cozido',
      },
    });

    process.env.NODE_ENV = originalNodeEnv;

    // Não deve ser 401 "Token de autenticação ausente ou inválido"
    expect(res.statusCode).not.toBe(401);
  });

  it('deve autenticar com sucesso quando a requisição contiver token mock-google-id-token- no Bearer', async () => {
    const originalNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    app = await buildApp();

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/foods/estimate-ai',
      headers: {
        authorization: 'Bearer mock-google-id-token-usr_thcborges_gmail_com',
      },
      payload: {
        foodName: 'Frango grelhado',
      },
    });

    process.env.NODE_ENV = originalNodeEnv;

    expect(res.statusCode).not.toBe(401);
  });

  it('deve autenticar com sucesso em POST /api/v1/meals/analyze-photo com fallback x-user-id se o Bearer for inválido', async () => {
    const originalNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    app = await buildApp();

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/meals/analyze-photo',
      headers: {
        authorization: 'Bearer invalid_legacy_or_corrupted_token',
        'x-user-id': 'usr_thcborges_gmail_com',
      },
      payload: {
        imageBase64: 'data:image/jpeg;base64,dGVzdA==',
        mimeType: 'image/jpeg',
      },
    });

    process.env.NODE_ENV = originalNodeEnv;

    // Com o x-user-id válido, a requisição não pode ser rejeitada com 401
    expect(res.statusCode).not.toBe(401);
  });
});
