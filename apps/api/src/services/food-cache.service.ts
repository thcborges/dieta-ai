import { PREPOPULATED_FOODS, type FoodItem } from '@dieta-ai/core';

export interface CachedFood extends FoodItem {
  barcode?: string;
  source: 'cache' | 'open_food_facts' | 'manual';
  updatedAt: string;
}

export class FoodCacheService {
  private inMemoryCache: Map<string, CachedFood> = new Map();

  constructor() {
    this.seedPrepopulatedFoods();
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

  getAllFoods(): CachedFood[] {
    const map = new Map<string, CachedFood>();
    for (const food of this.inMemoryCache.values()) {
      map.set(food.id, food);
    }
    return Array.from(map.values());
  }

  async searchFoods(query: string): Promise<{ foods: CachedFood[]; source: 'cache' | 'open_food_facts' }> {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) {
      return { foods: this.getAllFoods(), source: 'cache' };
    }

    // 1. Consulta em primeiro lugar o nosso banco de dados (cache / prepopulated / custom)
    const cachedFoodsMap = new Map<string, CachedFood>();
    for (const food of this.inMemoryCache.values()) {
      if (
        food.name.toLowerCase().includes(normalizedQuery) ||
        food.id.toLowerCase().includes(normalizedQuery) ||
        (food.barcode && food.barcode.toLowerCase().includes(normalizedQuery))
      ) {
        cachedFoodsMap.set(food.id, { ...food, source: 'cache' });
      }
    }

    const cachedResults = Array.from(cachedFoodsMap.values());
    if (cachedResults.length > 0) {
      return { foods: cachedResults, source: 'cache' };
    }

    // 2. Se não encontrar no nosso banco de dados, consulta a API do Open Food Facts
    try {
      const url = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(query)}&search_simple=1&action=process&json=1&page_size=10`;
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'MacroMetricsPro - DietEngineeringApp - Version 0.1.0',
        },
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

            // Salva no banco de dados (cache)
            this.inMemoryCache.set(food.id, food);
            if (food.barcode) {
              this.inMemoryCache.set(food.barcode, food);
            }
            offResults.push(food);
          }

          if (offResults.length > 0) {
            return { foods: offResults, source: 'open_food_facts' };
          }
        }
      }
    } catch {
      // Ignora erro de rede
    }

    return { foods: [], source: 'cache' };
  }

  async getByBarcode(barcode: string): Promise<CachedFood | null> {
    // 1. Consulta cache em memória / Firestore
    const cached = this.inMemoryCache.get(barcode);
    if (cached) {
      return { ...cached, source: 'cache' };
    }

    // 2. Consulta API Open Food Facts
    try {
      const url = `https://world.openfoodfacts.org/api/v2/product/${barcode}.json`;
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'MacroMetricsPro - DietEngineeringApp - Version 0.1.0',
        },
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

      // Salva no cache
      this.inMemoryCache.set(barcode, food);
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
      source: 'manual',
      updatedAt: new Date().toISOString(),
    };

    if (foodData.barcode) {
      this.inMemoryCache.set(foodData.barcode, cachedFood);
    }
    this.inMemoryCache.set(id, cachedFood);

    return cachedFood;
  }
}

export const foodCacheService = new FoodCacheService();
