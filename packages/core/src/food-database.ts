export interface FoodItem {
  id: string;
  name: string;
  servingDescription: string;
  servingSizeGrams: number;
  caloriesPer100g: number;
  proteinPer100g: number;
  carbsPer100g: number;
  fatPer100g: number;
  fiberPer100g: number;
  isCustom?: boolean;
}

export interface RecipeIngredient {
  foodId: string;
  gramsOrUnits: number;
}

export interface RecipeInput {
  name: string;
  servings: number;
  ingredients: RecipeIngredient[];
}

export interface RecipeCalculationResult {
  recipeName: string;
  totalServings: number;
  totalMacros: {
    calories: number;
    proteinGrams: number;
    carbGrams: number;
    fatGrams: number;
    fiberGrams: number;
  };
  perServing: {
    calories: number;
    proteinGrams: number;
    carbGrams: number;
    fatGrams: number;
    fiberGrams: number;
  };
}

export type MealWindow = 'breakfast' | 'lunch' | 'afternoon_snack' | 'dinner_event';

export interface MealLogEntry {
  mealWindow: MealWindow;
  foodId: string;
  count: number;
}

export const PREPOPULATED_FOODS: FoodItem[] = [
  {
    id: 'sassami',
    name: 'Filé de Sassami Desfiado Cozido',
    servingDescription: '100g',
    servingSizeGrams: 100,
    caloriesPer100g: 165,
    proteinPer100g: 31,
    carbsPer100g: 0,
    fatPer100g: 3.6,
    fiberPer100g: 0,
  },
  {
    id: 'feijao_preto',
    name: 'Feijão Preto Cozido',
    servingDescription: '1 concha (100g)',
    servingSizeGrams: 100,
    caloriesPer100g: 77,
    proteinPer100g: 4.5,
    carbsPer100g: 14.0,
    fatPer100g: 0.5,
    fiberPer100g: 8.5,
  },
  {
    id: 'batata_doce',
    name: 'Batata-Doce Cozida',
    servingDescription: '100g',
    servingSizeGrams: 100,
    caloriesPer100g: 86,
    proteinPer100g: 1.6,
    carbsPer100g: 20.1,
    fatPer100g: 0.1,
    fiberPer100g: 3.0,
  },
  {
    id: 'ovos_inteiros',
    name: 'Ovo de Galinha Inteiro Cozido/Mexido',
    servingDescription: '1 unidade média (50g)',
    servingSizeGrams: 50,
    caloriesPer100g: 143,
    proteinPer100g: 13.0,
    carbsPer100g: 1.0,
    fatPer100g: 10.0,
    fiberPer100g: 0,
  },
  {
    id: 'claras_pasteurizadas',
    name: 'Clara de Ovo Pasteurizada',
    servingDescription: '100g',
    servingSizeGrams: 100,
    caloriesPer100g: 52,
    proteinPer100g: 11.0,
    carbsPer100g: 0.7,
    fatPer100g: 0.2,
    fiberPer100g: 0,
  },
  {
    id: 'whey_growth_30g',
    name: 'Whey Protein Concentrado 80% (Growth)',
    servingDescription: '1 scoop (30g)',
    servingSizeGrams: 30,
    caloriesPer100g: 413,
    proteinPer100g: 80.0,
    carbsPer100g: 10.0,
    fatPer100g: 6.0,
    fiberPer100g: 0,
  },
  {
    id: 'arroz_branco',
    name: 'Arroz Branco Cozido',
    servingDescription: '1 escumadeira (100g)',
    servingSizeGrams: 100,
    caloriesPer100g: 130,
    proteinPer100g: 2.7,
    carbsPer100g: 28.2,
    fatPer100g: 0.3,
    fiberPer100g: 0.4,
  },
  {
    id: 'pao_integral',
    name: 'Pão Integral 100%',
    servingDescription: '1 fatia (25g)',
    servingSizeGrams: 25,
    caloriesPer100g: 240,
    proteinPer100g: 9.0,
    carbsPer100g: 43.0,
    fatPer100g: 3.5,
    fiberPer100g: 6.0,
  },
  {
    id: 'cafe_especial',
    name: 'Café Especial Filtrado sem Açúcar',
    servingDescription: '1 xícara (150ml)',
    servingSizeGrams: 150,
    caloriesPer100g: 2,
    proteinPer100g: 0.2,
    carbsPer100g: 0.3,
    fatPer100g: 0.0,
    fiberPer100g: 0,
  },
  {
    id: 'pizza_calabresa',
    name: 'Fatia de Pizza Calabresa',
    servingDescription: '1 fatia (100g)',
    servingSizeGrams: 100,
    caloriesPer100g: 280,
    proteinPer100g: 11.5,
    carbsPer100g: 29.0,
    fatPer100g: 13.0,
    fiberPer100g: 2.0,
  },
  {
    id: 'pizza_mussarela',
    name: 'Fatia de Pizza Mussarela',
    servingDescription: '1 fatia (100g)',
    servingSizeGrams: 100,
    caloriesPer100g: 290,
    proteinPer100g: 12.0,
    carbsPer100g: 27.0,
    fatPer100g: 15.0,
    fiberPer100g: 1.5,
  },
  {
    id: 'salgadinho_festa',
    name: 'Salgadinho de Festa Frito (Coxinha/Kibe/Bolinha)',
    servingDescription: '1 unidade pequena (25g)',
    servingSizeGrams: 25,
    caloriesPer100g: 320,
    proteinPer100g: 6.5,
    carbsPer100g: 35.0,
    fatPer100g: 17.5,
    fiberPer100g: 1.2,
  },
  {
    id: 'bolo_festa_recheado',
    name: 'Bolo de Festa Confeitado',
    servingDescription: '1 fatia (100g)',
    servingSizeGrams: 100,
    caloriesPer100g: 360,
    proteinPer100g: 4.0,
    carbsPer100g: 55.0,
    fatPer100g: 14.0,
    fiberPer100g: 1.0,
  },
];

