import { describe, it, expect } from 'vitest';
import {
  PREPOPULATED_FOODS,
  calculateRecipeMacros,
  recipeToFoodItem,
  calculateRecipePortionMacros,
  type RecipeInput,
  type FoodItem,
} from '../src/food-database.js';

describe('Recipe Engine & Portion Calculator (Módulo 3: Módulo de Receitas)', () => {
  const customWhey: FoodItem = {
    id: 'custom_whey_isolado',
    name: 'Whey Protein Isolado 90%',
    servingDescription: '1 scoop (30g)',
    servingSizeGrams: 30,
    caloriesPer100g: 370,
    proteinPer100g: 90,
    carbsPer100g: 1.5,
    fatPer100g: 0.5,
    fiberPer100g: 0,
    isCustom: true,
  };

  const banana: FoodItem = {
    id: 'banana_prata',
    name: 'Banana Prata Fresca',
    servingDescription: '1 unidade (70g)',
    servingSizeGrams: 70,
    caloriesPer100g: 98,
    proteinPer100g: 1.3,
    carbsPer100g: 26.0,
    fatPer100g: 0.1,
    fiberPer100g: 2.0,
  };

  const testFoods: FoodItem[] = [...PREPOPULATED_FOODS, customWhey, banana];

  it('deve calcular macros totais, por porção, peso total e densidade proteica aceitando alimentos customizados', () => {
    const recipe: RecipeInput = {
      name: 'Bolo de Banana com Whey',
      servings: 4,
      ingredients: [
        { foodId: 'custom_whey_isolado', gramsOrUnits: 60 }, // 60g whey: 222 kcal, 54g P, 0.9g C, 0.3g F, 0g fiber
        { foodId: 'banana_prata', gramsOrUnits: 140 }, // 140g banana: 137.2 kcal, 1.82g P, 36.4g C, 0.14g F, 2.8g fiber
        { foodId: 'claras_pasteurizadas', gramsOrUnits: 100 }, // 100g claras: 52 kcal, 11g P, 0.7g C, 0.2g F, 0g fiber
      ],
    };

    const result = calculateRecipeMacros(recipe, testFoods);

    expect(result.recipeName).toBe('Bolo de Banana com Whey');
    expect(result.totalServings).toBe(4);
    expect(result.totalWeightGrams).toBe(300); // 60 + 140 + 100

    // Totais
    const expectedCalories = 222 + 137.2 + 52; // ~411.2 -> 411
    const expectedProtein = 54 + 1.82 + 11; // 66.82 -> 66.8
    expect(result.totalMacros.calories).toBe(Math.round(expectedCalories));
    expect(result.totalMacros.proteinGrams).toBeCloseTo(expectedProtein, 1);
    expect(result.totalMacros.fiberGrams).toBeCloseTo(2.8, 1);

    // Por porção
    expect(result.perServing.calories).toBe(Math.round(expectedCalories / 4));
    expect(result.perServing.proteinGrams).toBeCloseTo(expectedProtein / 4, 1);

    // Densidade proteica (g proteína por 100 kcal)
    const expectedDensity = Math.round((expectedProtein / expectedCalories) * 100 * 10) / 10;
    expect(result.proteinDensity).toBeCloseTo(expectedDensity, 1);
  });

  it('deve converter uma receita em FoodItem preservando metadados de receita', () => {
    const recipe: RecipeInput = {
      id: 'recipe_bolo_whey',
      name: 'Bolo de Banana com Whey',
      servings: 4,
      ingredients: [
        { foodId: 'custom_whey_isolado', gramsOrUnits: 60 },
        { foodId: 'claras_pasteurizadas', gramsOrUnits: 100 },
      ],
    };

    const result = calculateRecipeMacros(recipe, testFoods);
    const foodItem = recipeToFoodItem(recipe, result, 'user_123');

    expect(foodItem.id).toBe('recipe_bolo_whey');
    expect(foodItem.name).toBe('Bolo de Banana com Whey');
    expect(foodItem.isCustom).toBe(true);
    expect(foodItem.isRecipe).toBe(true);
    expect(foodItem.userId).toBe('user_123');
    expect(foodItem.servingDescription).toContain('porção');
    expect(foodItem.servingSizeGrams).toBe(40); // 160g total / 4 servings = 40g por porção
    expect(foodItem.recipeData).toBeDefined();
    expect(foodItem.recipeData?.servings).toBe(4);
    expect(foodItem.recipeData?.ingredients.length).toBe(2);
  });

  it('deve calcular macros para porção consumida (porções inteiras, frações e gramas)', () => {
    const recipe: RecipeInput = {
      name: 'Receita Teste',
      servings: 4,
      ingredients: [
        { foodId: 'sassami', gramsOrUnits: 200 }, // 330 kcal, 62g P, 0g C, 7.2g F
        { foodId: 'arroz_branco', gramsOrUnits: 200 }, // 260 kcal, 5.4g P, 56.4g C, 0.6g F, 0.8g fiber
      ],
    };
    const result = calculateRecipeMacros(recipe);

    // Caso 1: Consumo por porção (ex: 1 porção das 4)
    const portion1 = calculateRecipePortionMacros(result, { type: 'serving', value: 1 });
    expect(portion1.equivalentServings).toBe(1);
    expect(portion1.calories).toBe(result.perServing.calories);
    expect(portion1.proteinGrams).toBe(result.perServing.proteinGrams);

    // Caso 2: Consumo por 2.5 porções
    const portion2 = calculateRecipePortionMacros(result, { type: 'serving', value: 2.5 });
    expect(portion2.equivalentServings).toBe(2.5);
    expect(portion2.calories).toBe(Math.round(result.perServing.calories * 2.5));

    // Caso 3: Consumo por fração (ex: 1/2 da receita = 0.5)
    const fractionPortion = calculateRecipePortionMacros(result, { type: 'fraction', value: 0.5 });
    expect(fractionPortion.equivalentServings).toBe(2); // 4 servings * 0.5 = 2
    expect(fractionPortion.calories).toBe(Math.round(result.totalMacros.calories * 0.5));
    expect(fractionPortion.proteinGrams).toBeCloseTo(result.totalMacros.proteinGrams * 0.5, 1);

    // Caso 4: Consumo por gramas (ex: 200g de um total de 400g = 50% da receita)
    const gramsPortion = calculateRecipePortionMacros(result, { type: 'grams', value: 200 });
    expect(gramsPortion.equivalentServings).toBe(2);
    expect(gramsPortion.calories).toBe(Math.round(result.totalMacros.calories * 0.5));
  });
});
