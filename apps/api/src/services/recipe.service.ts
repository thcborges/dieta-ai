import { Firestore } from '@google-cloud/firestore';
import {
  calculateRecipeMacros,
  recipeToFoodItem,
  generateBlindIndex,
  canonicalizeUserId,
  type RecipeInput,
  type RecipeCalculationResult,
} from '@dieta-ai/core';
import { foodCacheService } from './food-cache.service.js';

export interface StoredRecipe {
  id: string;
  name: string;
  servings: number;
  servingUnitName?: string;
  ingredients: { foodId: string; gramsOrUnits: number }[];
  totalWeightGrams: number;
  totalMacros: RecipeCalculationResult['totalMacros'];
  perServing: RecipeCalculationResult['perServing'];
  proteinDensity: number;
  userId?: string;
  user_id?: string;
  blindUserId?: string;
  createdAt: string;
  updatedAt: string;
}

async function withTimeout<T>(promise: Promise<T>, ms: number = 3000): Promise<T> {
  let timeoutId: NodeJS.Timeout;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(`Firestore operation timed out (${ms}ms)`)), ms);
  });
  return Promise.race([promise, timeoutPromise]).finally(() => {
    clearTimeout(timeoutId);
  });
}

export class RecipeService {
  private recipes: Map<string, StoredRecipe> = new Map();
  private firestore: Firestore | null = null;
  private readonly pepper: string;

  constructor(options?: { firestore?: Firestore; pepper?: string }) {
    const configuredPepper =
      options?.pepper || process.env.BLIND_INDEX_PEPPER || process.env.LGPD_SECRET_PEPPER;
    if (!configuredPepper) {
      if (process.env.NODE_ENV === 'test') {
        this.pepper = 'test-blind-index-pepper-32chars!!';
      } else {
        this.pepper = 'test-blind-index-pepper-32chars!!';
      }
    } else {
      this.pepper = configuredPepper;
    }
    if (options?.firestore) {
      this.firestore = options.firestore;
    }
  }

  public getFirestore(): Firestore | null {
    if (!this.firestore) {
      const emulatorHost = process.env.FIRESTORE_EMULATOR_HOST;
      const projectId =
        process.env.FIRESTORE_PROJECT_ID || process.env.GCP_PROJECT_ID || 'thcborges-dieta-ai-dev';

      try {
        if (emulatorHost) {
          this.firestore = new Firestore({ projectId });
        } else if (process.env.NODE_ENV === 'test' && !process.env.GOOGLE_APPLICATION_CREDENTIALS) {
          return null;
        } else {
          this.firestore = new Firestore({ projectId });
        }
      } catch {
        this.firestore = null;
      }
    }
    return this.firestore;
  }

  public getBlindUserId(userId: string): string {
    const canonical = canonicalizeUserId(userId);
    if (/^[a-f0-9]{64}$/i.test(canonical)) {
      return canonical;
    }
    return generateBlindIndex(canonical, this.pepper);
  }

