import { Firestore } from '@google-cloud/firestore';
import { generateBlindIndex } from '@dieta-ai/core';

export type MealWindow = 'breakfast' | 'lunch' | 'afternoon_snack' | 'dinner_event';

export interface LoggedFood {
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

export type MealMap = Record<MealWindow, LoggedFood[]>;

export interface DiaryTotals {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
}

export interface DailyDiaryDoc {
  blindUserId: string;
  date: string;
  meals: MealMap;
  totals: DiaryTotals;
  updatedAt: string;
  createdAt: string;
}

export function calculateDiaryTotals(meals: MealMap): DiaryTotals {
  let calories = 0;
  let protein = 0;
  let carbs = 0;
  let fat = 0;
  let fiber = 0;

  for (const items of Object.values(meals)) {
    if (Array.isArray(items)) {
      for (const item of items) {
        calories += item.calories || 0;
        protein += item.protein || 0;
        carbs += item.carbs || 0;
        fat += item.fat || 0;
        fiber += item.fiber || 0;
      }
    }
  }

  return {
    calories: Math.round(calories),
    protein: Math.round(protein * 10) / 10,
    carbs: Math.round(carbs * 10) / 10,
    fat: Math.round(fat * 10) / 10,
    fiber: Math.round(fiber * 10) / 10,
  };
}

export function getEmptyMeals(): MealMap {
  return {
    breakfast: [],
    lunch: [],
    afternoon_snack: [],
    dinner_event: [],
  };
}

export class FirestoreDiaryService {
  private firestore: Firestore | null = null;
  private readonly pepper: string;
  private inMemoryFallback: Map<string, DailyDiaryDoc> = new Map();

  constructor(options?: { firestore?: Firestore; pepper?: string }) {
    this.pepper = options?.pepper || process.env.BLIND_INDEX_PEPPER || 'macrometrics-secret-pepper-us-central1';
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
          this.firestore = new Firestore({
            projectId,
          });
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

  public getBlindUserId(userId: string): string {
    return generateBlindIndex(userId, this.pepper);
  }

  private getDocId(blindUserId: string, date: string): string {
    return `${blindUserId}_${date}`;
  }

  public async getDiary(userId: string, date: string): Promise<DailyDiaryDoc> {
    const blindUserId = this.getBlindUserId(userId);
    const docId = this.getDocId(blindUserId, date);
    const db = this.getFirestore();

    if (db) {
      try {
        const docRef = db.collection('diaries').doc(docId);
        const snapshot = await docRef.get();

        if (snapshot.exists) {
          const data = snapshot.data() as DailyDiaryDoc;
          return {
            blindUserId,
            date,
            meals: {
              breakfast: data.meals?.breakfast || [],
              lunch: data.meals?.lunch || [],
              afternoon_snack: data.meals?.afternoon_snack || [],
              dinner_event: data.meals?.dinner_event || [],
            },
            totals: data.totals || calculateDiaryTotals(data.meals || getEmptyMeals()),
            updatedAt: data.updatedAt || new Date().toISOString(),
            createdAt: data.createdAt || new Date().toISOString(),
          };
        }
      } catch {
        // Fallback para memória se o Firestore falhar
      }
    }

    const cached = this.inMemoryFallback.get(docId);
    if (cached) return cached;

    // Se não existir, retorna um diário padrão vazio para aquela data
    const emptyMeals = getEmptyMeals();
    return {
      blindUserId,
      date,
      meals: emptyMeals,
      totals: calculateDiaryTotals(emptyMeals),
      updatedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };
  }

  public async saveDiary(userId: string, date: string, meals: MealMap): Promise<DailyDiaryDoc> {
    const blindUserId = this.getBlindUserId(userId);
    const docId = this.getDocId(blindUserId, date);
    const totals = calculateDiaryTotals(meals);
    const now = new Date().toISOString();

    const normalizedMeals: MealMap = {
      breakfast: meals.breakfast || [],
      lunch: meals.lunch || [],
      afternoon_snack: meals.afternoon_snack || [],
      dinner_event: meals.dinner_event || [],
    };

    const diaryDoc: DailyDiaryDoc = {
      blindUserId,
      date,
      meals: normalizedMeals,
      totals,
      updatedAt: now,
      createdAt: now,
    };

    const db = this.getFirestore();
    if (db) {
      try {
        const docRef = db.collection('diaries').doc(docId);
        await docRef.set(diaryDoc, { merge: true });
      } catch {
        // Salva no in-memory fallback se Firestore falhar
      }
    }

    this.inMemoryFallback.set(docId, diaryDoc);
    return diaryDoc;
  }

  public async addFoodToMeal(
    userId: string,
    date: string,
    window: MealWindow,
    item: LoggedFood
  ): Promise<DailyDiaryDoc> {
    const diary = await this.getDiary(userId, date);
    const currentWindowMeals = diary.meals[window] || [];

    const updatedWindowMeals = [...currentWindowMeals, item];
    const updatedMeals: MealMap = {
      ...diary.meals,
      [window]: updatedWindowMeals,
    };

    return this.saveDiary(userId, date, updatedMeals);
  }

  public async removeFoodFromMeal(
    userId: string,
    date: string,
    window: MealWindow,
    itemId: string
  ): Promise<DailyDiaryDoc> {
    const diary = await this.getDiary(userId, date);
    const currentWindowMeals = diary.meals[window] || [];

    const updatedWindowMeals = currentWindowMeals.filter(i => i.id !== itemId);
    const updatedMeals: MealMap = {
      ...diary.meals,
      [window]: updatedWindowMeals,
    };

    return this.saveDiary(userId, date, updatedMeals);
  }

  public async purgeUserDiaries(userId: string): Promise<number> {
    const blindUserId = this.getBlindUserId(userId);
    let deletedCount = 0;
    const db = this.getFirestore();

    if (db) {
      try {
        const snapshot = await db
          .collection('diaries')
          .where('blindUserId', '==', blindUserId)
          .get();

        const batch = db.batch();
        for (const doc of snapshot.docs) {
          batch.delete(doc.ref);
          deletedCount++;
        }
        if (deletedCount > 0) {
          await batch.commit();
        }
      } catch {
        // Ignora erro de rede e limpa fallback
      }
    }

    // Limpa do fallback in-memory
    for (const [key, val] of this.inMemoryFallback.entries()) {
      if (val.blindUserId === blindUserId) {
        this.inMemoryFallback.delete(key);
        deletedCount++;
      }
    }

    return deletedCount;
  }
}

export const firestoreDiaryService = new FirestoreDiaryService();
