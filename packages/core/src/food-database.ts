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
  userId?: string;
  isValidated?: boolean;
  isRecipe?: boolean;
  recipeData?: RecipeInput & { totalWeightGrams?: number };
}

export interface RecipeIngredient {
  foodId: string;
  gramsOrUnits: number;
}

export interface RecipeInput {
  id?: string;
  name: string;
  servings: number;
  servingUnitName?: string;
  ingredients: RecipeIngredient[];
  userId?: string;
}

export interface RecipeCalculationResult {
  recipeName: string;
  totalServings: number;
  totalWeightGrams: number;
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
  proteinDensity: number;
}

export interface RecipePortionResult {
  equivalentServings: number;
  equivalentGrams: number;
  calories: number;
  proteinGrams: number;
  carbGrams: number;
  fatGrams: number;
  fiberGrams: number;
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
    name: 'Filé de Sassami Desfiado Cozido (Frango)',
    servingDescription: '100g',
    servingSizeGrams: 100,
    caloriesPer100g: 165,
    proteinPer100g: 31,
    carbsPer100g: 0,
    fatPer100g: 3.6,
    fiberPer100g: 0,
  },
  {
    id: 'peito_frango_grelhado',
    name: 'Peito de Frango Grelhado',
    servingDescription: '1 filé médio (100g)',
    servingSizeGrams: 100,
    caloriesPer100g: 159,
    proteinPer100g: 32.0,
    carbsPer100g: 0,
    fatPer100g: 2.5,
    fiberPer100g: 0,
  },
  {
    id: 'sobrecoxa_frango_assada',
    name: 'Sobrecoxa de Frango Assada sem Pele',
    servingDescription: '1 unidade média (100g)',
    servingSizeGrams: 100,
    caloriesPer100g: 215,
    proteinPer100g: 24.5,
    carbsPer100g: 0,
    fatPer100g: 12.5,
    fiberPer100g: 0,
  },
  {
    id: 'frango_desfiado_cozido',
    name: 'Frango Desfiado Cozido',
    servingDescription: '100g',
    servingSizeGrams: 100,
    caloriesPer100g: 165,
    proteinPer100g: 31.0,
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
    id: 'whey_black_skull',
    name: 'Whey Protein 100% HD (Black Skull)',
    servingDescription: '1 scoop (30g)',
    servingSizeGrams: 30,
    caloriesPer100g: 400,
    proteinPer100g: 76.7,
    carbsPer100g: 14.7,
    fatPer100g: 4.3,
    fiberPer100g: 0,
  },
  {
    id: 'whey_max_titanium',
    name: '100% Whey Concentrado (Max Titanium)',
    servingDescription: '1 scoop (30g)',
    servingSizeGrams: 30,
    caloriesPer100g: 403,
    proteinPer100g: 70.0,
    carbsPer100g: 16.7,
    fatPer100g: 6.7,
    fiberPer100g: 0,
  },
  {
    id: 'whey_growth_isolado',
    name: 'Whey Protein Isolado 90% (Growth)',
    servingDescription: '1 scoop (30g)',
    servingSizeGrams: 30,
    caloriesPer100g: 370,
    proteinPer100g: 90.0,
    carbsPer100g: 0.0,
    fatPer100g: 0.5,
    fiberPer100g: 0,
  },
  {
    id: 'whey_dux_concentrado',
    name: 'Whey Protein Concentrado (DUX Nutrition)',
    servingDescription: '1 scoop (30g)',
    servingSizeGrams: 30,
    caloriesPer100g: 397,
    proteinPer100g: 73.3,
    carbsPer100g: 13.3,
    fatPer100g: 6.7,
    fiberPer100g: 0,
  },
  {
    id: 'whey_dux_isolado',
    name: 'Whey Protein Isolado (DUX Nutrition)',
    servingDescription: '1 scoop (30g)',
    servingSizeGrams: 30,
    caloriesPer100g: 373,
    proteinPer100g: 80.0,
    carbsPer100g: 6.7,
    fatPer100g: 3.0,
    fiberPer100g: 0,
  },
  {
    id: 'whey_integralmedica_100',
    name: '100% Pure Whey (Integralmédica)',
    servingDescription: '1 scoop (30g)',
    servingSizeGrams: 30,
    caloriesPer100g: 400,
    proteinPer100g: 70.0,
    carbsPer100g: 16.7,
    fatPer100g: 6.7,
    fiberPer100g: 0,
  },
  {
    id: 'whey_probiotica_100',
    name: '100% Pure Whey (Probiótica)',
    servingDescription: '1 scoop (30g)',
    servingSizeGrams: 30,
    caloriesPer100g: 400,
    proteinPer100g: 76.7,
    carbsPer100g: 10.0,
    fatPer100g: 6.0,
    fiberPer100g: 0,
  },
  {
    id: 'whey_optimum_gold',
    name: '100% Whey Gold Standard (Optimum Nutrition)',
    servingDescription: '1 scoop (30.4g)',
    servingSizeGrams: 30.4,
    caloriesPer100g: 395,
    proteinPer100g: 78.9,
    carbsPer100g: 9.9,
    fatPer100g: 4.9,
    fiberPer100g: 0,
  },
  {
    id: 'patinho_moido',
    name: 'Carne Bovina Patinho Moído Grelhado',
    servingDescription: '1 porção (100g)',
    servingSizeGrams: 100,
    caloriesPer100g: 219,
    proteinPer100g: 35.9,
    carbsPer100g: 0.0,
    fatPer100g: 7.3,
    fiberPer100g: 0,
  },
  {
    id: 'tilapia_grelhada',
    name: 'Filé de Tilápia Grelhado',
    servingDescription: '1 filé (100g)',
    servingSizeGrams: 100,
    caloriesPer100g: 128,
    proteinPer100g: 26.0,
    carbsPer100g: 0.0,
    fatPer100g: 2.7,
    fiberPer100g: 0,
  },
  {
    id: 'atum_solido_agua',
    name: 'Atum Sólido em Água (Lata)',
    servingDescription: '1 lata drenada (120g)',
    servingSizeGrams: 120,
    caloriesPer100g: 116,
    proteinPer100g: 26.0,
    carbsPer100g: 0.0,
    fatPer100g: 1.0,
    fiberPer100g: 0,
  },
  {
    id: 'iogurte_desnatado',
    name: 'Iogurte Natural Desnatado',
    servingDescription: '1 pote (170g)',
    servingSizeGrams: 170,
    caloriesPer100g: 43,
    proteinPer100g: 4.3,
    carbsPer100g: 6.5,
    fatPer100g: 0.0,
    fiberPer100g: 0,
  },
  {
    id: 'leite_desnatado',
    name: 'Leite Desnatado Pasteurizado',
    servingDescription: '1 copo (200ml)',
    servingSizeGrams: 200,
    caloriesPer100g: 35,
    proteinPer100g: 3.2,
    carbsPer100g: 5.0,
    fatPer100g: 0.0,
    fiberPer100g: 0,
  },
  {
    id: 'queijo_cottage',
    name: 'Queijo Cottage Fresco Light',
    servingDescription: '2 colheres de sopa (50g)',
    servingSizeGrams: 50,
    caloriesPer100g: 72,
    proteinPer100g: 12.0,
    carbsPer100g: 3.0,
    fatPer100g: 1.5,
    fiberPer100g: 0,
  },
  {
    id: 'queijo_minas_light',
    name: 'Queijo Minas Frescal Light',
    servingDescription: '1 fatia média (50g)',
    servingSizeGrams: 50,
    caloriesPer100g: 160,
    proteinPer100g: 16.0,
    carbsPer100g: 2.0,
    fatPer100g: 10.0,
    fiberPer100g: 0,
  },
  {
    id: 'pasta_amendoim_integral',
    name: 'Pasta de Amendoim Integral',
    servingDescription: '1 colher de sopa (20g)',
    servingSizeGrams: 20,
    caloriesPer100g: 588,
    proteinPer100g: 28.0,
    carbsPer100g: 18.0,
    fatPer100g: 50.0,
    fiberPer100g: 8.0,
  },
  {
    id: 'banana_prata',
    name: 'Banana Prata',
    servingDescription: '1 unidade média (100g)',
    servingSizeGrams: 100,
    caloriesPer100g: 89,
    proteinPer100g: 1.1,
    carbsPer100g: 22.8,
    fatPer100g: 0.3,
    fiberPer100g: 2.6,
  },
  {
    id: 'maca_fuji',
    name: 'Maçã Fuji com Casca',
    servingDescription: '1 unidade média (130g)',
    servingSizeGrams: 130,
    caloriesPer100g: 52,
    proteinPer100g: 0.3,
    carbsPer100g: 13.8,
    fatPer100g: 0.2,
    fiberPer100g: 2.4,
  },
  {
    id: 'barra_proteina_growth',
    name: 'Barra de Proteína Protein Bar (Growth)',
    servingDescription: '1 barra (40g)',
    servingSizeGrams: 40,
    caloriesPer100g: 388,
    proteinPer100g: 32.5,
    carbsPer100g: 27.5,
    fatPer100g: 16.0,
    fiberPer100g: 10.0,
  },
  {
    id: 'creatina_monohidratada',
    name: 'Creatina Monohidratada 100% Pura (Creapure)',
    servingDescription: '1 dosador (3g)',
    servingSizeGrams: 3,
    caloriesPer100g: 0,
    proteinPer100g: 0.0,
    carbsPer100g: 0.0,
    fatPer100g: 0.0,
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
export function calculateRecipeMacros(
  recipe: RecipeInput,
  availableFoods?: FoodItem[]
): RecipeCalculationResult {
  let totalCalories = 0;
  let totalProtein = 0;
  let totalCarbs = 0;
  let totalFat = 0;
  let totalFiber = 0;
  let totalWeightGrams = 0;

  const foodMap = availableFoods
    ? new Map<string, FoodItem>([...FOOD_MAP.entries(), ...availableFoods.map(f => [f.id, f] as [string, FoodItem])])
    : FOOD_MAP;

  for (const item of recipe.ingredients) {
    const food = foodMap.get(item.foodId);
    if (!food) {
      continue;
    }
    const factor = item.gramsOrUnits / 100;
    totalWeightGrams += item.gramsOrUnits;
    totalCalories += food.caloriesPer100g * factor;
    totalProtein += food.proteinPer100g * factor;
    totalCarbs += food.carbsPer100g * factor;
    totalFat += food.fatPer100g * factor;
    totalFiber += (food.fiberPer100g ?? 0) * factor;
  }

  const servings = Math.max(1, recipe.servings);
  const roundedCalories = Math.round(totalCalories);
  const roundedProtein = Math.round(totalProtein * 10) / 10;
  const roundedCarbs = Math.round(totalCarbs * 10) / 10;
  const roundedFat = Math.round(totalFat * 10) / 10;
  const roundedFiber = Math.round(totalFiber * 10) / 10;

  const proteinDensity =
    totalCalories > 0 ? Math.round((totalProtein / totalCalories) * 100 * 10) / 10 : 0;

  return {
    recipeName: recipe.name,
    totalServings: servings,
    totalWeightGrams: Math.round(totalWeightGrams * 10) / 10,
    totalMacros: {
      calories: roundedCalories,
      proteinGrams: roundedProtein,
      carbGrams: roundedCarbs,
      fatGrams: roundedFat,
      fiberGrams: roundedFiber,
    },
    perServing: {
      calories: Math.round(totalCalories / servings),
      proteinGrams: Math.round((totalProtein / servings) * 10) / 10,
      carbGrams: Math.round((totalCarbs / servings) * 10) / 10,
      fatGrams: Math.round((totalFat / servings) * 10) / 10,
      fiberGrams: Math.round((totalFiber / servings) * 10) / 10,
    },
    proteinDensity,
  };
}

/**
 * Converte o resultado de cálculo de uma receita em um FoodItem para integração perfeita no diário.
 */
export function recipeToFoodItem(
  recipe: RecipeInput,
  result: RecipeCalculationResult,
  userId?: string
): FoodItem {
  const servingSize =
    result.totalWeightGrams > 0
      ? Math.round(result.totalWeightGrams / result.totalServings)
      : 100;

  const factor100g =
    result.totalWeightGrams > 0 ? 100 / result.totalWeightGrams : 100 / servingSize;

  const unitName = recipe.servingUnitName || 'porção';

  return {
    id: recipe.id || `recipe_${recipe.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${Date.now()}`,
    name: recipe.name,
    servingDescription: `1 ${unitName} (${servingSize}g - 1/${result.totalServings})`,
    servingSizeGrams: servingSize,
    caloriesPer100g: Math.round(result.totalMacros.calories * factor100g),
    proteinPer100g: Math.round(result.totalMacros.proteinGrams * factor100g * 10) / 10,
    carbsPer100g: Math.round(result.totalMacros.carbGrams * factor100g * 10) / 10,
    fatPer100g: Math.round(result.totalMacros.fatGrams * factor100g * 10) / 10,
    fiberPer100g: Math.round(result.totalMacros.fiberGrams * factor100g * 10) / 10,
    isCustom: true,
    isRecipe: true,
    userId: userId || recipe.userId,
    recipeData: {
      ...recipe,
      totalWeightGrams: result.totalWeightGrams,
    },
  };
}

/**
 * Calcula os macronutrientes para uma porção ou fração consumida de uma receita.
 */
export function calculateRecipePortionMacros(
  recipeResult: RecipeCalculationResult,
  portion: { type: 'serving' | 'fraction' | 'grams'; value: number }
): RecipePortionResult {
  let equivalentServings = 0;
  let equivalentGrams = 0;

  const totalServings = Math.max(1, recipeResult.totalServings);
  const totalWeight =
    recipeResult.totalWeightGrams > 0 ? recipeResult.totalWeightGrams : totalServings * 100;

  if (portion.type === 'serving') {
    equivalentServings = portion.value;
    equivalentGrams = Math.round((totalWeight / totalServings) * portion.value);
    return {
      equivalentServings,
      equivalentGrams,
      calories: Math.round(recipeResult.perServing.calories * portion.value),
      proteinGrams: Math.round(recipeResult.perServing.proteinGrams * portion.value * 10) / 10,
      carbGrams: Math.round(recipeResult.perServing.carbGrams * portion.value * 10) / 10,
      fatGrams: Math.round(recipeResult.perServing.fatGrams * portion.value * 10) / 10,
      fiberGrams: Math.round(recipeResult.perServing.fiberGrams * portion.value * 10) / 10,
    };
  }

  let fractionOfRecipe = 0;
  if (portion.type === 'fraction') {
    fractionOfRecipe = portion.value;
    equivalentServings = Math.round(portion.value * totalServings * 100) / 100;
    equivalentGrams = Math.round(totalWeight * portion.value);
  } else if (portion.type === 'grams') {
    equivalentGrams = portion.value;
    fractionOfRecipe = totalWeight > 0 ? portion.value / totalWeight : 0;
    equivalentServings = Math.round(fractionOfRecipe * totalServings * 100) / 100;
  }

  return {
    equivalentServings,
    equivalentGrams,
    calories: Math.round(recipeResult.totalMacros.calories * fractionOfRecipe),
    proteinGrams: Math.round(recipeResult.totalMacros.proteinGrams * fractionOfRecipe * 10) / 10,
    carbGrams: Math.round(recipeResult.totalMacros.carbGrams * fractionOfRecipe * 10) / 10,
    fatGrams: Math.round(recipeResult.totalMacros.fatGrams * fractionOfRecipe * 10) / 10,
    fiberGrams: Math.round(recipeResult.totalMacros.fiberGrams * fractionOfRecipe * 10) / 10,
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

export const COMMON_FOOD_PRESETS_BY_WINDOW: Record<MealWindow, string[]> = {
  breakfast: [
    'ovos_inteiros',
    'claras_pasteurizadas',
    'pao_integral',
    'cafe_especial',
    'banana_prata',
    'queijo_cottage',
    'queijo_minas_light',
    'iogurte_desnatado',
    'pasta_amendoim_integral',
    'whey_growth_30g',
  ],
  lunch: [
    'sassami',
    'peito_frango_grelhado',
    'feijao_preto',
    'arroz_branco',
    'batata_doce',
    'patinho_moido',
    'tilapia_grelhada',
    'frango_desfiado_cozido',
    'sobrecoxa_frango_assada',
    'ovos_inteiros',
  ],
  afternoon_snack: [
    'whey_growth_30g',
    'whey_black_skull',
    'banana_prata',
    'maca_fuji',
    'iogurte_desnatado',
    'barra_proteina_growth',
    'pao_integral',
    'pasta_amendoim_integral',
    'queijo_cottage',
    'leite_desnatado',
  ],
  dinner_event: [
    'sassami',
    'patinho_moido',
    'peito_frango_grelhado',
    'batata_doce',
    'arroz_branco',
    'feijao_preto',
    'tilapia_grelhada',
    'pizza_calabresa',
    'pizza_mussarela',
    'salgadinho_festa',
  ],
};

/**
 * Retorna os 10 alimentos mais comuns para uma janela de refeição específica,
 * priorizando histórico de consumo do usuário quando disponível.
 */
export function getCommonFoodsForMeal(
  window: MealWindow,
  availableFoods: FoodItem[] = PREPOPULATED_FOODS,
  history?: MealLogEntry[],
  limit: number = 10
): FoodItem[] {
  let targetIds: string[] = [];

  if (history && history.length > 0) {
    const frequentFromHistory = getMealFrequentFoodSuggestions(history, window, limit);
    targetIds = [...frequentFromHistory];
  }

  const presets = COMMON_FOOD_PRESETS_BY_WINDOW[window] || [];
  for (const pid of presets) {
    if (!targetIds.includes(pid)) {
      targetIds.push(pid);
    }
    if (targetIds.length >= limit) break;
  }

  const foodMap = new Map<string, FoodItem>(availableFoods.map(f => [f.id, f]));
  const result: FoodItem[] = [];
  for (const id of targetIds) {
    const found = foodMap.get(id);
    if (found) {
      result.push(found);
    }
  }
  return result;
}

/**
 * Filtra a lista de alimentos respeitando o isolamento por usuário.
 * Alimentos sem usuário/prepopulados ou validados por administrador são públicos.
 * Alimentos customizados pendentes de validação só são visíveis para seu criador ou administradores.
 */
export function filterVisibleFoods(
  foods: FoodItem[],
  userId?: string,
  isAdmin: boolean = false
): FoodItem[] {
  if (isAdmin) return foods;
  return foods.filter(food => {
    if (!food.isCustom || food.isValidated || !food.userId) {
      return true;
    }
    return Boolean(userId && food.userId === userId);
  });
}

/**
 * Normaliza texto para busca: converte para minúsculas, remove espaços extras,
 * colapsa caracteres repetidos em excesso (ex: "blackskulll" -> "blackskull"),
 * substitui separadores comuns por espaços e remove marcas diacríticas / acentos (ex: "Pão" -> "pao").
 */
export function normalizeSearchText(text: string): string {
  return (text || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/(.)\1{2,}/g, '$1$1')
    .replace(/[_\-./()]/g, ' ')
    .trim();
}

/**
 * Busca alimentos por nome (insensível a maiúsculas, acentuação e espaçamento), código de barras ou múltiplos tokens
 * respeitando as regras de visibilidade e moderação de alimentos customizados.
 */
export function searchFoodItems(
  items: FoodItem[],
  query: string,
  userId?: string,
  isAdmin: boolean = false
): FoodItem[] {
  const visibleItems = filterVisibleFoods(items, userId, isAdmin);
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) return visibleItems;

  const queryTokens = normalizedQuery.split(/\s+/).filter(Boolean);
  const unspacedQuery = normalizedQuery.replace(/\s+/g, '');

  return visibleItems.filter(item => {
    const normalizedName = normalizeSearchText(item.name);
    const normalizedId = normalizeSearchText(item.id);
    const normalizedBarcode = (item as { barcode?: string }).barcode
      ? normalizeSearchText((item as { barcode?: string }).barcode!)
      : '';

    const unspacedName = normalizedName.replace(/\s+/g, '');
    const unspacedId = normalizedId.replace(/\s+/g, '');

    // 1. Correspondência direta por substring contígua
    if (
      normalizedName.includes(normalizedQuery) ||
      normalizedId.includes(normalizedQuery) ||
      (normalizedBarcode && normalizedBarcode.includes(normalizedQuery))
    ) {
      return true;
    }

    // 2. Correspondência sem espaços (ex: "blackskull" ou "blackskulll" -> "black skull")
    if (unspacedName.includes(unspacedQuery) || unspacedId.includes(unspacedQuery)) {
      return true;
    }

    // 3. Correspondência multi-token: todos os termos digitados devem existir no nome, ID ou código de barras
    return queryTokens.every(token => {
      const unspacedToken = token.replace(/\s+/g, '');
      return (
        normalizedName.includes(token) ||
        normalizedId.includes(token) ||
        normalizedBarcode.includes(token) ||
        unspacedName.includes(unspacedToken) ||
        unspacedId.includes(unspacedToken)
      );
    });
  });
}


