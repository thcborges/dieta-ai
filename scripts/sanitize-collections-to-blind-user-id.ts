#!/usr/bin/env node
/**
 * Script de Sanitização e Conformidade LGPD Firestore: MacroMetrics Pro
 *
 * Remove os campos 'userId' e 'user_id' com e-mails nas coleções dependentes
 * ('diaries', 'recipes', 'foods_cache', 'user_goals') e garante o relacionamento
 * estrito exclusivamente via 'blindUserId'.
 *
 * Uso:
 *   pnpm tsx scripts/sanitize-collections-to-blind-user-id.ts [--dev | --prd]
 */

import { Firestore, FieldValue } from '@google-cloud/firestore';
import { generateBlindIndex, canonicalizeUserId } from '@dieta-ai/core';
import crypto from 'node:crypto';

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

  console.log('=== MacroMetrics Pro: Sanitização de Collections por blindUserId ===');
  console.log(`• Projeto GCP Selecionado: ${projectId}`);

  const defaultDeterministicPepper = crypto
    .createHash('sha256')
    .update(`macrometrics-pro-lgpd-pepper-${projectId}`)
    .digest('hex');

  const pepper =
    process.env.BLIND_INDEX_PEPPER ||
    process.env.LGPD_SECRET_PEPPER ||
    defaultDeterministicPepper;

  const db = new Firestore({ projectId });

  // 1. Obter todos os usuários da coleção 'users'
  console.log('\n[1/5] Lendo usuários da coleção "users"...');
  const usersSnap = await db.collection('users').get();
  console.log(`✓ Total de usuários encontrados: ${usersSnap.docs.length}`);

  interface UserMapping {
    canonicalId: string;
    blindUserId: string;
    email: string;
  }

  const users: UserMapping[] = [];

  for (const uDoc of usersSnap.docs) {
    const uData = uDoc.data();
    const email = (uData.email || '').toLowerCase().trim();
    const canonicalId = uData.id || canonicalizeUserId(email || uDoc.id);
    let blindUserId = uData.blindUserId;

    if (!blindUserId || !/^[a-f0-9]{64}$/i.test(blindUserId)) {
      blindUserId = generateBlindIndex(canonicalId, pepper);
      await uDoc.ref.update({
        blindUserId,
        updatedAt: new Date().toISOString(),
      });
      console.log(`  ✓ blindUserId atualizado no usuário "${canonicalId}": ${blindUserId}`);
    }

    users.push({ canonicalId, blindUserId, email });
    console.log(`  • Usuário: ${email} -> canonical: ${canonicalId} -> blind: ${blindUserId}`);
  }

  // Fallback caso não haja usuários cadastrados mas um email alvo foi fornecido
  if (users.length === 0) {
    const targetEmail = (process.env.TARGET_USER_EMAIL || 'thcborges@gmail.com').toLowerCase().trim();
    const canonicalId = canonicalizeUserId(targetEmail);
    const blindUserId = generateBlindIndex(canonicalId, pepper);
    users.push({ canonicalId, blindUserId, email: targetEmail });
    console.log(`  • Usuário fallback criado: ${targetEmail} -> ${blindUserId}`);
  }

  // Mapeamentos rápidos
  const canonicalToBlind = new Map<string, string>();
  const emailToBlind = new Map<string, string>();
  for (const u of users) {
    canonicalToBlind.set(u.canonicalId, u.blindUserId);
    if (u.email) emailToBlind.set(u.email, u.blindUserId);
  }

  const resolveBlind = (rawId?: string): string | null => {
    if (!rawId) return null;
    if (/^[a-f0-9]{64}$/i.test(rawId)) return rawId;
    if (canonicalToBlind.has(rawId)) return canonicalToBlind.get(rawId)!;
    if (emailToBlind.has(rawId.toLowerCase())) return emailToBlind.get(rawId.toLowerCase())!;
    const canon = canonicalizeUserId(rawId);
    if (canonicalToBlind.has(canon)) return canonicalToBlind.get(canon)!;
    return generateBlindIndex(canon, pepper);
  };

  // 2. Sanitizar coleção 'diaries'
  console.log('\n[2/5] Sanitizando coleção "diaries"...');
  const diariesSnap = await db.collection('diaries').get();
  console.log(`✓ Total de diários encontrados: ${diariesSnap.docs.length}`);

  let diariesSanitized = 0;
  for (const dDoc of diariesSnap.docs) {
    const dData = dDoc.data();
    const docId = dDoc.id;
    const rawUserId = dData.userId || dData.user_id;
    const date = dData.date || docId.split('_').slice(-1)[0];
    const blind = dData.blindUserId || resolveBlind(rawUserId);

    if (!blind) {
      console.warn(`  ⚠️ Não foi possível determinar blindUserId para diário ${docId}. Ignorando.`);
      continue;
    }

    const targetDocId = `${blind}_${date}`;
    const updates: Record<string, any> = {
      blindUserId: blind,
      date,
      meals: dData.meals || { breakfast: [], lunch: [], afternoon_snack: [], dinner_event: [] },
      totals: dData.totals || { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 },
      updatedAt: new Date().toISOString(),
    };

    if (dData.userId !== undefined || dData.user_id !== undefined || docId !== targetDocId) {
      if (docId !== targetDocId) {
        // Move para o novo doc ID limpo
        await db.collection('diaries').doc(targetDocId).set(updates);
        await dDoc.ref.delete();
      } else {
        // Atualiza removendo userId e user_id
        await dDoc.ref.update({
          ...updates,
          userId: FieldValue.delete(),
          user_id: FieldValue.delete(),
        });
      }
      diariesSanitized++;
    }
  }
  console.log(`✓ Diários sanitizados (campos userId/user_id removidos): ${diariesSanitized}`);

  // 3. Sanitizar coleção 'recipes'
  console.log('\n[3/5] Sanitizando coleção "recipes"...');
  const recipesSnap = await db.collection('recipes').get();
  console.log(`✓ Total de receitas encontradas: ${recipesSnap.docs.length}`);

  let recipesSanitized = 0;
  for (const rDoc of recipesSnap.docs) {
    const rData = rDoc.data();
    const rawUserId = rData.userId || rData.user_id;
    const blind = rData.blindUserId || resolveBlind(rawUserId);

    const hasIngredients = Array.isArray(rData.ingredients) && rData.ingredients.length > 0;
    const ingredients = hasIngredients ? rData.ingredients : [];

    const updates: Record<string, any> = {
      ...(blind ? { blindUserId: blind } : {}),
      ingredients,
      updatedAt: new Date().toISOString(),
    };

    if (rData.userId !== undefined || rData.user_id !== undefined || !rData.blindUserId) {
      await rDoc.ref.update({
        ...updates,
        userId: FieldValue.delete(),
        user_id: FieldValue.delete(),
      });
      recipesSanitized++;
      console.log(`  ✓ Receita "${rData.name || rDoc.id}" sanitizada com blindUserId.`);
    }
  }
  console.log(`✓ Receitas sanitizadas: ${recipesSanitized}`);

  // 4. Sanitizar coleção 'foods_cache'
  console.log('\n[4/5] Sanitizando coleção "foods_cache"...');
  const foodsSnap = await db.collection('foods_cache').get();
  console.log(`✓ Total de alimentos em cache encontrados: ${foodsSnap.docs.length}`);

  let foodsSanitized = 0;
  for (const fDoc of foodsSnap.docs) {
    const fData = fDoc.data();
    const rawUserId = fData.userId || fData.user_id;

    if (fData.isCustom || fData.source === 'custom' || rawUserId) {
      const blind = fData.blindUserId || resolveBlind(rawUserId);
      const updates: Record<string, any> = {
        isCustom: true,
        ...(blind ? { blindUserId: blind } : {}),
        updatedAt: new Date().toISOString(),
      };

      if (fData.userId !== undefined || fData.user_id !== undefined || !fData.blindUserId) {
        await fDoc.ref.update({
          ...updates,
          userId: FieldValue.delete(),
          user_id: FieldValue.delete(),
        });
        foodsSanitized++;
      }
    }
  }
  console.log(`✓ Alimentos customizados sanitizados com blindUserId e campos de email removidos: ${foodsSanitized}`);

  // 5. Sanitizar coleção 'user_goals'
  console.log('\n[5/5] Sanitizando coleção "user_goals"...');
  const goalsSnap = await db.collection('user_goals').get();
  console.log(`✓ Total de documentos em user_goals: ${goalsSnap.docs.length}`);

  let goalsSanitized = 0;
  for (const gDoc of goalsSnap.docs) {
    const gData = gDoc.data();
    const docId = gDoc.id;
    const rawUserId = gData.userId || gData.user_id || docId;
    const blind = /^[a-f0-9]{64}$/i.test(docId) ? docId : (gData.blindUserId || resolveBlind(rawUserId));

    if (blind) {
      const targetDocId = blind;
      const cleanData: Record<string, any> = {
        ...gData,
        blindUserId: blind,
        updatedAt: new Date().toISOString(),
      };
      delete cleanData.userId;
      delete cleanData.user_id;

      if (docId !== targetDocId) {
        await db.collection('user_goals').doc(targetDocId).set(cleanData, { merge: true });
        await gDoc.ref.delete();
        console.log(`  ✓ Documento de metas movido de "${docId}" para "${targetDocId}".`);
        goalsSanitized++;
      } else if (gData.userId !== undefined || gData.user_id !== undefined) {
        await gDoc.ref.update({
          userId: FieldValue.delete(),
          user_id: FieldValue.delete(),
          blindUserId: blind,
        });
        goalsSanitized++;
      }
    }
  }
  console.log(`✓ Metas sanitizadas: ${goalsSanitized}`);

  console.log('\n🎉 Sanitização concluída com 100% de sucesso.');
}

main().catch(err => {
  console.error('❌ Falha na execução do script:', err);
  process.exit(1);
});
