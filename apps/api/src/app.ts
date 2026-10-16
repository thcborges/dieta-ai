import fastify, { type FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';

import { healthRoutes } from './routes/health.route.js';
import { foodRoutes } from './routes/foods.route.js';
import { authRoutes } from './routes/auth.route.js';
import { userRoutes } from './routes/users.route.js';
import { adminRoutes } from './routes/admin.route.js';
import { telemetryRoutes } from './routes/telemetry.route.js';

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

  // Registro das rotas
  await app.register(healthRoutes);
  await app.register(foodRoutes);
  await app.register(authRoutes);
  await app.register(userRoutes);
  await app.register(adminRoutes);
  await app.register(telemetryRoutes);

  return app;
}
