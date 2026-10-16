import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('Regression Test: Web Build & Test Coverage Configuration', () => {
  const viteConfigPath = resolve(__dirname, '../vite.config.ts');

  it('deve excluir o diretório dist/** da cobertura de código para evitar contaminação por artefatos de build', () => {
    const configContent = readFileSync(viteConfigPath, 'utf-8');
    expect(configContent).toContain("'dist/**'");
  });

  it('deve restringir a inclusão da cobertura estritamente aos arquivos-fonte em src/**', () => {
    const configContent = readFileSync(viteConfigPath, 'utf-8');
    expect(configContent).toContain("include: ['src/**/*.{ts,tsx}']");
  });

  it('deve garantir limiar estrito de cobertura de linhas >= 90% no vite.config.ts', () => {
    const configContent = readFileSync(viteConfigPath, 'utf-8');
    expect(configContent).toMatch(/lines:\s*90/);
  });
});
