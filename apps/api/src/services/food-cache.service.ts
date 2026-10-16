import type { FoodItem } from '@dieta-ai/core';

export interface CachedFood extends FoodItem {
  barcode?: string;
  source: 'cache' | 'open_food_facts' | 'manual';
  updatedAt: string;
}

export class FoodCacheService {
  private inMemoryCache: Map<string, CachedFood> = new Map();

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
