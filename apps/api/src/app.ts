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

export function resolveStaticPath(): string | null {
  if (process.env.STATIC_PATH && fs.existsSync(process.env.STATIC_PATH)) {
    return process.env.STATIC_PATH;
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

  // Servir SPA estático se diretório existir
  const staticPath = resolveStaticPath();
  if (staticPath) {
    await app.register(fastifyStatic, {
      root: staticPath,
      prefix: '/',
      wildcard: false,
    });

    app.setNotFoundHandler(async (request, reply) => {
      // Rotas de API e healthcheck mantêm 404 JSON estrito
      if (request.url.startsWith('/api') || request.url.startsWith('/health')) {
        return reply.status(404).send({
          error: 'Not Found',
          message: `Route ${request.method}:${request.url} not found`,
          statusCode: 404,
        });
      }

      // Rotas de navegação do cliente fazem fallback para index.html
      const indexPath = path.join(staticPath, 'index.html');
      if (fs.existsSync(indexPath)) {
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

