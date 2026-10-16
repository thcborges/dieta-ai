import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';

const sessionEventSchema = z.object({
  type: z.string(),
  timestamp: z.string(),
}).passthrough();

const errorTelemetrySchema = z.object({
  errorMessage: z.string(),
  stackTrace: z.string().optional(),
  sessionEvents: z.array(sessionEventSchema).max(20),
  userId: z.string().optional(),
});

export const telemetryRoutes: FastifyPluginAsync = async (app) => {
  app.post('/api/v1/telemetry/errors', async (req, reply) => {
    const parseResult = errorTelemetrySchema.safeParse(req.body);
    if (!parseResult.success) {
      return reply.status(400).send({
        error: 'INVALID_TELEMETRY_PAYLOAD',
        issues: parseResult.error.issues,
      });
    }

    const { errorMessage, stackTrace, sessionEvents, userId } = parseResult.data;
    const last10Events = sessionEvents.slice(-10);

    const errorId = `err_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    // Estruturação do log no formato esperado pelo Cloud Logging e Pub/Sub
    const structuredLog = {
      severity: 'ERROR',
      errorId,
      message: errorMessage,
      stackTrace,
      userId: userId || 'anonymous',
      sessionContext: last10Events,
      environment: process.env.NODE_ENV || 'development',
      region: 'us-central1',
      targetPubSubTopic: 'dieta-ai-errors-dev',
      receivedAt: new Date().toISOString(),
    };

    // Log estruturado enviado ao stdout (capturado pelo Cloud Logging sink para Pub/Sub)
    app.log.error(structuredLog);

    return reply.status(202).send({
      status: 'DISPATCHED_TO_PUBSUB',
      topic: 'dieta-ai-errors-dev',
      errorId,
      eventCountCaptured: last10Events.length,
    });
  });
};
