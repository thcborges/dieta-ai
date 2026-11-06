import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

describe('Project Documentation & Licensing Suite', () => {
  const repoRoot = path.resolve(__dirname, '../../..');
  const readmePath = path.join(repoRoot, 'README.md');
  const licensePath = path.join(repoRoot, 'LICENSE');

  it('deve garantir que o arquivo README.md existe na raiz do repositório', () => {
    expect(fs.existsSync(readmePath)).toBe(true);
  });

  it('deve validar que README.md documenta MacroMetrics Pro, arquitetura, módulos e comandos essenciais', () => {
    expect(fs.existsSync(readmePath)).toBe(true);
    const content = fs.readFileSync(readmePath, 'utf-8');

    // Identidade do produto
    expect(content).toContain('MacroMetrics Pro');
    expect(content).toContain('dieta-ai');

    // Módulos centrais
    expect(content).toContain('Mifflin-St Jeor');
    expect(content).toContain('Vertex AI');

    // Stack tecnológica e execução
    expect(content).toContain('pnpm');
    expect(content).toContain('GCP');

    // Licença declarada
    expect(content).toContain('GNU General Public License v3.0');
  });

  it('deve garantir que o arquivo LICENSE existe na raiz com o texto oficial da GNU General Public License v3 (GPLv3)', () => {
    expect(fs.existsSync(licensePath)).toBe(true);
    const licenseContent = fs.readFileSync(licensePath, 'utf-8');

    expect(licenseContent).toContain('GNU GENERAL PUBLIC LICENSE');
    expect(licenseContent).toContain('Version 3, 29 June 2007');
    expect(licenseContent).toContain('Free Software Foundation, Inc.');
  });
});
