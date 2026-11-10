#!/usr/bin/env node
/**
 * Script de Migração Direta do Banco de Dados Firestore: MacroMetrics Pro
 *
 * Atualiza os documentos da coleção 'diaries' para utilizarem o blindUserId e ID de documento canônico
 * correspondente ao usuário ativo.
 *
 * Uso:
 *   pnpm tsx scripts/migrate-firestore-diaries.ts [userEmailOrId]
 * Exemplo:
 *   pnpm tsx scripts/migrate-firestore-diaries.ts thcborges@gmail.com
 */

import { Firestore } from '@google-cloud/firestore';
import { generateBlindIndex } from '@dieta-ai/core';

// Tenta carregar variáveis de ambiente de arquivos .env locais se existirem
try {
  process.loadEnvFile();
} catch {
  // Ignora se não existir
}
try {
  process.loadEnvFile('apps/api/.env');
} catch {
  // Ignora se não existir
}

process.on('uncaughtException', (err: any) => {
  if (err?.message?.includes('default credentials') || err?.message?.includes('NO_ADC_FOUND')) {
    console.error('\n❌ Erro de Autenticação GCP: Credenciais do Google Cloud não encontradas no ambiente local.');
    console.error('\nPara conectar e atualizar o Firestore no GCP dev/prd:');
    console.error('  1. Execute no terminal a autenticação do Google Cloud CLI:');
    console.error('     gcloud auth application-default login');
    console.error('  2. Em seguida, re-execute o script:');
    console.error('     pnpm migrate:diaries thcborges@gmail.com');
    console.error('\nOu se estiver testando com o Firestore Emulator local:');
    console.error('  export FIRESTORE_EMULATOR_HOST=localhost:8080');
    console.error('  pnpm migrate:diaries thcborges@gmail.com');
    process.exit(1);
  }
  console.error(err);
  process.exit(1);
});

async function main() {
  const targetInput = process.argv[2] || process.env.TARGET_USER_EMAIL || 'thcborges@gmail.com';
  const targetEmail = targetInput.includes('@') ? targetInput.trim().toLowerCase() : targetInput;
  const targetUserId = targetInput.startsWith('usr_')
    ? targetInput
    : `usr_${targetEmail.replace(/[^a-zA-Z0-9]/g, '_')}`;

  const pepper =
    process.env.BLIND_INDEX_PEPPER ||
    process.env.LGPD_SECRET_PEPPER ||
    'test-blind-index-pepper-32chars!!';

  const targetBlindUserId = generateBlindIndex(targetUserId, pepper);

  console.log('=== MacroMetrics Pro: Migração Direta de Diários no Firestore ===');
  console.log(`• Usuário Alvo: ${targetUserId}`);
  console.log(`• Blind User ID Canônico: ${targetBlindUserId}`);
  console.log(`• Projeto GCP: ${process.env.FIRESTORE_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT || 'thcborges-dieta-ai-dev'}`);

  const projectId =
    process.env.FIRESTORE_PROJECT_ID ||
    process.env.GOOGLE_CLOUD_PROJECT ||
    'thcborges-dieta-ai-dev';

  const db = new Firestore({ projectId });
  const diariesRef = db.collection('diaries');

  console.log('\n[1/3] Consultando coleção "diaries"...');
  let snapshot;
  try {
    snapshot = await diariesRef.get();
  } catch (err: any) {
    if (err?.message?.includes('default credentials') || err?.message?.includes('NO_ADC_FOUND')) {
      console.error('\n❌ Erro de Autenticação GCP: Credenciais do Google Cloud não encontradas no ambiente local.');
      console.error('\nPara conectar e atualizar o Firestore no GCP dev/prd:');
      console.error('  1. Execute no terminal:');
      console.error('     gcloud auth application-default login');
      console.error('  2. Em seguida, re-execute o script:');
      console.error('     pnpm migrate:diaries thcborges@gmail.com');
      console.error('\nOu se estiver usando o Firestore Emulator local:');
      console.error('  export FIRESTORE_EMULATOR_HOST=localhost:8080');
      console.error('  pnpm migrate:diaries thcborges@gmail.com');
      process.exit(1);
    }
    throw err;
  }
  console.log(`✓ Total de documentos encontrados na coleção diaries: ${snapshot.docs.length}`);

  if (snapshot.empty) {
    console.log('Nenhum documento encontrado na coleção. Encerrando migração.');
    return;
  }

  let migratedCount = 0;
  let alreadyCorrectCount = 0;

  console.log('\n[2/3] Analisando e atualizando documentos...');
  for (const doc of snapshot.docs) {
    const data = doc.data();
    const currentDocId = doc.id;
    const currentBlindUserId = data.blindUserId;
    const date = data.date || currentDocId.split('_').slice(-1)[0];

    const targetDocId = `${targetBlindUserId}_${date}`;

    if (currentDocId === targetDocId && currentBlindUserId === targetBlindUserId) {
      alreadyCorrectCount++;
      console.log(`  - [OK] ${currentDocId} já possui o ID canônico correto.`);
      continue;
    }

    console.log(`  - [MIGRANDO] ${currentDocId} ➔ ${targetDocId}`);

    const updatedData = {
      ...data,
      blindUserId: targetBlindUserId,
      date,
      updatedAt: new Date().toISOString(),
    };

    // Cria/atualiza o documento com a chave canônica e remove o legado
    await diariesRef.doc(targetDocId).set(updatedData, { merge: true });
    if (currentDocId !== targetDocId) {
      await doc.ref.delete();
    }

    migratedCount++;
    console.log(`    ✓ Migrado com sucesso.`);
  }

  console.log('\n[3/3] Resumo da Migração:');
  console.log(`• Documentos já corretos: ${alreadyCorrectCount}`);
  console.log(`• Documentos migrados para o ID canônico: ${migratedCount}`);
  console.log(`• Total processado: ${snapshot.docs.length}`);
  console.log('\n✓ Migração concluída com sucesso!');
}

main().catch((err: any) => {
  console.error('\n❌ Erro durante a execução da migração:');
  if (err?.message?.includes('default credentials') || err?.message?.includes('NO_ADC_FOUND')) {
    console.error('Credenciais do Google Cloud não encontradas no ambiente local.');
    console.error('\nPara conectar ao Firestore no projeto GCP dev/prd:');
    console.error('  1. Execute a autenticação padrão do Google Cloud CLI:');
    console.error('     gcloud auth application-default login');
    console.error('  2. Em seguida, re-execute este script.');
    console.error('\nAlternativamente, para conectar ao Firestore Emulator local:');
    console.error('  export FIRESTORE_EMULATOR_HOST=localhost:8080');
    console.error('  pnpm migrate:diaries thcborges@gmail.com');
  } else {
    console.error(err);
  }
  process.exit(1);
});
