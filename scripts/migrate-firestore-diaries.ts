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
import crypto from 'node:crypto';

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

function handleGcpError(err: any, projectId: string) {
  const msg = err?.message || String(err);

  if (msg.includes('Cloud Firestore API has not been used') || msg.includes('it is disabled') || msg.includes('SERVICE_DISABLED')) {
    console.error(`\n❌ API do Firestore não habilitada no projeto "${projectId}".`);
    console.error('\nSe os seus dados foram gerados no ambiente de PRODUÇÃO (onde o app roda):');
    console.error('  Execute apontando para o projeto de produção:');
    console.error('     pnpm migrate:diaries thcborges@gmail.com --prd');
    console.error('\nOu se deseja habilitar a API no projeto informado:');
    console.error(`     gcloud services enable firestore.googleapis.com --project ${projectId}`);
    return true;
  }

  if (msg.includes('default credentials') || msg.includes('NO_ADC_FOUND')) {
    console.error('\n❌ Erro de Autenticação GCP: Credenciais do Google Cloud não encontradas no ambiente local.');
    console.error('\nPara conectar e atualizar o Firestore no GCP dev/prd:');
    console.error('  1. Execute no terminal a autenticação do Google Cloud CLI:');
    console.error('     gcloud auth application-default login');
    console.error('  2. Em seguida, re-execute o script:');
    console.error('     pnpm migrate:diaries thcborges@gmail.com --prd');
    console.error('\nOu se estiver testando com o Firestore Emulator local:');
    console.error('  export FIRESTORE_EMULATOR_HOST=localhost:8080');
    console.error('  pnpm migrate:diaries thcborges@gmail.com');
    return true;
  }

  return false;
}

process.on('uncaughtException', (err: any) => {
  const projectId = process.env.FIRESTORE_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT || 'thcborges-dieta-ai-prd';
  if (handleGcpError(err, projectId)) {
    process.exit(1);
  }
  console.error(err);
  process.exit(1);
});

