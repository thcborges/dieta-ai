import { Firestore } from '@google-cloud/firestore';
import {
  calculateBMR,
  calculateTDEE,
  calculateRecommendedFiber,
  calculateMacrosForGoal,
  generateBlindIndex,
  type Gender,
  type ActivityLevel,
  type DietGoal,
  type BmrSource,
} from '@dieta-ai/core';

export interface UserBiometricGoals {
  ageYears: number;
  gender: Gender;
  heightCm: number;
  weightKg: number;
  activityLevel: ActivityLevel;
  bmrSource: BmrSource;
  manualBmr?: number;
  goal: DietGoal;
  dailyDeficitKcal: number;
  bmr: number;
  tdee: number;
  calories: number;
  proteinGrams: number;
  carbGrams: number;
  fatGrams: number;
  fiberGrams: number;
  updatedAt: string;
}

export interface SaveGoalsInput {
  ageYears: number;
  gender: Gender;
  heightCm: number;
  weightKg: number;
  activityLevel: ActivityLevel;
  dailyDeficitKcal?: number;
  customProteinPerKg?: number;
  customFatPerKg?: number;
  customFiberGrams?: number;
  goal?: DietGoal;
  bmrSource?: BmrSource;
  manualBmr?: number;
}

async function withTimeout<T>(promise: Promise<T>, ms: number = 3000): Promise<T> {
  let timeoutId: NodeJS.Timeout;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(`Firestore operation timed out (${ms}ms)`)), ms);
  });
  return Promise.race([promise, timeoutPromise]).finally(() => {
    clearTimeout(timeoutId);
  });
}

export class UserGoalsService {
  private inMemoryGoals: Map<string, UserBiometricGoals> = new Map();
  private readonly pepper: string;
  private firestore: Firestore | null = null;

  constructor(options?: { firestore?: Firestore; pepper?: string }) {
    const configuredPepper =
      options?.pepper || process.env.BLIND_INDEX_PEPPER || process.env.LGPD_SECRET_PEPPER;
    if (!configuredPepper) {
      if (process.env.NODE_ENV === 'test') {
        this.pepper = 'test-blind-index-pepper-32chars!!';
      } else {
        throw new Error('Configuração de segurança ausente: BLIND_INDEX_PEPPER');
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
          this.firestore = new Firestore({ projectId });
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

  public getDefaultGoals(): UserBiometricGoals {
    const bmr = calculateBMR({
      gender: 'male',
      age: 40,
      heightCm: 190,
      weightKg: 95,
    });
    const tdee = calculateTDEE(bmr, 'moderate');
    const fiberGrams = calculateRecommendedFiber(40, 'male');
    const macros = calculateMacrosForGoal({
      bmr,
      activityLevel: 'moderate',
      goal: 'weight_loss',
      weightKg: 95,
      age: 40,
      gender: 'male',
      heightCm: 190,
      customDeltaKcal: -500,
      customProteinPerKg: 2.3,
    });

    return {
      ageYears: 40,
      gender: 'male',
      heightCm: 190,
      weightKg: 95,
      activityLevel: 'moderate',
      bmrSource: 'mifflin_st_jeor',
      goal: 'weight_loss',
      dailyDeficitKcal: 500,
      bmr,
      tdee,
      calories: macros.calories,
      proteinGrams: macros.proteinGrams,
      carbGrams: macros.carbGrams,
      fatGrams: macros.fatGrams,
      fiberGrams: fiberGrams,
      updatedAt: new Date().toISOString(),
    };
  }

  public async getGoals(userId: string): Promise<UserBiometricGoals> {
    const blindUserId = this.getBlindUserId(userId);
    const db = this.getFirestore();

    if (db) {
      try {
        const docRef = db.collection('user_goals').doc(blindUserId);
        const snapshot = await withTimeout(docRef.get());
        if (snapshot.exists) {
          const data = snapshot.data() as UserBiometricGoals;
          this.inMemoryGoals.set(blindUserId, data);
          return data;
        }
      } catch {
        // Fallback para memória em caso de falha de conexão
      }
    }

    const existing = this.inMemoryGoals.get(blindUserId);
    if (existing) {
      return existing;
    }
    return this.getDefaultGoals();
  }

  public async saveGoals(userId: string, input: SaveGoalsInput): Promise<UserBiometricGoals> {
    const blindUserId = this.getBlindUserId(userId);
    const goal = input.goal || 'weight_loss';
    const deficit = Math.max(0, input.dailyDeficitKcal ?? 500);

    let bmr = 0;
    if (input.bmrSource === 'manual_bioimpedance' && input.manualBmr && input.manualBmr > 0) {
      bmr = Math.round(input.manualBmr);
    } else {
      bmr = Math.round(
        calculateBMR({
          gender: input.gender,
          age: input.ageYears,
          heightCm: input.heightCm,
          weightKg: input.weightKg,
        })
      );
    }

    const tdee = Math.round(calculateTDEE(bmr, input.activityLevel));

    const calculated = calculateMacrosForGoal({
      bmr,
      activityLevel: input.activityLevel,
      goal,
      weightKg: input.weightKg,
      age: input.ageYears,
      gender: input.gender,
      heightCm: input.heightCm,
      customDeltaKcal: goal === 'weight_loss' ? -deficit : 0,
      customProteinPerKg: input.customProteinPerKg,
      customFatPerKg: input.customFatPerKg,
      customFiberGrams: input.customFiberGrams,
    });

    const goalsDoc: UserBiometricGoals = {
      ageYears: input.ageYears,
      gender: input.gender,
      heightCm: input.heightCm,
      weightKg: input.weightKg,
      activityLevel: input.activityLevel,
      bmrSource: input.bmrSource || 'mifflin_st_jeor',
      manualBmr: input.manualBmr,
      goal,
      dailyDeficitKcal: deficit,
      bmr,
      tdee,
      calories: calculated.calories,
      proteinGrams: calculated.proteinGrams,
      carbGrams: calculated.carbGrams,
      fatGrams: calculated.fatGrams,
      fiberGrams: calculated.fiberGrams,
      updatedAt: new Date().toISOString(),
    };

    const db = this.getFirestore();
    if (db) {
      try {
        const docRef = db.collection('user_goals').doc(blindUserId);
        await withTimeout(docRef.set(goalsDoc, { merge: true }));
      } catch {
        // Fallback em memória
      }
    }

    this.inMemoryGoals.set(blindUserId, goalsDoc);
    return goalsDoc;
  }

  public async purgeUserGoals(userId: string): Promise<boolean> {
    const blindUserId = this.getBlindUserId(userId);
    this.inMemoryGoals.delete(blindUserId);
    const db = this.getFirestore();
    if (db) {
      try {
        await withTimeout(db.collection('user_goals').doc(blindUserId).delete());
        return true;
      } catch {
        return false;
      }
    }
    return true;
  }
}

export const userGoalsService = new UserGoalsService();
