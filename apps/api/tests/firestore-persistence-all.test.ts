import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { buildApp } from '../src/app.js';
import type { FastifyInstance } from 'fastify';
import { UserGoalsService } from '../src/services/user-goals.service.js';
import { RecipeService } from '../src/services/recipe.service.js';
import { FoodCacheService } from '../src/services/food-cache.service.js';
import { FirestoreDiaryService } from '../src/services/firestore-diary.service.js';
import type { Firestore } from '@google-cloud/firestore';

describe('Persistência Integral no Firestore (Zero-Trust & Multi-Dispositivo)', () => {
  let app: FastifyInstance;
  const testUserId = 'usr_thcborges_gmail_com';
  const testEmail = 'thcborges@gmail.com';

  beforeAll(async () => {
    app = await buildApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('UserGoalsService: deve persistir na collection user_goals do Firestore e expurgar em LGPD', async () => {
    const firestoreMockDocs = new Map<string, any>();
    const mockFirestore = {
      collection: vi.fn((colName: string) => ({
        doc: vi.fn((docId: string) => ({
          set: vi.fn(async (data: any) => {
            firestoreMockDocs.set(`${colName}/${docId}`, data);
          }),
          get: vi.fn(async () => {
            const data = firestoreMockDocs.get(`${colName}/${docId}`);
            return {
              exists: Boolean(data),
              data: () => data,
            };
          }),
          delete: vi.fn(async () => {
            firestoreMockDocs.delete(`${colName}/${docId}`);
          }),
        })),
      })),
    } as unknown as Firestore;

    const goalsService = new UserGoalsService({ firestore: mockFirestore });
    const goalsInput = {
      ageYears: 40,
      gender: 'male' as const,
      heightCm: 190,
      weightKg: 95,
      activityLevel: 'moderate' as const,
      dailyDeficitKcal: 600,
      customProteinPerKg: 2.4,
    };

    await goalsService.saveGoals(testUserId, goalsInput);
    expect(mockFirestore.collection).toHaveBeenCalledWith('user_goals');

    // Uma nova instância simulando outro deploy do Cloud Run deve ler do Firestore
    const newContainerGoalsService = new UserGoalsService({ firestore: mockFirestore });
    const loaded = await newContainerGoalsService.getGoals(testUserId);
    expect(loaded.heightCm).toBe(190);
    expect(loaded.weightKg).toBe(95);
    expect(loaded.dailyDeficitKcal).toBe(600);

    // Purge LGPD
    const purged = await newContainerGoalsService.purgeUserGoals(testUserId);
    expect(purged).toBe(true);
  });

  it('RecipeService: deve persistir na collection recipes do Firestore, atualizar e expurgar em lote (LGPD)', async () => {
    const firestoreMockRecipes = new Map<string, any>();
    const batchDeletions: string[] = [];

    const mockFirestore = {
      batch: vi.fn(() => ({
        delete: vi.fn((docRef: any) => {
          batchDeletions.push(docRef.id);
        }),
        commit: vi.fn(async () => {}),
      })),
      collection: vi.fn((colName: string) => ({
        doc: vi.fn((docId: string) => ({
          id: docId,
          set: vi.fn(async (data: any) => {
            firestoreMockRecipes.set(`${colName}/${docId}`, data);
          }),
          get: vi.fn(async () => {
            const data = firestoreMockRecipes.get(`${colName}/${docId}`);
            return {
              exists: Boolean(data),
              data: () => data,
            };
          }),
          delete: vi.fn(async () => {
            firestoreMockRecipes.delete(`${colName}/${docId}`);
          }),
        })),
        get: vi.fn(async () => {
          const docs: any[] = [];
          for (const [key, doc] of firestoreMockRecipes.entries()) {
            if (key.startsWith(`${colName}/`)) {
              docs.push({
                id: doc.id,
                ref: { id: doc.id },
                data: () => doc,
              });
            }
          }
          return { docs, empty: docs.length === 0 };
        }),
        where: vi.fn((field: string, op: string, val: string) => ({
          get: vi.fn(async () => {
            const docs: any[] = [];
            for (const [key, doc] of firestoreMockRecipes.entries()) {
              if (key.startsWith(`${colName}/`) && doc[field] === val) {
                docs.push({
                  id: doc.id,
                  ref: { id: doc.id },
                  data: () => doc,
                });
              }
            }
            return { docs, empty: docs.length === 0 };
          }),
        })),
      })),
    } as unknown as Firestore;

    const recipeServiceInstance = new RecipeService({ firestore: mockFirestore });
    const recipeInput = {
      name: 'Omelete Proteico MacroMetrics',
      servings: 2,
      servingUnitName: 'fatia',
      ingredients: [
        { foodId: 'food_ovos', gramsOrUnits: 3 },
        { foodId: 'food_claras', gramsOrUnits: 150 },
      ],
    };

    const created = await recipeServiceInstance.createRecipe(recipeInput, testUserId);
    expect(mockFirestore.collection).toHaveBeenCalledWith('recipes');

    // Simula um novo deploy / outro container com instância limpa de memória
    const newDeployRecipeService = new RecipeService({ firestore: mockFirestore });
    const userRecipes = await newDeployRecipeService.getRecipes(testUserId);
    expect(userRecipes.some(r => r.name === 'Omelete Proteico MacroMetrics')).toBe(true);

    const allRecipes = await newDeployRecipeService.getRecipes();
    expect(allRecipes.length).toBeGreaterThan(0);

    const singleRecipe = await newDeployRecipeService.getRecipeById(created.id, testUserId);
    expect(singleRecipe?.name).toBe('Omelete Proteico MacroMetrics');

    // Atualização
    const updated = await newDeployRecipeService.updateRecipe(
      created.id,
      { ...recipeInput, name: 'Omelete Turbinado 4 Ovos' },
      testUserId
    );
    expect(updated?.name).toBe('Omelete Turbinado 4 Ovos');

    // Exclusão em lote (LGPD)
    const purgedCount = await newDeployRecipeService.purgeUserRecipes(testUserId);
    expect(purgedCount).toBeGreaterThanOrEqual(1);

    // Deleta do Firestore
    await newDeployRecipeService.deleteRecipe(created.id, testUserId);
    const afterDelete = await newDeployRecipeService.getRecipeById(created.id, testUserId);
    expect(afterDelete).toBeNull();
  });

  it('FoodCacheService: deve persistir alimentos, ler do Firestore, buscar por código de barras e validar', async () => {
    const firestoreMockFoods = new Map<string, any>();
    const mockFirestore = {
      collection: vi.fn((colName: string) => ({
        doc: vi.fn((docId: string) => ({
          id: docId,
          set: vi.fn(async (data: any) => {
            firestoreMockFoods.set(`${colName}/${docId}`, data);
          }),
          get: vi.fn(async () => {
            const data = firestoreMockFoods.get(`${colName}/${docId}`);
            return {
              exists: Boolean(data),
              data: () => data,
            };
          }),
          delete: vi.fn(async () => {
            firestoreMockFoods.delete(`${colName}/${docId}`);
          }),
        })),
        get: vi.fn(async () => {
          const docs: any[] = [];
          for (const [key, doc] of firestoreMockFoods.entries()) {
            if (key.startsWith(`${colName}/`)) {
              docs.push({
                id: doc.id,
                ref: { id: doc.id },
                data: () => doc,
              });
            }
          }
          return { docs, empty: docs.length === 0 };
        }),
        where: vi.fn((field: string, op: string, val: string) => ({
          get: vi.fn(async () => {
            const docs: any[] = [];
            for (const [key, doc] of firestoreMockFoods.entries()) {
              if (key.startsWith(`${colName}/`) && doc[field] === val) {
                docs.push({
                  id: doc.id,
                  ref: { id: doc.id },
                  data: () => doc,
                });
              }
            }
            return { docs, empty: docs.length === 0 };
          }),
        })),
      })),
    } as unknown as Firestore;

    const foodCache = new FoodCacheService({ firestore: mockFirestore });
    const customFood = await foodCache.saveCustomFood({
      name: 'Iogurte Grego Artesanal',
      servingSizeGrams: 150,
      caloriesPer100g: 75,
      proteinPer100g: 10,
      carbsPer100g: 4,
      fatPer100g: 2,
      fiberPer100g: 0,
      barcode: '7899999990001',
      userId: testUserId,
    });

    expect(mockFirestore.collection).toHaveBeenCalledWith('foods_cache');

    // Nova instância limpa de container lê do Firestore
    const newContainerFoodCache = new FoodCacheService({ firestore: mockFirestore });
    const found = await newContainerFoodCache.getById(customFood.id);
    expect(found?.name).toBe('Iogurte Grego Artesanal');

    // Consulta de todos os alimentos da nuvem
    const allFoods = await newContainerFoodCache.getAllFoods(testUserId);
    expect(allFoods.some(f => f.name === 'Iogurte Grego Artesanal')).toBe(true);

    // Busca por código de barras recuperada do Firestore
    const byBarcode = await newContainerFoodCache.getByBarcode('7899999990001', testUserId);
    expect(byBarcode?.name).toBe('Iogurte Grego Artesanal');

    // Busca com query
    const searchResult = await newContainerFoodCache.searchFoods('Grego Artesanal', testUserId);
    expect(searchResult.foods.length).toBeGreaterThan(0);

    // Validação
    const validated = newContainerFoodCache.validateFood(customFood.id);
    expect(validated?.isValidated).toBe(true);

    // Exclusão
    const deleted = await newContainerFoodCache.deleteFoodItem(customFood.id);
    expect(deleted).toBe(true);
  });

  it('FirestoreDiaryService: deve realizar expurgo em lote (LGPD) e migração de registros', async () => {
    const firestoreMockDiaries = new Map<string, any>();
    const batchDiariesDeletions: string[] = [];

    const mockFirestore = {
      batch: vi.fn(() => ({
        delete: vi.fn((docRef: any) => {
          batchDiariesDeletions.push(docRef.id);
        }),
        set: vi.fn((docRef: any, data: any) => {
          firestoreMockDiaries.set(docRef.id, data);
        }),
        commit: vi.fn(async () => {}),
      })),
      collection: vi.fn((colName: string) => ({
        doc: vi.fn((docId: string) => ({
          id: docId,
          set: vi.fn(async (data: any) => {
            firestoreMockDiaries.set(`${colName}/${docId}`, data);
          }),
          get: vi.fn(async () => {
            const data = firestoreMockDiaries.get(`${colName}/${docId}`);
            return {
              exists: Boolean(data),
              data: () => data,
            };
          }),
          delete: vi.fn(async () => {
            firestoreMockDiaries.delete(`${colName}/${docId}`);
          }),
        })),
        get: vi.fn(async () => {
          const docs: any[] = [];
          for (const [key, doc] of firestoreMockDiaries.entries()) {
            if (key.startsWith(`${colName}/`)) {
              docs.push({
                id: doc.id || key,
                ref: { id: doc.id || key },
                data: () => doc,
              });
            }
          }
          return { docs, empty: docs.length === 0 };
        }),
        where: vi.fn((field: string, op: string, val: string) => ({
          get: vi.fn(async () => {
            const docs: any[] = [];
            for (const [key, doc] of firestoreMockDiaries.entries()) {
              if (key.startsWith(`${colName}/`) && doc[field] === val) {
                docs.push({
                  id: doc.id || key,
                  ref: { id: doc.id || key },
                  data: () => doc,
                });
              }
            }
            return { docs, empty: docs.length === 0 };
          }),
        })),
      })),
    } as unknown as Firestore;

    const diaryServiceInstance = new FirestoreDiaryService({ firestore: mockFirestore });
    await diaryServiceInstance.saveDiary(testUserId, '2026-11-09', {
      breakfast: [
        {
          id: 'item_1',
          foodId: 'food_sassami',
          name: 'Sassami',
          grams: 150,
          calories: 180,
          protein: 35,
          carbs: 0,
          fat: 3,
          fiber: 0,
        },
      ],
      lunch: [],
      afternoon_snack: [],
      dinner_event: [],
    });

    const loaded = await diaryServiceInstance.getDiary(testUserId, '2026-11-09');
    expect(loaded.meals.breakfast.length).toBe(1);

    // Migração de registros
    const migration = await diaryServiceInstance.migrateDiariesToUser(testUserId);
    expect(migration.totalScanned).toBeGreaterThanOrEqual(0);

    // Purge LGPD em lote
    const purged = await diaryServiceInstance.purgeUserDiaries(testUserId);
    expect(purged).toBeGreaterThanOrEqual(1);
  });
});
