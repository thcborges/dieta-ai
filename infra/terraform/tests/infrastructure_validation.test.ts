import { describe, it, expect } from 'vitest';
import { execSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

describe('Terraform Infrastructure Policy & Integration Suite', () => {
  const terraformRoot = resolve(__dirname, '..');
  const devEnvPath = resolve(terraformRoot, 'environments/dev');
  const prdEnvPath = resolve(terraformRoot, 'environments/prd');
  const cloudRunModule = resolve(terraformRoot, 'modules/cloud_run/main.tf');
  const firestoreModule = resolve(terraformRoot, 'modules/firestore/main.tf');
  const pubsubModule = resolve(terraformRoot, 'modules/pubsub/main.tf');
  const loggingSinkModule = resolve(terraformRoot, 'modules/logging_sink/main.tf');

  const testEnv = {
    ...process.env,
    PATH: `${process.env.HOME || ''}/.local/bin:${process.env.PATH || ''}`,
  };

  it('deve formatar perfeitamente todo o código HCL (terraform fmt -check)', () => {
    expect(() => {
      execSync('terraform fmt -check -recursive', {
        cwd: terraformRoot,
        stdio: 'pipe',
        env: testEnv,
      });
    }).not.toThrow();
  });

  it('deve garantir que todos os arquivos de módulos e ambientes existem', () => {
    expect(existsSync(cloudRunModule)).toBe(true);
    expect(existsSync(firestoreModule)).toBe(true);
    expect(existsSync(pubsubModule)).toBe(true);
    expect(existsSync(loggingSinkModule)).toBe(true);
    expect(existsSync(resolve(devEnvPath, 'main.tf'))).toBe(true);
    expect(existsSync(resolve(prdEnvPath, 'main.tf'))).toBe(true);
  });

  it('deve auditar regra inquebrável: região deve ser estritamente us-central1 (Free Tier)', () => {
    const devHcl = readFileSync(resolve(devEnvPath, 'main.tf'), 'utf-8');
    const prdHcl = readFileSync(resolve(prdEnvPath, 'main.tf'), 'utf-8');
    const cloudRunHcl = readFileSync(cloudRunModule, 'utf-8');
    const firestoreHcl = readFileSync(firestoreModule, 'utf-8');

    expect(devHcl).toContain('"us-central1"');
    expect(prdHcl).toContain('"us-central1"');
    expect(cloudRunHcl).toContain('var.region == "us-central1"');
    expect(firestoreHcl).toContain('var.region == "us-central1"');
  });

  it('deve auditar regra do Free Tier: Cloud Run deve ter min_instance_count = 0 (scale to zero)', () => {
    const cloudRunHcl = readFileSync(cloudRunModule, 'utf-8');
    expect(cloudRunHcl).toContain('min_instance_count = 0');
    expect(cloudRunHcl).toContain('memory = "256Mi"');
  });

  it('deve auditar regra de banco de dados: Firestore em modo nativo (FIRESTORE_NATIVE)', () => {
    const firestoreHcl = readFileSync(firestoreModule, 'utf-8');
    expect(firestoreHcl).toContain('type                        = "FIRESTORE_NATIVE"');
  });

  it('deve auditar pipeline de auto-recuperação: tópico Pub/Sub e Logging Sink de erros', () => {
    const devHcl = readFileSync(resolve(devEnvPath, 'main.tf'), 'utf-8');
    const sinkHcl = readFileSync(loggingSinkModule, 'utf-8');

    expect(devHcl).toContain('"dieta-ai-errors-dev"');
    expect(sinkHcl).toContain('severity >= ERROR');
    expect(sinkHcl).toContain('roles/pubsub.publisher');
  });

  it('deve validar sintaxe e inicialização dos ambientes dev e prd (terraform validate)', () => {
    // Inicializa dev localmente sem backend remoto
    execSync('terraform init -backend=false', {
      cwd: devEnvPath,
      stdio: 'pipe',
      env: testEnv,
    });

    const devValidate = execSync('terraform validate', {
      cwd: devEnvPath,
      stdio: 'pipe',
      encoding: 'utf-8',
      env: testEnv,
    });
    expect(devValidate).toContain('The configuration is valid');

    // Inicializa prd localmente sem backend remoto
    execSync('terraform init -backend=false', {
      cwd: prdEnvPath,
      stdio: 'pipe',
      env: testEnv,
    });

    const prdValidate = execSync('terraform validate', {
      cwd: prdEnvPath,
      stdio: 'pipe',
      encoding: 'utf-8',
      env: testEnv,
    });
    expect(prdValidate).toContain('The configuration is valid');
  }, 60000);
});
