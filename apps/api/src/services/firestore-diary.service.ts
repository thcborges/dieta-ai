import { Firestore } from '@google-cloud/firestore';
import { generateBlindIndex, canonicalizeUserId, getRollingDays } from '@dieta-ai/core';

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
  userId?: string;
  user_id?: string;
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

async function withTimeout<T>(promise: Promise<T>, ms: number = 3000): Promise<T> {
  let timeoutId: NodeJS.Timeout;
  promise.catch(() => {});
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(`Firestore operation timed out (${ms}ms)`)), ms);
  });
  return Promise.race([promise, timeoutPromise]).finally(() => {
    clearTimeout(timeoutId);
  });
}

export class FirestoreDiaryService {
  private firestore: Firestore | null = null;
  private readonly pepper: string;
  private inMemoryFallback: Map<string, DailyDiaryDoc> = new Map();

  constructor(options?: { firestore?: Firestore; pepper?: string }) {
    const configuredPepper = options?.pepper || process.env.BLIND_INDEX_PEPPER || process.env.LGPD_SECRET_PEPPER;
    if (!configuredPepper) {
      if (process.env.NODE_ENV === 'test') {
        this.pepper = 'test-blind-index-pepper-32chars!!';
      } else {
        throw new Error('Configuração de segurança ausente: BLIND_INDEX_PEPPER deve ser definido via variáveis de ambiente.');
      }
    } else {
      this.pepper = configuredPepper;
    }
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
    const canonical = canonicalizeUserId(userId);
    if (/^[a-f0-9]{64}$/i.test(canonical)) {
      return canonical;
    }
    return generateBlindIndex(canonical, this.pepper);
  }

  private getDocId(blindUserId: string, date: string): string {
    return `${blindUserId}_${date}`;
  }

