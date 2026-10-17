import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { buildApp } from '../src/app.js';

describe('Frontend SPA Static Hosting & Routing in Fastify', () => {
  let app: FastifyInstance;
  let tempStaticDir: string;

  beforeAll(async () => {
    // Cria diretório temporário simulando a build do frontend apps/web/dist
    tempStaticDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dieta-ai-web-test-'));
    fs.writeFileSync(
      path.join(tempStaticDir, 'index.html'),
      '<!DOCTYPE html><html><head><title>MacroMetrics Pro</title></head><body><div id="root"></div></body></html>',
      'utf8'
    );
    const assetsDir = path.join(tempStaticDir, 'assets');
    fs.mkdirSync(assetsDir);
    fs.writeFileSync(path.join(assetsDir, 'app.js'), 'console.log("MacroMetrics PWA");', 'utf8');

    process.env.STATIC_PATH = tempStaticDir;
    app = await buildApp();
  });

  afterAll(async () => {
    delete process.env.STATIC_PATH;
    await app.close();
    fs.rmSync(tempStaticDir, { recursive: true, force: true });
  });

  it('deve servir o index.html na raiz GET / com content-type text/html', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/',
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers['content-type']).toContain('text/html');
    expect(response.body).toContain('<title>MacroMetrics Pro</title>');
  });

  it('deve servir arquivos estáticos diretamente como assets com mime type correto', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/assets/app.js',
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers['content-type']).toContain('javascript');
    expect(response.body).toContain('console.log("MacroMetrics PWA");');
  });

  it('deve fazer SPA fallback para index.html em rotas de navegação do cliente (ex: /dashboard)', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/dashboard',
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers['content-type']).toContain('text/html');
    expect(response.body).toContain('<title>MacroMetrics Pro</title>');
  });

  it('NÃO deve fazer SPA fallback para arquivos sob /assets/ inexistentes (deve retornar 404 e NÃO index.html/text/html)', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/assets/index-DSIqM_b5.css',
    });

    expect(response.statusCode).toBe(404);
    expect(response.headers['content-type'] || '').not.toContain('text/html');
    expect(response.body).not.toContain('<title>MacroMetrics Pro</title>');
  });

  it('NÃO deve fazer SPA fallback para imagens/recursos inexistentes com extensão (ex: /pwa-192x192.png)', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/pwa-192x192.png',
    });

    expect(response.statusCode).toBe(404);
    expect(response.headers['content-type'] || '').not.toContain('text/html');
    expect(response.body).not.toContain('<title>MacroMetrics Pro</title>');
  });

  it('deve enviar cabeçalho no-cache para index.html e navegações SPA para evitar cache de hashes desatualizados', async () => {
    const navResponse = await app.inject({
      method: 'GET',
      url: '/dashboard',
    });

    expect(navResponse.statusCode).toBe(200);
    expect(navResponse.headers['cache-control']).toContain('no-cache');

    const rootResponse = await app.inject({
      method: 'GET',
      url: '/',
    });
    expect(rootResponse.statusCode).toBe(200);
    expect(rootResponse.headers['cache-control']).toContain('no-cache');
  });

  it('deve configurar Cache-Control com max-age longo para assets imutáveis sob /assets/', async () => {
    const assetResponse = await app.inject({
      method: 'GET',
      url: '/assets/app.js',
    });

    expect(assetResponse.statusCode).toBe(200);
    expect(assetResponse.headers['cache-control']).toContain('max-age');
  });

  it('deve preservar respostas da API sem interferência do SPA (ex: GET /health)', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/health',
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.status).toBe('healthy');
  });

  it('NÃO deve fazer SPA fallback para rotas de API inexistentes (deve retornar 404 JSON)', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/rota-inexistente',
    });

    expect(response.statusCode).toBe(404);
    const body = response.json();
    expect(body.message || body.error).toBeDefined();
  });

  it('deve retornar 404 JSON caso a rota não seja API mas index.html não exista no diretório estático', async () => {
    const emptyDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dieta-ai-empty-'));
    process.env.STATIC_PATH = emptyDir;
    const noIndexApp = await buildApp();

    const response = await noIndexApp.inject({
      method: 'GET',
      url: '/alguma-pagina',
    });

    expect(response.statusCode).toBe(404);
    const body = response.json();
    expect(body.error).toBe('Not Found');

    await noIndexApp.close();
    fs.rmSync(emptyDir, { recursive: true, force: true });
    process.env.STATIC_PATH = tempStaticDir;
  });

  it('deve instanciar a aplicação normalmente em modo API pura quando STATIC_PATH não existir', async () => {
    delete process.env.STATIC_PATH;
    const pureApiApp = await buildApp();

    const response = await pureApiApp.inject({
      method: 'GET',
      url: '/health',
    });
    expect(response.statusCode).toBe(200);

    await pureApiApp.close();
    process.env.STATIC_PATH = tempStaticDir;
  });
});
