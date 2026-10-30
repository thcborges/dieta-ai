import {
  calculateRecipeMacros,
  recipeToFoodItem,
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
  createdAt: string;
  updatedAt: string;
}

export class RecipeService {
  private recipes: Map<string, StoredRecipe> = new Map();

  async createRecipe(input: RecipeInput, userId?: string): Promise<StoredRecipe> {
    const id = input.id || `recipe_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();

    const availableFoods = foodCacheService.getAllFoods(userId, true);
    const calculation = calculateRecipeMacros(input, availableFoods);

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
      userId: userId || input.userId,
      createdAt: now,
      updatedAt: now,
    };

    this.recipes.set(id, storedRecipe);

    // Sincroniza no foodCacheService
    const foodItem = recipeToFoodItem({ ...input, id }, calculation, userId);
    foodCacheService.saveFoodItem(foodItem);

    return storedRecipe;
  }

  async getRecipes(userId?: string): Promise<StoredRecipe[]> {
    const result: StoredRecipe[] = [];
    for (const recipe of this.recipes.values()) {
      if (!recipe.userId || (userId && recipe.userId === userId)) {
        result.push(recipe);
      }
    }
    return result;
  }

  async getRecipeById(id: string, userId?: string): Promise<StoredRecipe | null> {
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

    const availableFoods = foodCacheService.getAllFoods(userId, true);
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

    this.recipes.set(id, updatedRecipe);

    // Atualiza no cache de alimentos
    const foodItem = recipeToFoodItem({ ...input, id }, calculation, userId);
    foodCacheService.saveFoodItem(foodItem);

    return updatedRecipe;
  }

  async deleteRecipe(id: string, userId?: string): Promise<boolean> {
    const existing = await this.getRecipeById(id, userId);
    if (!existing) return false;

    this.recipes.delete(id);
    foodCacheService.deleteFoodItem(id);
    return true;
  }
}

export const recipeService = new RecipeService();