  async createRecipe(input: RecipeInput, userId?: string): Promise<StoredRecipe> {
    const id = input.id || `recipe_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();

    const canonicalId = userId ? canonicalizeUserId(userId) : (input.userId ? canonicalizeUserId(input.userId) : undefined);
    const availableFoods = await foodCacheService.getAllFoods(canonicalId, true);
    const calculation = calculateRecipeMacros(input, availableFoods);

    const blindUserId = canonicalId ? this.getBlindUserId(canonicalId) : undefined;
    const finalUserId = canonicalId;

    const storedRecipe: StoredRecipe = {
      id,
      name: input.name,
      servings: calculation.totalServings,
      servingUnitName: input.servingUnitName || 'porção',
      ingredients: input.ingredients,
      totalWeightGrams: calculation.totalWeightGrams,
      totalMacros: calculation.totalMacros,
      perServing: calculation.perServing,
      proteinDensity: calculation.proteinDensity,
      userId: finalUserId,
      user_id: finalUserId,
      blindUserId,
      createdAt: now,
      updatedAt: now,
    };

    const db = this.getFirestore();
    if (db) {
      try {
        const docRef = db.collection('recipes').doc(id);
        await withTimeout(docRef.set(storedRecipe, { merge: true }));
      } catch {
        // Fallback em memória
      }
    }

    this.recipes.set(id, storedRecipe);

    // Sincroniza no foodCacheService
    const foodItem = recipeToFoodItem({ ...input, id }, calculation, finalUserId);
    await foodCacheService.saveFoodItem(foodItem);

    return storedRecipe;
  }

  async getRecipes(userId?: string): Promise<StoredRecipe[]> {
    const canonicalId = userId ? canonicalizeUserId(userId) : undefined;
    const db = this.getFirestore();
    if (db) {
      try {
        let snapshot;
        if (canonicalId) {
          snapshot = await withTimeout(
            db.collection('recipes').where('userId', '==', canonicalId).get()
          );
        } else {
          snapshot = await withTimeout(db.collection('recipes').get());
        }

        for (const doc of snapshot.docs) {
          const data = doc.data() as StoredRecipe;
          this.recipes.set(data.id, data);
        }
      } catch {
        // Fallback para memória se o Firestore falhar
      }
    }

    const result: StoredRecipe[] = [];
    for (const recipe of this.recipes.values()) {
      if (!canonicalId || !recipe.userId || recipe.userId === canonicalId || canonicalizeUserId(recipe.userId) === canonicalId) {
        result.push(recipe);
      }
    }
    return result;
  }

  async getRecipeById(id: string, userId?: string): Promise<StoredRecipe | null> {
    const db = this.getFirestore();
    if (db) {
      try {
        const docRef = db.collection('recipes').doc(id);
        const snapshot = await withTimeout(docRef.get());
        if (snapshot.exists) {
          const data = snapshot.data() as StoredRecipe;
          this.recipes.set(data.id, data);
          if (data.userId && userId && data.userId !== userId) {
            return null;
          }
          return data;
        } else {
          this.recipes.delete(id);
          return null;
        }
      } catch {
        // Fallback para memória
      }
    }

    const recipe = this.recipes.get(id);
    if (!recipe) return null;
    if (recipe.userId && (!userId || recipe.userId !== userId)) {
      return null;
    }
    return recipe;
  }

  async updateRecipe(
    id: string,
    input: RecipeInput,
    userId?: string
  ): Promise<StoredRecipe | null> {
    const existing = await this.getRecipeById(id, userId);
    if (!existing) return null;

    const availableFoods = await foodCacheService.getAllFoods(userId, true);
    const calculation = calculateRecipeMacros(input, availableFoods);
    const now = new Date().toISOString();

    const updatedRecipe: StoredRecipe = {
      ...existing,
      name: input.name,
      servings: calculation.totalServings,
      servingUnitName: input.servingUnitName || existing.servingUnitName,
      ingredients: input.ingredients,
      totalWeightGrams: calculation.totalWeightGrams,
      totalMacros: calculation.totalMacros,
      perServing: calculation.perServing,
      proteinDensity: calculation.proteinDensity,
      updatedAt: now,
    };

    const db = this.getFirestore();
    if (db) {
      try {
        const docRef = db.collection('recipes').doc(id);
        await withTimeout(docRef.set(updatedRecipe, { merge: true }));
      } catch {
        // Fallback para memória
      }
    }

    this.recipes.set(id, updatedRecipe);

    // Atualiza no cache de alimentos
    const foodItem = recipeToFoodItem({ ...input, id }, calculation, userId);
    await foodCacheService.saveFoodItem(foodItem);

    return updatedRecipe;
  }

  async deleteRecipe(id: string, userId?: string): Promise<boolean> {
    const existing = await this.getRecipeById(id, userId);
    if (!existing) return false;

    this.recipes.delete(id);
    const db = this.getFirestore();
    if (db) {
      try {
        await withTimeout(db.collection('recipes').doc(id).delete());
      } catch {
        // Fallback para memória
      }
    }

    await foodCacheService.deleteFoodItem(id);
    return true;
  }

  async purgeUserRecipes(userId: string): Promise<number> {
    const canonicalId = canonicalizeUserId(userId);
    const blindUserId = this.getBlindUserId(canonicalId);
    let deleted = 0;
    const db = this.getFirestore();
    if (db) {
      try {
        const [userSnap, canonSnap, blindSnap] = await Promise.all([
          withTimeout(db.collection('recipes').where('userId', '==', userId).get()),
          withTimeout(db.collection('recipes').where('userId', '==', canonicalId).get()),
          withTimeout(db.collection('recipes').where('blindUserId', '==', blindUserId).get()),
        ]);
        const docsToDelete = new Map<string, FirebaseFirestore.DocumentReference>();
        for (const doc of userSnap.docs) docsToDelete.set(doc.id, doc.ref);
        for (const doc of canonSnap.docs) docsToDelete.set(doc.id, doc.ref);
        for (const doc of blindSnap.docs) docsToDelete.set(doc.id, doc.ref);

        const batch = db.batch();
        for (const ref of docsToDelete.values()) {
          batch.delete(ref);
          deleted++;
        }
        if (deleted > 0) {
          await withTimeout(batch.commit());
        }
      } catch {
        // Fallback
      }
    }
    for (const [key, val] of this.recipes.entries()) {
      if (
        val.userId === userId ||
        val.userId === canonicalId ||
        (val.userId && canonicalizeUserId(val.userId) === canonicalId) ||
        val.blindUserId === blindUserId
      ) {
        this.recipes.delete(key);
        deleted++;
      }
    }
    return deleted;
  }
}

export const recipeService = new RecipeService();
