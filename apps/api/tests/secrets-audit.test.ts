import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { FirestoreDiaryService } from '../src/services/firestore-diary.service.js';

describe('Auditoria de Segredos e Fallbacks Hardcoded (Zero-Trust Etapa 1)', () => {
  it('não deve conter admin-secret-token-key-us-central1 no código do frontend (apps/web)', () => {
    const webSrcDir = path.resolve(__dirname, '../../web/src');
    
    function scanDir(dir: string): string[] {
      let results: string[] = [];
      const list = fs.readdirSync(dir);
      for (const file of list) {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        if (stat.isDirectory()) {
          results = results.concat(scanDir(filePath));
        } else if (file.endsWith('.ts') || file.endsWith('.tsx') || file.endsWith('.js')) {
          results.push(filePath);
        }
      }
      return results;
    }

    const files = scanDir(webSrcDir);
    for (const file of files) {
      const content = fs.readFileSync(file, 'utf8');
      expect(content).not.toContain('admin-secret-token-key-us-central1');
    }
  });

  it('deve lançar erro se BLIND_INDEX_PEPPER não estiver configurado em ambiente de produção', () => {
    const originalEnv = process.env.NODE_ENV;
    const originalPepper = process.env.BLIND_INDEX_PEPPER;
    const originalLgpd = process.env.LGPD_SECRET_PEPPER;

    try {
      process.env.NODE_ENV = 'production';
      delete process.env.BLIND_INDEX_PEPPER;
      delete process.env.LGPD_SECRET_PEPPER;

      expect(() => {
        new FirestoreDiaryService();
      }).toThrow(/BLIND_INDEX_PEPPER deve ser definido/i);
    } finally {
      process.env.NODE_ENV = originalEnv;
      if (originalPepper) process.env.BLIND_INDEX_PEPPER = originalPepper;
      if (originalLgpd) process.env.LGPD_SECRET_PEPPER = originalLgpd;
    }
  });
});
