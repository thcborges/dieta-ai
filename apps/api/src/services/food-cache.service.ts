import { Firestore } from '@google-cloud/firestore';
import { PREPOPULATED_FOODS, filterVisibleFoods, normalizeSearchText, canonicalizeUserId, type FoodItem } from '@dieta-ai/core';

export interface CachedFood extends FoodItem {
  barcode?: string;
  source: 'cache' | 'open_food_facts' | 'manual';
  updatedAt: string;
}

async function withTimeout<T>(promise: Promise<T>, ms: number = 3000): Promise<T> {
  let timeoutId: NodeJS.Timeout;
  promise.catch(() => {});
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(`Firestore operation timed out (${ms}ms)`)), ms);
  });
  return Promise.race([promise, timeoutPromise]).finally(() => {
    clearTimeout(timeoutId);
  });
}

export class FoodCacheService {
  private inMemoryCache: Map<string, CachedFood> = new Map();
  private firestore: Firestore | null = null;

  constructor(options?: { firestore?: Firestore }) {
    this.seedPrepopulatedFoods();
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

  private seedPrepopulatedFoods() {
    for (const food of PREPOPULATED_FOODS) {
      if (!this.inMemoryCache.has(food.id)) {
        this.inMemoryCache.set(food.id, {
          ...food,
          source: 'cache',
          updatedAt: new Date().toISOString(),
        });
      }
    }
  }

  getByIdSync(id: string): CachedFood | null {
    return this.inMemoryCache.get(id) || null;
  }

  async getById(id: string): Promise<CachedFood | null> {
    const cached = this.inMemoryCache.get(id);
    if (cached) return cached;

    const db = this.getFirestore();
    if (db) {
      try {
        const docRef = db.collection('foods_cache').doc(id);
        const snapshot = await withTimeout(docRef.get());
        if (snapshot.exists) {
          const food = snapshot.data() as CachedFood;
          this.inMemoryCache.set(food.id, food);
          if (food.barcode) {
            this.inMemoryCache.set(food.barcode, food);
          }
          return food;
        }
      } catch {
        // Fallback em memória
      }
    }

    return null;
  }

  getFoodsSync(userId?: string, isAdmin: boolean = false): CachedFood[] {
    const map = new Map<string, CachedFood>();
    for (const food of this.inMemoryCache.values()) {
      map.set(food.id, food);
    }
    const all = Array.from(map.values());
    return filterVisibleFoods(all, userId, isAdmin) as CachedFood[];
  }

  async getAllFoods(userId?: string, isAdmin: boolean = false): Promise<CachedFood[]> {
    const db = this.getFirestore();
    if (db) {
      try {
        const snapshot = await withTimeout(db.collection('foods_cache').get());
        for (const doc of snapshot.docs) {
          const food = doc.data() as CachedFood;
          this.inMemoryCache.set(food.id, food);
          if (food.barcode) {
            this.inMemoryCache.set(food.barcode, food);
          }
        }
      } catch {
        // Fallback em memória
      }
    }

    const map = new Map<string, CachedFood>();
    for (const food of this.inMemoryCache.values()) {
      map.set(food.id, food);
    }
    const all = Array.from(map.values());
    return filterVisibleFoods(all, userId, isAdmin) as CachedFood[];
  }

  async searchFoods(
    query: string,
    userId?: string,
    isAdmin: boolean = false,
    includeRemote: boolean = false
  ): Promise<{ foods: CachedFood[]; source: 'cache' | 'open_food_facts' | 'combined' }> {
    const normalizedQuery = normalizeSearchText(query);
    if (!normalizedQuery) {
      const all = await this.getAllFoods(userId, isAdmin);
      return { foods: all, source: 'cache' };
    }

    // Carrega do Firestore para garantir integridade
    await this.getAllFoods(userId, isAdmin);

    const queryTokens = normalizedQuery.split(/\s+/).filter(Boolean);

    // 1. Consulta em primeiro lugar o nosso banco de dados (cache / prepopulated / custom)
    const cachedFoodsMap = new Map<string, CachedFood>();
    for (const food of this.inMemoryCache.values()) {
      const normName = normalizeSearchText(food.name);
      const normId = normalizeSearchText(food.id);
      const normBarcode = food.barcode ? normalizeSearchText(food.barcode) : '';

      const matchesContiguous =
        normName.includes(normalizedQuery) ||
        normId.includes(normalizedQuery) ||
        (normBarcode && normBarcode.includes(normalizedQuery));

      const matchesTokens = queryTokens.every(
        token => normName.includes(token) || normId.includes(token) || (normBarcode && normBarcode.includes(token))
      );

      if (matchesContiguous || matchesTokens) {
        cachedFoodsMap.set(food.id, { ...food, source: 'cache' });
      }
    }

    const cachedResults = filterVisibleFoods(
      Array.from(cachedFoodsMap.values()),
      userId,
      isAdmin
    ) as CachedFood[];

    if (!includeRemote && cachedResults.length > 0) {
      return { foods: cachedResults, source: 'cache' };
    }

    // 2. Se não encontrar no nosso banco de dados OU se includeRemote=true, consulta a API do Open Food Facts
    try {
      const url = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(query)}&search_simple=1&action=process&json=1&page_size=10`;
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'MacroMetricsPro - DietEngineeringApp - Version 0.1.0',
        },
        signal: AbortSignal.timeout(2000),
      });

      if (response.ok) {
        interface OFFSearchResponse {
          count?: number;
          products?: Array<{
            code?: string;
            product_name?: string;
            serving_quantity?: string | number;
            nutriments?: Record<string, number | undefined>;
          }>;
        }

        const data = (await response.json()) as OFFSearchResponse;
        if (data && Array.isArray(data.products) && data.products.length > 0) {
          const offResults: CachedFood[] = [];

          for (const prod of data.products) {
            if (!prod.product_name && !prod.code) continue;
            const nutriments = prod.nutriments ?? {};
            const food: CachedFood = {
              id: prod.code ? `off_${prod.code}` : `off_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
              name: prod.product_name || 'Alimento sem Nome',
              servingDescription: `${prod.serving_quantity || 100}g`,
              servingSizeGrams: Number(prod.serving_quantity) || 100,
              caloriesPer100g: Math.round(Number(nutriments['energy-kcal_100g']) || 0),
              proteinPer100g: Math.round((Number(nutriments['proteins_100g']) || 0) * 10) / 10,
              carbsPer100g: Math.round((Number(nutriments['carbohydrates_100g']) || 0) * 10) / 10,
              fatPer100g: Math.round((Number(nutriments['fat_100g']) || 0) * 10) / 10,
              fiberPer100g: Math.round((Number(nutriments['fiber_100g']) || 0) * 10) / 10,
              barcode: prod.code,
              source: 'open_food_facts',
              updatedAt: new Date().toISOString(),
            };

            // Salva no banco de dados (cache em memória e Firestore)
            this.inMemoryCache.set(food.id, food);
            if (food.barcode) {
              this.inMemoryCache.set(food.barcode, food);
            }
            const db = this.getFirestore();
            if (db) {
              try {
                await withTimeout(db.collection('foods_cache').doc(food.id).set(food, { merge: true }));
              } catch {
                // Fallback em memória
              }
            }
            offResults.push(food);
          }

