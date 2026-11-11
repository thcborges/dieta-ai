#!/usr/bin/env node
/**
 * Script de Consolidação de Dados do Usuário Fantasma para o Usuário Oficial
 *
 * Transfere o diário de 2026-11-10 e eventuais dados associados ao blindUserId fantasma
 * (7487192a4104034a352b3b81d2cd8398257d472cab81105c972de2ffc81d2975 - thcborges@example.com)
 * para o blindUserId oficial (2fe41087c35ed7bce5a7f63d289cdebad62dbb7e37958a0c878f9637170e8b42 - thcborges@gmail.com).
 *
 * Uso:
 *   pnpm tsx scripts/consolidate-ghost-user-data.ts [--prd | --dev]
 */

import { Firestore } from '@google-cloud/firestore';
import { generateBlindIndex, canonicalizeUserId } from '@dieta-ai/core';
import crypto from 'node:crypto';

try {
  process.loadEnvFile();
} catch {}
try {
  process.loadEnvFile('apps/api/.env');
} catch {}

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
    'thcborges-dieta-ai-prd';

  console.log('=== MacroMetrics Pro: Consolidação de Dados entre Contas ===');
  console.log(`• Projeto GCP Selecionado: ${projectId}`);

  const defaultDeterministicPepper = crypto
    .createHash('sha256')
    .update(`macrometrics-pro-lgpd-pepper-${projectId}`)
    .digest('hex');

  const pepper =
    process.env.BLIND_INDEX_PEPPER ||
    process.env.LGPD_SECRET_PEPPER ||
    defaultDeterministicPepper;

  const targetEmail = 'thcborges@gmail.com';
  const ghostEmail = 'thcborges@example.com';

  const targetCanonical = canonicalizeUserId(targetEmail);
  const ghostCanonical = canonicalizeUserId(ghostEmail);

  const targetBlindUserId = generateBlindIndex(targetCanonical, pepper);
  const ghostBlindUserId = generateBlindIndex(ghostCanonical, pepper);

  console.log(`• Usuário Alvo Oficial: ${targetCanonical} (blind: ${targetBlindUserId})`);
  console.log(`• Usuário Fantasma: ${ghostCanonical} (blind: ${ghostBlindUserId})`);

  const db = new Firestore({ projectId });

  // 1. Migração de Diários
  console.log('\n[1/3] Verificando diários sob o usuário fantasma...');
  const ghostDiariesSnap = await db.collection('diaries').where('blindUserId', '==', ghostBlindUserId).get();
  console.log(`✓ Total de diários encontrados para o usuário fantasma: ${ghostDiariesSnap.docs.length}`);

  for (const doc of ghostDiariesSnap.docs) {
    const data = doc.data();
    const date = data.date || doc.id.split('_').slice(-1)[0];
    const targetDocId = `${targetBlindUserId}_${date}`;
    const targetDocRef = db.collection('diaries').doc(targetDocId);

    console.log(`  - Migrando diário da data ${date}:`);
    console.log(`    De: ${doc.id}`);
    console.log(`    Para: ${targetDocId}`);

    const existingTargetDoc = await targetDocRef.get();
    if (existingTargetDoc.exists) {
      console.log(`    ⚠️ Diário destino ${targetDocId} já existe. Mesclando refeições...`);
      const existingData = existingTargetDoc.data() || {};
      const mergedMeals: Record<string, any[]> = {
        breakfast: [...(existingData.meals?.breakfast || []), ...(data.meals?.breakfast || [])],
        lunch: [...(existingData.meals?.lunch || []), ...(data.meals?.lunch || [])],
        afternoon_snack: [...(existingData.meals?.afternoon_snack || []), ...(data.meals?.afternoon_snack || [])],
        dinner_event: [...(existingData.meals?.dinner_event || []), ...(data.meals?.dinner_event || [])],
      };
      await targetDocRef.set(
        {
          ...data,
          blindUserId: targetBlindUserId,
          date,
          meals: mergedMeals,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );
    } else {
      await targetDocRef.set({
        ...data,
        blindUserId: targetBlindUserId,
        date,
        updatedAt: new Date().toISOString(),
      });
    }

    await doc.ref.delete();
    console.log(`    ✓ Diário copiado para o destino e documento fantasma removido.`);
  }

  // 2. Verificação de Alimentos Customizados (foods_cache)
  console.log('\n[2/3] Verificando alimentos customizados sob o usuário fantasma...');
  const ghostFoodsSnap = await db.collection('foods_cache').where('blindUserId', '==', ghostBlindUserId).get();
  console.log(`✓ Total de alimentos customizados encontrados para o usuário fantasma: ${ghostFoodsSnap.docs.length}`);

  for (const fDoc of ghostFoodsSnap.docs) {
    console.log(`  - Transferindo alimento customizado "${fDoc.data().name || fDoc.id}" para ${targetBlindUserId}`);
    await fDoc.ref.update({
      blindUserId: targetBlindUserId,
      updatedAt: new Date().toISOString(),
    });
  }

  // 3. Verificação de Receitas (recipes)
  console.log('\n[3/3] Verificando receitas sob o usuário fantasma...');
  const ghostRecipesSnap = await db.collection('recipes').where('blindUserId', '==', ghostBlindUserId).get();
  console.log(`✓ Total de receitas encontradas para o usuário fantasma: ${ghostRecipesSnap.docs.length}`);

  for (const rDoc of ghostRecipesSnap.docs) {
    console.log(`  - Transferindo receita "${rDoc.data().name || rDoc.id}" para ${targetBlindUserId}`);
    await rDoc.ref.update({
      blindUserId: targetBlindUserId,
      updatedAt: new Date().toISOString(),
    });
  }

  console.log('\n✅ Consolidação concluída com sucesso!');
}

main().catch(err => {
  console.error('\n❌ Erro durante a consolidação:', err);
  process.exit(1);
});
