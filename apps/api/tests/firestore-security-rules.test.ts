import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

describe('Firestore Security Rules & Zero-Trust Database Isolation Policy (BDD)', () => {
  const repoRoot = resolve(__dirname, '../../../');
  const firestoreRulesPath = resolve(repoRoot, 'firestore.rules');
  const firebaseJsonPath = resolve(repoRoot, 'firebase.json');
  const firestoreModulePath = resolve(repoRoot, 'infra/terraform/modules/firestore/main.tf');
  const dockerComposePath = resolve(repoRoot, 'docker-compose.emulator.yml');

  it('deve possuir o arquivo firestore.rules na raiz do projeto com bloqueio total a clientes externos', () => {
    expect(existsSync(firestoreRulesPath)).toBe(true);

    const rulesContent = readFileSync(firestoreRulesPath, 'utf-8');
    expect(rulesContent).toContain("rules_version = '2'");
    expect(rulesContent).toContain('service cloud.firestore');
    expect(rulesContent).toContain('match /databases/{database}/documents');
    expect(rulesContent).toContain('match /{document=**}');
    expect(rulesContent).toMatch(/allow\s+read,\s*write\s*:\s*if\s+false\s*;/);

    // Garantir que não existem permissões permissivas ou bypass
    expect(rulesContent).not.toMatch(/allow\s+read\s*:\s*if\s+true/);
    expect(rulesContent).not.toMatch(/allow\s+write\s*:\s*if\s+true/);
    expect(rulesContent).not.toMatch(/allow\s+read,\s*write\s*:\s*if\s+true/);
  });

  it('deve vincular o arquivo firestore.rules no firebase.json para deploy de segurança', () => {
    expect(existsSync(firebaseJsonPath)).toBe(true);

    const firebaseJson = JSON.parse(readFileSync(firebaseJsonPath, 'utf-8'));
    expect(firebaseJson.firestore).toBeDefined();
    expect(firebaseJson.firestore.rules).toBe('firestore.rules');
  });

  it('deve gerenciar a regra do Firestore como recurso de infraestrutura no Terraform', () => {
    expect(existsSync(firestoreModulePath)).toBe(true);

    const firestoreTf = readFileSync(firestoreModulePath, 'utf-8');
    expect(firestoreTf).toContain('google_firebaserules_ruleset');
    expect(firestoreTf).toContain('google_firebaserules_release');
    expect(firestoreTf).toContain('firestore.rules');
  });

  it('deve configurar o Firestore Emulator local com o arquivo firestore.rules', () => {
    expect(existsSync(dockerComposePath)).toBe(true);

    const dockerCompose = readFileSync(dockerComposePath, 'utf-8');
    expect(dockerCompose).toContain('firestore.rules');
  });
});
