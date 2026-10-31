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

export class UserGoalsService {
  private inMemoryGoals: Map<string, UserBiometricGoals> = new Map();
  private readonly pepper: string;

  constructor(options?: { pepper?: string }) {
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

  public getGoals(userId: string): UserBiometricGoals {
    const blindUserId = this.getBlindUserId(userId);
    const existing = this.inMemoryGoals.get(blindUserId);
    if (existing) {
      return existing;
    }
    return this.getDefaultGoals();
  }

  public saveGoals(userId: string, input: SaveGoalsInput): UserBiometricGoals {
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

    this.inMemoryGoals.set(blindUserId, goalsDoc);
    return goalsDoc;
  }
}

export const userGoalsService = new UserGoalsService();
