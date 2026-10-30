import fastify, { type FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import fastifyStatic from '@fastify/static';
import fs from 'node:fs';
import path from 'node:path';

import { healthRoutes } from './routes/health.route.js';
import { foodRoutes } from './routes/foods.route.js';
import { authRoutes } from './routes/auth.route.js';
import { userRoutes } from './routes/users.route.js';
import { adminRoutes } from './routes/admin.route.js';
import { telemetryRoutes } from './routes/telemetry.route.js';
import { diaryRoutes as singleDiaryRoutes } from './routes/diary.route.js';
import { diaryRoutes as dateDiaryRoutes } from './routes/diaries.route.js';
import { recipeRoutes } from './routes/recipes.route.js';

export function resolveStaticPath(): string | null {
  if (process.env.STATIC_PATH && fs.existsSync(process.env.STATIC_PATH)) {
    return path.resolve(process.env.STATIC_PATH);
  }
  const candidates = [
    path.resolve(process.cwd(), 'apps/web/dist'),
    path.resolve(process.cwd(), '../web/dist'),
    path.resolve(process.cwd(), 'dist/apps/web/dist'),
    path.resolve(process.cwd(), 'web/dist'),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }
  return null;
}

export async function buildApp(): Promise<FastifyInstance> {
  const app = fastify({
    logger: process.env.NODE_ENV === 'test' ? false : true,
  });

  // Segurança e CORS
  await app.register(helmet, {
    contentSecurityPolicy: false,
  });

  await app.register(cors, {
    origin: true,
    credentials: true,
  });

  // Registro das rotas de API
  await app.register(healthRoutes);
  await app.register(foodRoutes);
  await app.register(authRoutes);
  await app.register(userRoutes);
  await app.register(adminRoutes);
  await app.register(telemetryRoutes);
  await app.register(singleDiaryRoutes);
  await app.register(dateDiaryRoutes);
  await app.register(recipeRoutes);

  // Servir SPA estático se diretório existir
  const staticPath = resolveStaticPath();
  if (staticPath) {
    await app.register(fastifyStatic, {
      root: staticPath,
      prefix: '/',
      wildcard: false,
      setHeaders: (reply, pathName) => {
        const normalized = pathName.replace(/\\/g, '/');
        if (normalized.includes('/assets/')) {
          reply.header('Cache-Control', 'public, max-age=31536000, immutable');
        } else if (
          normalized.endsWith('.html') ||
          normalized.endsWith('sw.js') ||
          normalized.endsWith('manifest.webmanifest')
        ) {
          reply.header('Cache-Control', 'no-cache, no-store, must-revalidate');
          reply.header('Pragma', 'no-cache');
          reply.header('Expires', '0');
        }
      },
    });

    app.setNotFoundHandler(async (request, reply) => {
      const urlPath = request.url.split('?')[0];

      // 1. Rotas de API e healthcheck mantêm 404 JSON estrito
      if (urlPath.startsWith('/api') || urlPath.startsWith('/health')) {
        return reply.status(404).send({
          error: 'Not Found',
          message: `Route ${request.method}:${request.url} not found`,
          statusCode: 404,
        });
      }

      // 2. Requisições de assets ou recursos com extensão não devem sofrer fallback para index.html.
      // Isso previne que arquivos CSS, JS ou imagens inexistentes sejam servidos como text/html (strict MIME error / broken image).
      const hasExtension = path.extname(urlPath) !== '';
      const isAssetPath = urlPath.startsWith('/assets/');
      if (hasExtension || isAssetPath) {
        return reply.status(404).send({
          error: 'Not Found',
          message: `Asset ${request.url} not found`,
          statusCode: 404,
        });
      }

      // 3. Rotas de navegação do cliente SPA fazem fallback para index.html com cabeçalhos anti-cache
      const indexPath = path.join(staticPath, 'index.html');
      if (fs.existsSync(indexPath)) {
        reply.header('Cache-Control', 'no-cache, no-store, must-revalidate');
        reply.header('Pragma', 'no-cache');
        reply.header('Expires', '0');
        return reply.sendFile('index.html');
      }

      return reply.status(404).send({
        error: 'Not Found',
        message: `Route ${request.method}:${request.url} not found`,
        statusCode: 404,
      });
    });
  }

  return app;
}

