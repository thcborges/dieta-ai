import { foodCacheService, type CachedFood } from './food-cache.service.js';
import type { LoggedFood, MealMap } from './firestore-diary.service.js';

export interface RawMealItemInput {
  id?: string;
  foodId: string;
  name?: string;
  grams: number;
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  fiber?: number;
}

export function recalculateMealItem(
  rawItem: RawMealItemInput,
  _userId?: string
): LoggedFood {
  const grams = Math.max(0, Number(rawItem.grams) || 0);
  const id =
    rawItem.id && rawItem.id.trim() !== ''
      ? rawItem.id
      : `item_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const foodId = rawItem.foodId.trim();

  // Caso especial: lançamento rápido manual (QuickMacroModal)
  if (
    foodId === 'quick_macro' ||
    foodId.startsWith('quick_macro_') ||
    foodId === 'manual_quick_macro'
  ) {
    return {
      id,
      foodId,
      name: rawItem.name?.trim() || 'Lançamento Rápido',
      grams,
      calories: Math.max(0, Math.round(Number(rawItem.calories) || 0)),
      protein: Math.max(0, Math.round((Number(rawItem.protein) || 0) * 10) / 10),
      carbs: Math.max(0, Math.round((Number(rawItem.carbs) || 0) * 10) / 10),
      fat: Math.max(0, Math.round((Number(rawItem.fat) || 0) * 10) / 10),
      fiber: Math.max(0, Math.round((Number(rawItem.fiber) || 0) * 10) / 10),
    };
  }

  // Busca o alimento no banco de dados oficial de alimentos (prepopulados, customizados, receitas, cache)
  let food: CachedFood | null = foodCacheService.getById(foodId);

  // Se não encontrar pelo foodId direto e tiver formato de código de barras numérico
  if (!food && /^\d+$/.test(foodId)) {
    food = foodCacheService.getById(`custom_${foodId}`) || foodCacheService.getById(`off_${foodId}`);
  }

  if (food) {
    const ratio = grams / 100;
    return {
      id,
      foodId,
      name: rawItem.name?.trim() || food.name,
      grams,
      calories: Math.round(food.caloriesPer100g * ratio),
      protein: Math.round(food.proteinPer100g * ratio * 10) / 10,
      carbs: Math.round(food.carbsPer100g * ratio * 10) / 10,
      fat: Math.round(food.fatPer100g * ratio * 10) / 10,
      fiber: Math.round((food.fiberPer100g ?? 0) * ratio * 10) / 10,
    };
  }

  // Alimento desconhecido ou não encontrado
  return {
    id,
    foodId,
    name: rawItem.name?.trim() || foodId,
    grams,
    calories: Math.max(0, Math.round(Number(rawItem.calories) || 0)),
    protein: Math.max(0, Math.round((Number(rawItem.protein) || 0) * 10) / 10),
    carbs: Math.max(0, Math.round((Number(rawItem.carbs) || 0) * 10) / 10),
    fat: Math.max(0, Math.round((Number(rawItem.fat) || 0) * 10) / 10),
    fiber: Math.max(0, Math.round((Number(rawItem.fiber) || 0) * 10) / 10),
  };
}

export function recalculateMealMap(
  meals: Record<string, RawMealItemInput[]>,
  userId?: string
): MealMap {
  const result: MealMap = {
    breakfast: [],
    lunch: [],
    afternoon_snack: [],
    dinner_event: [],
  };

  for (const [window, items] of Object.entries(meals)) {
    if (Array.isArray(items) && window in result) {
      result[window as keyof MealMap] = items.map(item => recalculateMealItem(item, userId));
    }
  }

  return result;
}
