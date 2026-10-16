export interface LoggedFoodItem {
  id: string;
  foodId: string;
  name: string;
  grams: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
}

export type MealWindow = 'breakfast' | 'lunch' | 'afternoon_snack' | 'dinner_event';
export type MealMap = Record<MealWindow, LoggedFoodItem[]>;

export const createEmptyDiary = (): MealMap => ({
  breakfast: [],
  lunch: [],
  afternoon_snack: [],
  dinner_event: [],
});

export class DiaryService {
  private userDiaries: Map<string, MealMap> = new Map();

  getDiary(userId: string): MealMap {
    const diary = this.userDiaries.get(userId);
    if (!diary) {
      return createEmptyDiary();
    }
    // Retorna uma cópia isolada para proteger a integridade
    return {
      breakfast: [...diary.breakfast],
      lunch: [...diary.lunch],
      afternoon_snack: [...diary.afternoon_snack],
      dinner_event: [...diary.dinner_event],
    };
  }

  saveDiary(userId: string, meals: MealMap): MealMap {
    const sanitizedMeals: MealMap = {
      breakfast: Array.isArray(meals.breakfast) ? [...meals.breakfast] : [],
      lunch: Array.isArray(meals.lunch) ? [...meals.lunch] : [],
      afternoon_snack: Array.isArray(meals.afternoon_snack) ? [...meals.afternoon_snack] : [],
      dinner_event: Array.isArray(meals.dinner_event) ? [...meals.dinner_event] : [],
    };
    this.userDiaries.set(userId, sanitizedMeals);
    return sanitizedMeals;
  }

  clearUserDiary(userId: string): void {
    this.userDiaries.delete(userId);
  }
}

export const diaryService = new DiaryService();