async function main() {
  const args = process.argv.slice(2);
  const isDev = args.includes('--dev') || args.includes('dev');
  const isPrd = args.includes('--prd') || args.includes('--prod') || args.includes('prd') || args.includes('production');
  const projectArg = args.find(a => (a.startsWith('thcborges-') || a.startsWith('--project=')) && !a.includes('@'));
  const customProject = projectArg?.replace('--project=', '');

  const projectId =
    customProject ||
    (isDev ? 'thcborges-dieta-ai-dev' : null) ||
    (isPrd ? 'thcborges-dieta-ai-prd' : null) ||
    process.env.FIRESTORE_PROJECT_ID ||
    process.env.GOOGLE_CLOUD_PROJECT ||
    'thcborges-dieta-ai-prd'; // Padrão: produção onde o usuário utiliza o app e tem dados

  const userInput = args.find(a => !a.startsWith('--') && a !== 'prd' && a !== 'dev' && a !== 'production') || process.env.TARGET_USER_EMAIL || 'thcborges@gmail.com';
  const targetEmail = userInput.includes('@') ? userInput.trim().toLowerCase() : userInput;
  const targetUserId = userInput.startsWith('usr_')
    ? userInput
    : `usr_${targetEmail.replace(/[^a-zA-Z0-9]/g, '_')}`;

  const defaultDeterministicPepper = crypto
    .createHash('sha256')
    .update(`macrometrics-pro-lgpd-pepper-${projectId}`)
    .digest('hex');

  const pepper =
    process.env.BLIND_INDEX_PEPPER ||
    process.env.LGPD_SECRET_PEPPER ||
    defaultDeterministicPepper;

  const targetBlindUserId = generateBlindIndex(targetUserId, pepper);

  console.log('=== MacroMetrics Pro: Migração e Sincronização Relacional Firestore ===');
  console.log(`• Usuário Alvo: ${targetUserId}`);
  console.log(`• E-mail: ${targetEmail}`);
  console.log(`• Blind User ID Canônico: ${targetBlindUserId}`);
  console.log(`• Projeto GCP Selecionado: ${projectId}`);

  const db = new Firestore({ projectId });

  // [1/4] Collection 'users': Garante persistência das informações do usuário
  console.log('\n[1/4] Sincronizando coleção "users"...');
  const userRef = db.collection('users').doc(targetUserId);
  const userDoc = await userRef.get();
  const now = new Date().toISOString();

  if (!userDoc.exists) {
    await userRef.set({
      id: targetUserId,
      user_id: targetUserId,
      email: targetEmail,
      name: 'Thiago Borges',
      blindUserId: targetBlindUserId,
      isAdmin: true,
      createdAt: now,
      updatedAt: now,
      lastLoginAt: now,
    });
    console.log(`  ✓ Documento do usuário criado com sucesso em "users/${targetUserId}".`);
  } else {
    await userRef.set(
      {
        id: targetUserId,
        user_id: targetUserId,
        email: targetEmail,
        blindUserId: targetBlindUserId,
        isAdmin: true,
        updatedAt: now,
        lastLoginAt: now,
      },
      { merge: true }
    );
    console.log(`  ✓ Documento do usuário atualizado em "users/${targetUserId}".`);
  }

  // [2/4] Collection 'diaries': Sincroniza userId e blindUserId
  console.log('\n[2/4] Consultando e atualizando coleção "diaries"...');
  const diariesRef = db.collection('diaries');
  let snapshot;
  try {
    snapshot = await diariesRef.get();
  } catch (err: any) {
    if (handleGcpError(err, projectId)) {
      process.exit(1);
    }
    throw err;
  }
  console.log(`✓ Total de documentos encontrados na coleção diaries: ${snapshot.docs.length}`);

  let migratedCount = 0;
  let alreadyCorrectCount = 0;

  for (const doc of snapshot.docs) {
    const data = doc.data();
    const currentDocId = doc.id;
    const currentBlindUserId = data.blindUserId;
    const date = data.date || currentDocId.split('_').slice(-1)[0];

    const targetDocId = `${targetBlindUserId}_${date}`;

    const updatedData = {
      ...data,
      userId: targetUserId,
      user_id: targetUserId,
      blindUserId: targetBlindUserId,
      date,
      updatedAt: new Date().toISOString(),
    };

    if (currentDocId === targetDocId && currentBlindUserId === targetBlindUserId && data.userId === targetUserId) {
      alreadyCorrectCount++;
      continue;
    }

    console.log(`  - [MIGRANDO] ${currentDocId} ➔ ${targetDocId}`);
    await diariesRef.doc(targetDocId).set(updatedData, { merge: true });
    if (currentDocId !== targetDocId) {
      await doc.ref.delete();
    }
    migratedCount++;
  }
  console.log(`  ✓ Diários já corretos: ${alreadyCorrectCount}, Diários migrados: ${migratedCount}`);

  // [3/4] Collection 'recipes': Atualiza relacionamento userId
  console.log('\n[3/4] Sincronizando relacionamento na coleção "recipes"...');
  try {
    const recipesSnap = await db.collection('recipes').get();
    let recipesUpdated = 0;
    for (const rDoc of recipesSnap.docs) {
      const rData = rDoc.data();
      if (rData.userId === targetEmail || !rData.user_id) {
        await rDoc.ref.set(
          {
            userId: targetUserId,
            user_id: targetUserId,
            blindUserId: targetBlindUserId,
            updatedAt: new Date().toISOString(),
          },
          { merge: true }
        );
        recipesUpdated++;
      }
    }
    console.log(`  ✓ Receitas analisadas: ${recipesSnap.docs.length}, atualizadas: ${recipesUpdated}`);
  } catch (e: any) {
    console.log(`  (Aviso receitas: ${e.message})`);
  }

  // [4/4] Collection 'foods_cache': Atualiza alimentos customizados
  console.log('\n[4/4] Sincronizando relacionamento em "foods_cache"...');
  try {
    const foodsSnap = await db.collection('foods_cache').get();
    let foodsUpdated = 0;
    for (const fDoc of foodsSnap.docs) {
      const fData = fDoc.data();
      if (fData.userId === targetEmail || (fData.userId && fData.userId.includes('@'))) {
        await fDoc.ref.set(
          {
            userId: targetUserId,
            user_id: targetUserId,
          },
          { merge: true }
        );
        foodsUpdated++;
      }
    }
    console.log(`  ✓ Alimentos analisados: ${foodsSnap.docs.length}, customizados atualizados: ${foodsUpdated}`);
  } catch (e: any) {
    console.log(`  (Aviso foods_cache: ${e.message})`);
  }

  console.log('\n✓ Migração e sincronização relacional concluídas com sucesso!');
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
