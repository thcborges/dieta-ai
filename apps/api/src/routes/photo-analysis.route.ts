import type { FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import {
  VertexPhotoAnalysisService,
  vertexPhotoAnalysisService,
} from '../services/vertex-photo-analysis.service.js';
import { requireAuth } from '../middleware/auth.middleware.js';

export interface PhotoAnalysisRouteOptions {
  photoAnalysisService?: VertexPhotoAnalysisService;
}

const analyzePhotoBodySchema = z.object({
  imageBase64: z.string().min(1, 'A imagem em base64 é obrigatória'),
  mimeType: z.enum(['image/jpeg', 'image/png', 'image/webp']).default('image/jpeg'),
  description: z.string().max(500).optional(),
});

export const photoAnalysisRoutes: FastifyPluginAsync<PhotoAnalysisRouteOptions> = async (
  app,
  opts
) => {
  const service = opts.photoAnalysisService || vertexPhotoAnalysisService;

  const authenticate = async (req: FastifyRequest, reply: FastifyReply) => {
    return requireAuth(req, reply);
  };

  app.post(
    '/api/v1/meals/analyze-photo',
    {
      bodyLimit: 15 * 1024 * 1024, // 15MB
      preHandler: [authenticate],
    },
    async (req: FastifyRequest, reply: FastifyReply) => {
      const parseResult = analyzePhotoBodySchema.safeParse(req.body);

      if (!parseResult.success) {
        return reply.status(400).send({
          error: 'INVALID_PAYLOAD',
          message: 'Payload inválido para análise de foto.',
          details: parseResult.error.format(),
        });
      }

      try {
        const result = await service.analyzeMealPhoto(parseResult.data);
        return reply.status(200).send(result);
      } catch (err: any) {
        req.log.error(err, 'Erro durante análise de foto no Vertex AI');
        return reply.status(500).send({
          error: 'VERTEX_AI_ANALYSIS_FAILED',
          message: 'Não foi possível processar a foto da refeição no momento.',
          details: err.message,
        });
      }
    }
  );
};
