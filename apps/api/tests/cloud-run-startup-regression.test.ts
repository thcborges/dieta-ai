import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { resolve } from 'node:path';
import { readFileSync, existsSync } from 'node:fs';
import { buildApp } from '../src/app.js';
import { AuthService } from '../src/services/auth.service.js';
import { FirestoreDiaryService } from '../src/services/firestore-diary.service.js';
import { UserGoalsService } from '../src/services/user-goals.service.js';

describe('BDD Regression: Cloud Run Startup Probe & Environment Secrets', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  describe('Cenário 1: Falha de inicialização em produção por falta de segredos de segurança', () => {
    it('deve reproduzir o erro que derruba o container no Cloud Run se SESSION_SECRET e peppers estiverem ausentes em produção', () => {
      process.env.NODE_ENV = 'production';
      delete process.env.SESSION_SECRET;
      delete process.env.LGPD_SECRET_PEPPER;
      delete process.env.BLIND_INDEX_PEPPER;

      expect(() => {
        new AuthService();
      }).toThrow(/Configuração de segurança ausente: SESSION_SECRET ou LGPD_SECRET_PEPPER/i);

      expect(() => {
        new FirestoreDiaryService();
      }).toThrow(/BLIND_INDEX_PEPPER deve ser definido/i);

      expect(() => {
        new UserGoalsService();
      }).toThrow(/BLIND_INDEX_PEPPER/i);
    });
  });

  describe('Cenário 2: Sucesso na inicialização e aprovação no Startup Probe (/health) em produção', () => {
    it('deve inicializar o Fastify e responder com 200 OK em /health quando os segredos do Cloud Run estiverem presentes', async () => {
      process.env.NODE_ENV = 'production';
      process.env.SESSION_SECRET = 'a'.repeat(64);
      process.env.LGPD_SECRET_PEPPER = 'b'.repeat(64);
      process.env.BLIND_INDEX_PEPPER = 'b'.repeat(64);
      process.env.GCP_PROJECT_ID = 'thcborges-dieta-ai-prd';
      process.env.GCP_REGION = 'us-central1';

      const app = await buildApp();
      const response = await app.inject({
        method: 'GET',
        url: '/health',
      });

      expect(response.statusCode).toBe(200);
      const data = response.json();
      expect(data.status).toBe('healthy');
      expect(data.service).toBe('macro-metrics-api');
      expect(data.region).toBe('us-central1');

      await app.close();
    });
  });

  describe('Cenário 3: Validação da Infraestrutura Terraform para Cloud Run e Startup Probes', () => {
    const cloudRunModulePath = resolve(__dirname, '../../../infra/terraform/modules/cloud_run/main.tf');
    const firestoreModulePath = resolve(__dirname, '../../../infra/terraform/modules/firestore/main.tf');
    const dockerignorePath = resolve(__dirname, '../../../.dockerignore');

    it('deve possuir arquivo .dockerignore prevenindo cópia de node_modules e segredos', () => {
      expect(existsSync(dockerignorePath)).toBe(true);
      const content = readFileSync(dockerignorePath, 'utf-8');
      expect(content).toContain('node_modules');
      expect(content).toContain('.git');
    });

    it('deve configurar no Cloud Run as variáveis de ambiente necessárias para evitar o crash de inicialização', () => {
      const hcl = readFileSync(cloudRunModulePath, 'utf-8');
      expect(hcl).toContain('BLIND_INDEX_PEPPER');
      expect(hcl).toContain('LGPD_SECRET_PEPPER');
      expect(hcl).toContain('SESSION_SECRET');
    });

    it('deve configurar startup_probe resiliente com tolerância adequada para evitar falso-positivo', () => {
      const hcl = readFileSync(cloudRunModulePath, 'utf-8');
      expect(hcl).toContain('startup_probe');
      expect(hcl).toContain('path = "/health"');
      // Threshold resiliente de no mínimo 10 falhas e timeout >= 4s
      expect(hcl).toMatch(/failure_threshold\s*=\s*(1[0-9]|[2-9][0-9])/);
      expect(hcl).toMatch(/timeout_seconds\s*=\s*[4-9]/);
    });

    it('deve parametrizar regras do Firestore para permitir execução em ambientes sem roles/firebaserules.admin', () => {
      const hcl = readFileSync(firestoreModulePath, 'utf-8');
      expect(hcl).toContain('enable_security_rules');
    });
  });
});