  public async getDiary(userId: string, date: string): Promise<DailyDiaryDoc> {
    const canonicalId = canonicalizeUserId(userId);
    const blindUserId = this.getBlindUserId(canonicalId);
    const docId = this.getDocId(blindUserId, date);
    const db = this.getFirestore();

    if (db) {
      try {
        const docRef = db.collection('diaries').doc(docId);
        const snapshot = await withTimeout(docRef.get());

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
    if (cached) {
      return {
        ...cached,
        blindUserId,
      };
    }

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

  public async saveDiary(userIdOrBlindId: string, date: string, meals: MealMap): Promise<DailyDiaryDoc> {
    const blindUserId = this.getBlindUserId(userIdOrBlindId);
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
        await withTimeout(docRef.set(diaryDoc, { merge: true }));
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

  public async getUserDiaryDates(userIdOrBlindId: string): Promise<string[]> {
    const canonicalId = canonicalizeUserId(userIdOrBlindId);
    const blindUserId = this.getBlindUserId(canonicalId);
    const dateSet = new Set<string>();

    const db = this.getFirestore();
    if (db) {
      try {
        const snapshot = await withTimeout(
          db.collection('diaries').where('blindUserId', '==', blindUserId).get()
        );
        for (const doc of snapshot.docs) {
          const data = doc.data() as DailyDiaryDoc;
          if (data.date && data.meals) {
            const hasMeals = Object.values(data.meals).some(
              items => Array.isArray(items) && items.length > 0
            );
            if (hasMeals) {
              dateSet.add(data.date);
            }
          }
        }
      } catch {
        // Fallback para memória em caso de falha transitória
      }
    }

    for (const val of this.inMemoryFallback.values()) {
      if (val.blindUserId === blindUserId && val.date && val.meals) {
        const hasMeals = Object.values(val.meals).some(
          items => Array.isArray(items) && items.length > 0
        );
        if (hasMeals) {
          dateSet.add(val.date);
        }
      }
    }

    return Array.from(dateSet).sort().reverse();
  }

  public async getDiariesHistory(
    userIdOrBlindId: string,
    days: number = 7,
    endDateStr?: string
  ): Promise<
    Array<{
      date: string;
      calories: number;
      proteinGrams: number;
      carbsGrams: number;
      fatGrams: number;
      fiberGrams: number;
    }>
  > {
    const canonicalId = canonicalizeUserId(userIdOrBlindId);
    const blindUserId = this.getBlindUserId(canonicalId);
    const resolvedEndDate = endDateStr || new Date().toISOString().slice(0, 10);
    const rollingDates = getRollingDays(resolvedEndDate, days);

    const historyList: Array<{
      date: string;
      calories: number;
      proteinGrams: number;
      carbsGrams: number;
      fatGrams: number;
      fiberGrams: number;
    }> = [];

    for (const date of rollingDates) {
      const diary = await this.getDiary(blindUserId, date);
      historyList.push({
        date,
        calories: diary.totals.calories,
        proteinGrams: diary.totals.protein,
        carbsGrams: diary.totals.carbs,
        fatGrams: diary.totals.fat,
        fiberGrams: diary.totals.fiber,
      });
    }

    return historyList;
  }

  public async purgeUserDiaries(userId: string): Promise<number> {
    const canonicalId = canonicalizeUserId(userId);
    const blindUserId = this.getBlindUserId(canonicalId);
    let deletedCount = 0;
    const db = this.getFirestore();

    if (db) {
      try {
        const [blindSnapshot, userSnapshot] = await Promise.all([
          withTimeout(db.collection('diaries').where('blindUserId', '==', blindUserId).get()),
          withTimeout(db.collection('diaries').where('userId', '==', canonicalId).get()),
        ]);

        const docsToDelete = new Map<string, FirebaseFirestore.DocumentReference>();
        for (const doc of blindSnapshot.docs) docsToDelete.set(doc.id, doc.ref);
        for (const doc of userSnapshot.docs) docsToDelete.set(doc.id, doc.ref);

        const batch = db.batch();
        for (const ref of docsToDelete.values()) {
          batch.delete(ref);
          deletedCount++;
        }
        if (deletedCount > 0) {
          await withTimeout(batch.commit());
        }
      } catch {
        // Ignora erro de rede e limpa fallback
      }
    }

    // Limpa do fallback in-memory
    for (const [key, val] of this.inMemoryFallback.entries()) {
      if (val.blindUserId === blindUserId || val.userId === canonicalId || val.user_id === canonicalId) {
        this.inMemoryFallback.delete(key);
        deletedCount++;
      }
    }

    return deletedCount;
  }

  public async migrateDiariesToUser(targetUserId: string): Promise<{ migratedCount: number; totalScanned: number }> {
    const canonicalTargetId = canonicalizeUserId(targetUserId);
    const targetBlindUserId = this.getBlindUserId(canonicalTargetId);
    let migratedCount = 0;
    let totalScanned = 0;
    const db = this.getFirestore();

    if (db) {
      try {
        const snapshot = await withTimeout(db.collection('diaries').get());
        totalScanned += snapshot.docs.length;

        for (const doc of snapshot.docs) {
          const data = doc.data() as DailyDiaryDoc;
          if (data.blindUserId !== targetBlindUserId || data.userId !== canonicalTargetId) {
            const targetDocId = this.getDocId(targetBlindUserId, data.date);
            const targetDocRef = db.collection('diaries').doc(targetDocId);

            const updatedDoc: DailyDiaryDoc = {
              ...data,
              userId: canonicalTargetId,
              user_id: canonicalTargetId,
              blindUserId: targetBlindUserId,
              updatedAt: new Date().toISOString(),
            };

            await withTimeout(targetDocRef.set(updatedDoc, { merge: true }));
            if (doc.id !== targetDocId) {
              await withTimeout(doc.ref.delete());
            }
            migratedCount++;
          }
        }
      } catch {
        // Ignora erro de conexão externa e migra in-memory
      }
    }

    // Migra também entradas no fallback em memória
    for (const [key, val] of Array.from(this.inMemoryFallback.entries())) {
      totalScanned++;
      if (val.blindUserId !== targetBlindUserId || val.userId !== canonicalTargetId) {
        const targetDocId = this.getDocId(targetBlindUserId, val.date);
        this.inMemoryFallback.set(targetDocId, {
          ...val,
          userId: canonicalTargetId,
          user_id: canonicalTargetId,
          blindUserId: targetBlindUserId,
          updatedAt: new Date().toISOString(),
        });
        if (key !== targetDocId) {
          this.inMemoryFallback.delete(key);
        }
        migratedCount++;
      }
    }

    return { migratedCount, totalScanned };
  }
}

export const firestoreDiaryService = new FirestoreDiaryService();