          if (offResults.length > 0) {
            if (cachedResults.length > 0) {
              const seenIds = new Set(cachedResults.map(f => f.id));
              const merged = [...cachedResults];
              for (const off of offResults) {
                if (!seenIds.has(off.id) && (!off.barcode || !merged.some(m => m.barcode === off.barcode))) {
                  seenIds.add(off.id);
                  merged.push(off);
                }
              }
              return { foods: merged, source: 'combined' };
            }
            return { foods: offResults, source: 'open_food_facts' };
          }
        }
      }
    } catch {
      // Ignora erro de rede
    }

    if (cachedResults.length > 0) {
      return { foods: cachedResults, source: 'cache' };
    }

    return { foods: [], source: 'cache' };
  }

  async getByBarcode(
    barcode: string,
    userId?: string,
    isAdmin: boolean = false
  ): Promise<CachedFood | null> {
    // 1. Consulta cache em memória
    let cached = this.inMemoryCache.get(barcode);
    if (!cached) {
      // Tenta carregar do Firestore
      const db = this.getFirestore();
      if (db) {
        try {
          const snapshot = await withTimeout(
            db.collection('foods_cache').where('barcode', '==', barcode).get()
          );
          if (!snapshot.empty) {
            cached = snapshot.docs[0].data() as CachedFood;
            this.inMemoryCache.set(cached.id, cached);
            this.inMemoryCache.set(barcode, cached);
          }
        } catch {
          // Fallback em memória
        }
      }
    }

    if (cached) {
      const visible = filterVisibleFoods([cached], userId, isAdmin);
      if (visible.length === 0) {
        return null; // Não validado e pertence a outro usuário
      }
      return { ...cached, source: 'cache' };
    }

    // 2. Consulta API Open Food Facts
    try {
      const url = `https://world.openfoodfacts.org/api/v2/product/${barcode}.json`;
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'MacroMetricsPro - DietEngineeringApp - Version 0.1.0',
        },
        signal: AbortSignal.timeout(2000),
      });

      if (!response.ok) {
        return null;
      }

      interface OpenFoodFactsApiResponse {
        status?: number;
        product?: {
          product_name?: string;
          serving_quantity?: string | number;
          nutriments?: Record<string, number | undefined>;
        };
      }

      const data = (await response.json()) as OpenFoodFactsApiResponse;
      if (!data || data.status !== 1 || !data.product) {
        return null;
      }

      const prod = data.product;
      const nutriments = prod.nutriments ?? {};

      const food: CachedFood = {
        id: `off_${barcode}`,
        name: prod.product_name || 'Alimento sem Nome',
        servingDescription: `${prod.serving_quantity || 100}g`,
        servingSizeGrams: Number(prod.serving_quantity) || 100,
        caloriesPer100g: Math.round(Number(nutriments['energy-kcal_100g']) || 0),
        proteinPer100g: Math.round((Number(nutriments['proteins_100g']) || 0) * 10) / 10,
        carbsPer100g: Math.round((Number(nutriments['carbohydrates_100g']) || 0) * 10) / 10,
        fatPer100g: Math.round((Number(nutriments['fat_100g']) || 0) * 10) / 10,
        fiberPer100g: Math.round((Number(nutriments['fiber_100g']) || 0) * 10) / 10,
        barcode,
        source: 'open_food_facts',
        updatedAt: new Date().toISOString(),
      };

      // Salva no cache em memória e no Firestore
      this.inMemoryCache.set(barcode, food);
      this.inMemoryCache.set(food.id, food);
      const db = this.getFirestore();
      if (db) {
        try {
          await withTimeout(db.collection('foods_cache').doc(food.id).set(food, { merge: true }));
        } catch {
          // Fallback
        }
      }
      return food;
    } catch {
      return null;
    }
  }

  async saveCustomFood(foodData: {
    name: string;
    servingSizeGrams: number;
    caloriesPer100g: number;
    proteinPer100g: number;
    carbsPer100g: number;
    fatPer100g: number;
    fiberPer100g?: number;
    barcode?: string;
    userId?: string;
  }): Promise<CachedFood> {
    const id = foodData.barcode ? `custom_${foodData.barcode}` : `custom_${Date.now()}`;
    const cachedFood: CachedFood = {
      id,
      name: foodData.name,
      servingDescription: `${foodData.servingSizeGrams}g`,
      servingSizeGrams: foodData.servingSizeGrams,
      caloriesPer100g: foodData.caloriesPer100g,
      proteinPer100g: foodData.proteinPer100g,
      carbsPer100g: foodData.carbsPer100g,
      fatPer100g: foodData.fatPer100g,
      fiberPer100g: foodData.fiberPer100g ?? 0,
      barcode: foodData.barcode,
      isCustom: true,
      userId: foodData.userId,
      isValidated: false,
      source: 'manual',
      updatedAt: new Date().toISOString(),
    };

    if (foodData.barcode) {
      this.inMemoryCache.set(foodData.barcode, cachedFood);
    }
    this.inMemoryCache.set(id, cachedFood);

    const db = this.getFirestore();
    if (db) {
      try {
        const docRef = db.collection('foods_cache').doc(id);
        await withTimeout(docRef.set(cachedFood, { merge: true }));
      } catch {
        // Fallback em memória
      }
    }

    return cachedFood;
  }

  async saveFoodItem(food: FoodItem): Promise<CachedFood> {
    const canonicalUserId = food.userId ? canonicalizeUserId(food.userId) : undefined;
    const cached: CachedFood = {
      ...food,
      userId: canonicalUserId,
      source: 'manual',
      updatedAt: new Date().toISOString(),
    };
    this.inMemoryCache.set(food.id, cached);

    const db = this.getFirestore();
    if (db) {
      try {
        const docRef = db.collection('foods_cache').doc(food.id);
        await withTimeout(docRef.set(cached, { merge: true }));
      } catch {
        // Fallback em memória
      }
    }

    return cached;
  }

  async purgeUserFoods(userId: string): Promise<number> {
    const canonicalId = canonicalizeUserId(userId);
    let deleted = 0;
    const db = this.getFirestore();
    if (db) {
      try {
        const [rawSnap, canonSnap] = await Promise.all([
          withTimeout(db.collection('foods_cache').where('userId', '==', userId).get()),
          withTimeout(db.collection('foods_cache').where('userId', '==', canonicalId).get()),
        ]);
        const docsToDelete = new Map<string, FirebaseFirestore.DocumentReference>();
        for (const doc of rawSnap.docs) docsToDelete.set(doc.id, doc.ref);
        for (const doc of canonSnap.docs) docsToDelete.set(doc.id, doc.ref);

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
    for (const [key, val] of this.inMemoryCache.entries()) {
      if (
        val.userId === userId ||
        val.userId === canonicalId ||
        (val.userId && canonicalizeUserId(val.userId) === canonicalId)
      ) {
        this.inMemoryCache.delete(key);
        deleted++;
      }
    }
    return deleted;
  }

  async deleteFoodItem(foodId: string): Promise<boolean> {
    const db = this.getFirestore();
    if (db) {
      try {
        const docRef = db.collection('foods_cache').doc(foodId);
        await withTimeout(docRef.delete());
      } catch {
        // Fallback em memória
      }
    }
    return this.inMemoryCache.delete(foodId);
  }

  validateFood(foodId: string): CachedFood | null {
    const food = this.inMemoryCache.get(foodId);
    if (!food) {
      return null;
    }
    food.isValidated = true;
    food.updatedAt = new Date().toISOString();
    if (food.barcode && this.inMemoryCache.has(food.barcode)) {
      const barcodeFood = this.inMemoryCache.get(food.barcode);
      if (barcodeFood) {
        barcodeFood.isValidated = true;
        barcodeFood.updatedAt = food.updatedAt;
      }
    }

    const db = this.getFirestore();
    if (db) {
      try {
        db.collection('foods_cache').doc(foodId).set(food, { merge: true });
      } catch {
        // Fallback
      }
    }

    return food;
  }
}

export const foodCacheService = new FoodCacheService();