const FOOD_MAP = new Map<string, FoodItem>(PREPOPULATED_FOODS.map(f => [f.id, f]));

/**
 * Calcula os macronutrientes de uma receita customizada (totais e por porção).
 */
export function calculateRecipeMacros(recipe: RecipeInput): RecipeCalculationResult {
  let totalCalories = 0;
  let totalProtein = 0;
  let totalCarbs = 0;
  let totalFat = 0;
  let totalFiber = 0;

  for (const item of recipe.ingredients) {
    const food = FOOD_MAP.get(item.foodId);
    if (!food) {
      continue;
    }
    const factor = item.gramsOrUnits / 100;
    totalCalories += food.caloriesPer100g * factor;
    totalProtein += food.proteinPer100g * factor;
    totalCarbs += food.carbsPer100g * factor;
    totalFat += food.fatPer100g * factor;
    totalFiber += (food.fiberPer100g ?? 0) * factor;
  }

  const servings = Math.max(1, recipe.servings);

  return {
    recipeName: recipe.name,
    totalServings: servings,
    totalMacros: {
      calories: Math.round(totalCalories),
      proteinGrams: Math.round(totalProtein * 10) / 10,
      carbGrams: Math.round(totalCarbs * 10) / 10,
      fatGrams: Math.round(totalFat * 10) / 10,
      fiberGrams: Math.round(totalFiber * 10) / 10,
    },
    perServing: {
      calories: Math.round(totalCalories / servings),
      proteinGrams: Math.round((totalProtein / servings) * 10) / 10,
      carbGrams: Math.round((totalCarbs / servings) * 10) / 10,
      fatGrams: Math.round((totalFat / servings) * 10) / 10,
      fiberGrams: Math.round((totalFiber / servings) * 10) / 10,
    },
  };
}

/**
 * Retorna os IDs dos alimentos mais frequentes ordenados para uma janela de refeição específica.
 */
export function getMealFrequentFoodSuggestions(
  history: MealLogEntry[],
  window: MealWindow,
  limit: number = 5
): string[] {
  const windowEntries = history.filter(h => h.mealWindow === window);
  const counts = new Map<string, number>();

  for (const entry of windowEntries) {
    counts.set(entry.foodId, (counts.get(entry.foodId) ?? 0) + entry.count);
  }

  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([foodId]) => foodId);
}
