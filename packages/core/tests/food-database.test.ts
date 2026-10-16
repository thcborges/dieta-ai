import { describe, it, expect } from 'vitest';
import {
  PREPOPULATED_FOODS,
  calculateRecipeMacros,
  getMealFrequentFoodSuggestions,
  type RecipeInput,
  type MealLogEntry,
} from '../src/food-database.js';

describe('Food Database & Meal Intelligence (Módulo 3)', () => {
  it('deve conter a base alimentar de rotina pré-populada', () => {
    const foodKeys = PREPOPULATED_FOODS.map(f => f.id);
    expect(foodKeys).toContain('sassami');
    expect(foodKeys).toContain('feijao_preto');
    expect(foodKeys).toContain('batata_doce');
    expect(foodKeys).toContain('ovos_inteiros');
    expect(foodKeys).toContain('claras_pasteurizadas');
    expect(foodKeys).toContain('whey_growth_30g');
    expect(foodKeys).toContain('arroz_branco');
    expect(foodKeys).toContain('pao_integral');
  });

  it('deve calcular macros totais e por porção de uma receita customizada (ex: Bolo Cappuccino Whey)', () => {
    const recipe: RecipeInput = {
      name: 'Bolo de Whey Cappuccino',
      servings: 4,
      ingredients: [
        { foodId: 'whey_growth_30g', gramsOrUnits: 60 }, // 2 scoops (48g P, 6g C, 3.6g F, 248 kcal)
        { foodId: 'claras_pasteurizadas', gramsOrUnits: 150 }, // 16.5g P, 1g C, 0.3g F, 78 kcal
        { foodId: 'ovos_inteiros', gramsOrUnits: 100 }, // 2 ovos (13g P, 1g C, 10g F, 143 kcal)
      ],
    };

    const result = calculateRecipeMacros(recipe);

    expect(result.totalServings).toBe(4);
    expect(result.perServing.calories).toBeGreaterThan(0);
    expect(result.perServing.proteinGrams).toBeCloseTo((48 + 16.5 + 13) / 4, 1);
  });

  it('deve ignorar ingredientes com IDs não encontrados no banco ao calcular receita', () => {
    const recipe: RecipeInput = {
      name: 'Receita com ingrediente fantasma',
      servings: 1,
      ingredients: [
        { foodId: 'id_inexistente_999', gramsOrUnits: 100 },
        { foodId: 'sassami', gramsOrUnits: 100 },
      ],
    };

    const result = calculateRecipeMacros(recipe);
    expect(result.totalMacros.calories).toBe(165);
    expect(result.totalMacros.proteinGrams).toBe(31);
  });

  it('deve priorizar alimentos frequentes da janela específica (café da manhã vs almoço)', () => {
    const history: MealLogEntry[] = [
      { mealWindow: 'breakfast', foodId: 'ovos_inteiros', count: 10 },
      { mealWindow: 'breakfast', foodId: 'pao_integral', count: 8 },
      { mealWindow: 'lunch', foodId: 'sassami', count: 12 },
      { mealWindow: 'lunch', foodId: 'feijao_preto', count: 12 },
      { mealWindow: 'lunch', foodId: 'batata_doce', count: 10 },
    ];

    const breakfastSuggestions = getMealFrequentFoodSuggestions(history, 'breakfast');
    expect(breakfastSuggestions).toContain('ovos_inteiros');
    expect(breakfastSuggestions).toContain('pao_integral');
    expect(breakfastSuggestions).not.toContain('feijao_preto');

    const lunchSuggestions = getMealFrequentFoodSuggestions(history, 'lunch');
    expect(lunchSuggestions).toContain('sassami');
    expect(lunchSuggestions).toContain('feijao_preto');
    expect(lunchSuggestions).not.toContain('pao_integral');
  });

  it('deve conter informações de fibras nos alimentos pré-populados e calcular fibra em receitas', () => {
    const feijao = PREPOPULATED_FOODS.find(f => f.id === 'feijao_preto');
    expect(feijao?.fiberPer100g).toBeGreaterThan(0);

    const recipe: RecipeInput = {
      name: 'Prato com Fibra',
      servings: 2,
      ingredients: [
        { foodId: 'feijao_preto', gramsOrUnits: 200 },
        { foodId: 'arroz_branco', gramsOrUnits: 200 },
      ],
    };
    const result = calculateRecipeMacros(recipe);
    expect(result.totalMacros.fiberGrams).toBeDefined();
    expect(result.totalMacros.fiberGrams).toBeGreaterThan(0);
    expect(result.perServing.fiberGrams).toBeDefined();
  });
});
