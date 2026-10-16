import type { FastifyPluginAsync } from 'fastify';

export const healthRoutes: FastifyPluginAsync = async (app) => {
  app.get('/health', async () => {
    return {
      status: 'healthy',
      service: 'macro-metrics-api',
      region: 'us-central1',
      timestamp: new Date().toISOString(),
    };
  });
};
