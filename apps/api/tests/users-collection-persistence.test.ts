import { describe, it, expect, beforeEach } from 'vitest';
import { buildApp } from '../src/app.js';
import { userRepository } from '../src/services/user-repository.service.js';
import { firestoreDiaryService } from '../src/services/firestore-diary.service.js';
import { recipeService } from '../src/services/recipe.service.js';
import { foodCacheService } from '../src/services/food-cache.service.js';
import { userGoalsService } from '../src/services/user-goals.service.js';
import { authService } from '../src/services/auth.service.js';

describe('Users Collection & Relational Linking Suite (BDD / TDD)', () => {
  const testEmail = 'lead.engineer@macrometrics.io';
  const canonicalUserId = 'usr_lead_engineer_macrometrics_io';

  beforeEach(async () => {
    // Limpeza de estado de teste
    await userRepository.deleteUser(canonicalUserId);
    await firestoreDiaryService.purgeUserDiaries(canonicalUserId);
    await recipeService.purgeUserRecipes(canonicalUserId);
    await userGoalsService.purgeUserGoals(canonicalUserId);
  });

  describe('Cenário 1: Persistência do Usuário na Collection "users" via Autenticação Google', () => {
    it('deve salvar as informações completas do usuário no login via Google na collection "users"', async () => {
      const app = await buildApp();

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/google',
        payload: {
          googleIdToken: `mock-google-id-token-${Date.now()}`,
          email: testEmail,
          name: 'Lead Engineer',
        },
      });

      expect(response.statusCode).toBe(200);
      const data = response.json();
      expect(data.user.id).toBe(canonicalUserId);
      expect(data.user.email).toBe(testEmail);

      // Verifica se o usuário foi persistido na collection 'users'
      const storedUser = await userRepository.getUserById(canonicalUserId);
      expect(storedUser).not.toBeNull();
      expect(storedUser?.id).toBe(canonicalUserId);
      expect(storedUser?.email).toBe(testEmail);
      expect(storedUser?.name).toBe('Lead Engineer');
      expect(storedUser?.blindUserId).toBeDefined();
      expect(storedUser?.createdAt).toBeDefined();
      expect(storedUser?.updatedAt).toBeDefined();
      expect(storedUser?.lastLoginAt).toBeDefined();
    });

    it('deve atualizar lastLoginAt e dados ao realizar logins subsequentes preservando createdAt', async () => {
      const first = await userRepository.upsertUser({
        id: canonicalUserId,
        email: testEmail,
        name: 'Lead Eng Initial',
        blindUserId: authService.getBlindUserId(canonicalUserId),
        isAdmin: false,
      });

      const originalCreatedAt = first.createdAt;

      // Login subsequente atualizando o nome
      const updated = await userRepository.upsertUser({
        id: canonicalUserId,
        email: testEmail,
        name: 'Lead Eng Updated',
        picture: 'https://lh3.googleusercontent.com/photo.jpg',
        googleSub: 'google_sub_12345',
        blindUserId: authService.getBlindUserId(canonicalUserId),
        isAdmin: false,
      });

      expect(updated.id).toBe(canonicalUserId);
      expect(updated.name).toBe('Lead Eng Updated');
      expect(updated.picture).toBe('https://lh3.googleusercontent.com/photo.jpg');
      expect(updated.googleSub).toBe('google_sub_12345');
      expect(updated.createdAt).toBe(originalCreatedAt);
      expect(new Date(updated.updatedAt).getTime()).toBeGreaterThanOrEqual(new Date(originalCreatedAt).getTime());

      // Busca por email
      const byEmail = await userRepository.getUserByEmail(testEmail);
      expect(byEmail).not.toBeNull();
      expect(byEmail?.id).toBe(canonicalUserId);

      // Listagem de usuários
      const allUsers = await userRepository.listUsers();
      expect(allUsers.some((u) => u.id === canonicalUserId)).toBe(true);

      // Instanciação e fallback de Firestore
      const db = userRepository.getFirestore();
      expect(db === null || typeof db === 'object').toBe(true);
    });

    it('deve consultar o perfil pelo endpoint GET /api/v1/users/me', async () => {
      const app = await buildApp();
      await userRepository.upsertUser({
        id: canonicalUserId,
        email: testEmail,
        name: 'Lead Eng Profile',
        blindUserId: authService.getBlindUserId(canonicalUserId),
        isAdmin: false,
      });

      const sessionToken = authService.createSessionToken({
        sub: canonicalUserId,
        email: testEmail,
        name: 'Lead Eng Profile',
        isAdmin: false,
        blindUserId: authService.getBlindUserId(canonicalUserId),
      });

      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/users/me',
        headers: {
          authorization: `Bearer ${sessionToken}`,
        },
      });

      expect(res.statusCode).toBe(200);
      const data = res.json();
      expect(data.success).toBe(true);
      expect(data.user.id).toBe(canonicalUserId);
      expect(data.user.name).toBe('Lead Eng Profile');
    });
  });

  describe('Cenário 2: Relacionamento com demais collections via user_id / userId', () => {
    it('deve gravar o userId canônico do usuário ao salvar refeições no diário', async () => {
      const app = await buildApp();
      const sessionToken = authService.createSessionToken({
        sub: canonicalUserId,
        email: testEmail,
        name: 'Lead Engineer',
        isAdmin: false,
        blindUserId: authService.getBlindUserId(canonicalUserId),
      });

      const date = '2026-11-10';
      const response = await app.inject({
        method: 'PUT',
        url: `/api/v1/diaries/${date}`,
        headers: {
          authorization: `Bearer ${sessionToken}`,
        },
        payload: {
          meals: {
            lunch: [
              {
                foodId: 'sassami',
                name: 'Filé de Sassami Cozido',
                grams: 200,
              },
            ],
          },
        },
      });

      expect(response.statusCode).toBe(200);
      const diary = await firestoreDiaryService.getDiary(canonicalUserId, date);
      expect(diary.userId).toBe(canonicalUserId);
      expect(diary.blindUserId).toBe(authService.getBlindUserId(canonicalUserId));
    });

    it('deve gravar o userId canônico ao criar uma nova receita', async () => {
      const recipe = await recipeService.createRecipe(
        {
          name: 'Panqueca de Whey',
          servings: 1,
          ingredients: [{ foodId: 'whey_protein', gramsOrUnits: 30 }],
        },
        canonicalUserId
      );

      expect(recipe.userId).toBe(canonicalUserId);
      expect(recipe.blindUserId).toBe(authService.getBlindUserId(canonicalUserId));

      const userRecipes = await recipeService.getRecipes(canonicalUserId);
      expect(userRecipes.some((r) => r.id === recipe.id && r.userId === canonicalUserId)).toBe(true);
    });

    it('deve associar o userId canônico ao salvar metas biométricas do usuário', async () => {
      const goals = await userGoalsService.saveGoals(canonicalUserId, {
        ageYears: 40,
        gender: 'male',
        heightCm: 190,
        weightKg: 95,
        activityLevel: 'moderate',
        dailyDeficitKcal: 500,
      });

      expect(goals.userId).toBe(canonicalUserId);

      const retrieved = await userGoalsService.getGoals(canonicalUserId);
      expect(retrieved.userId).toBe(canonicalUserId);
    });
  });

  describe('Cenário 3: Purge em Cascata da Conta e Todas as Collections Relacionadas (LGPD)', () => {
    it('deve excluir o documento do usuário em "users" e todos os dados relacionados em "diaries", "recipes" e "user_goals"', async () => {
      const app = await buildApp();

      // 1. Cria usuário e dados relacionados
      await userRepository.upsertUser({
        id: canonicalUserId,
        email: testEmail,
        name: 'Lead Engineer',
        blindUserId: authService.getBlindUserId(canonicalUserId),
        isAdmin: false,
      });

      await firestoreDiaryService.saveDiary(canonicalUserId, '2026-11-10', {
        breakfast: [],
        lunch: [{ id: 'item_1', foodId: 'sassami', name: 'Sassami', grams: 150, calories: 247, protein: 46.5, carbs: 0, fat: 5.4, fiber: 0 }],
        afternoon_snack: [],
        dinner_event: [],
      });

      await recipeService.createRecipe(
        {
          name: 'Receita Purge Teste',
          servings: 1,
          ingredients: [{ foodId: 'sassami', gramsOrUnits: 100 }],
        },
        canonicalUserId
      );

      await userGoalsService.saveGoals(canonicalUserId, {
        ageYears: 40,
        gender: 'male',
        heightCm: 190,
        weightKg: 95,
        activityLevel: 'moderate',
      });

      await foodCacheService.saveFoodItem({
        id: 'custom_purge_food_123',
        name: 'Custom Food Purge Test',
        servingDescription: '100g',
        servingSizeGrams: 100,
        caloriesPer100g: 150,
        proteinPer100g: 20,
        carbsPer100g: 10,
        fatPer100g: 2,
        fiberPer100g: 1,
        isCustom: true,
        userId: canonicalUserId,
      });

      // Verifica que tudo foi criado
      expect(await userRepository.getUserById(canonicalUserId)).not.toBeNull();
      expect((await recipeService.getRecipes(canonicalUserId)).length).toBeGreaterThan(0);
      expect((await foodCacheService.getAllFoods(canonicalUserId)).some((f) => f.id === 'custom_purge_food_123')).toBe(true);

      // 2. Executa exclusão administrativa com token de admin
      const adminToken = process.env.ADMIN_TOKEN || 'admin-secret-token-key-us-central1';

      const deleteRes = await app.inject({
        method: 'DELETE',
        url: `/api/v1/admin/users/${canonicalUserId}`,
        headers: {
          'x-admin-token': adminToken,
        },
      });

      expect(deleteRes.statusCode).toBe(200);

      // 3. Verifica se todos os registros foram purgados em cascata
      expect(await userRepository.getUserById(canonicalUserId)).toBeNull();
      const emptyDiaries = await firestoreDiaryService.getDiary(canonicalUserId, '2026-11-10');
      expect(emptyDiaries.meals.lunch.length).toBe(0);
      const remainingRecipes = await recipeService.getRecipes(canonicalUserId);
      expect(remainingRecipes.length).toBe(0);
      const remainingFoods = await foodCacheService.getAllFoods(canonicalUserId);
      expect(remainingFoods.some((f) => f.id === 'custom_purge_food_123')).toBe(false);
    });
  });
});
