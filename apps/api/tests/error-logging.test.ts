import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { buildApp } from '../src/app.js';
import type { FastifyInstance } from 'fastify';

describe('Error Logging & Pub/Sub Event Dispatch (Self-Healing Pipeline)', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('deve capturar erro em tempo de execução com os 10 últimos eventos de sessão e formatar payload estruturado', async () => {
    const errorPayload = {
      errorMessage: 'Falha ao processar código de barras com sensor sujo',
      stackTrace: 'Error: Camera sensor hardware timeout at BarcodeScanner.scan',
      sessionEvents: [
        { type: 'NAVIGATE', path: '/dashboard', timestamp: '2026-10-15T23:00:00Z' },
        { type: 'CLICK', target: 'meal_window_lunch', timestamp: '2026-10-15T23:00:05Z' },
        { type: 'OPEN_MODAL', modal: 'barcode_scanner', timestamp: '2026-10-15T23:00:10Z' },
        { type: 'CAMERA_START', deviceId: 'cam_back_0', timestamp: '2026-10-15T23:00:12Z' },
        { type: 'FRAME_CAPTURE', frameCount: 15, timestamp: '2026-10-15T23:00:13Z' },
        { type: 'FRAME_CAPTURE', frameCount: 30, timestamp: '2026-10-15T23:00:14Z' },
        { type: 'FRAME_CAPTURE', frameCount: 45, timestamp: '2026-10-15T23:00:15Z' },
        { type: 'FRAME_CAPTURE', frameCount: 60, timestamp: '2026-10-15T23:00:16Z' },
        { type: 'FRAME_CAPTURE', frameCount: 75, timestamp: '2026-10-15T23:00:17Z' },
        { type: 'CAMERA_TIMEOUT', durationMs: 5000, timestamp: '2026-10-15T23:00:18Z' },
      ],
      userId: 'usr_test_techlead',
    };

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/telemetry/errors',
      payload: errorPayload,
    });

    expect(response.statusCode).toBe(202);
    const body = response.json();
    expect(body.status).toBe('DISPATCHED_TO_PUBSUB');
    expect(body.topic).toBe('dieta-ai-errors-dev');
    expect(body.errorId).toBeDefined();
    expect(body.eventCountCaptured).toBe(10);
  });

  it('deve rejeitar telemetria com payload inválido (400 Bad Request)', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/telemetry/errors',
      payload: {
        // faltando errorMessage obrigatório
        userId: 'usr_123',
      },
    });

    expect(response.statusCode).toBe(400);
    const body = response.json();
    expect(body.error).toBe('INVALID_TELEMETRY_PAYLOAD');
  });
});
