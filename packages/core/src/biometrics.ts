export type Gender = 'male' | 'female';
export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'heavy' | 'athlete';

export interface BiometricProfile {
  gender: Gender;
  age: number;
  heightCm: number;
  weightKg: number;
}

export type ProteinStrategy =
  | { type: 'fixed'; grams: number }
  | { type: 'per_kg'; gramsPerKg: number; maxCapGrams?: number };

export interface TargetCalculationInput {
  tdee: number;
  weightKg: number;
  deficitKcal?: number;
  proteinStrategy: ProteinStrategy;
  fatPerKg?: number;
}

export interface MacroTargets {
  calories: number;
  proteinGrams: number;
  carbGrams: number;
  fatGrams: number;
}

const ACTIVITY_MULTIPLIERS: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  heavy: 1.725,
  athlete: 1.9,
};

/**
 * Calcula a Taxa Metabólica Basal (TMB) usando a equação Mifflin-St Jeor.
 * Homens: 10 * peso(kg) + 6.25 * altura(cm) - 5 * idade(anos) + 5
 * Mulheres: 10 * peso(kg) + 6.25 * altura(cm) - 5 * idade(anos) - 161
 */
export function calculateBMR(profile: BiometricProfile): number {
  if (profile.age <= 0) {
    throw new Error('Idade deve ser maior que zero');
  }
  if (profile.heightCm <= 0) {
    throw new Error('Altura deve ser maior que zero');
  }
  if (profile.weightKg <= 0) {
    throw new Error('Peso deve ser maior que zero');
  }

  const base = 10 * profile.weightKg + 6.25 * profile.heightCm - 5 * profile.age;
  return profile.gender === 'male' ? base + 5 : base - 161;
}

/**
 * Calcula o Gasto Energético Total (GET / TDEE).
 */
export function calculateTDEE(bmr: number, activityLevel: ActivityLevel): number {
  const multiplier = ACTIVITY_MULTIPLIERS[activityLevel] ?? 1.2;
  return Math.round(bmr * multiplier);
}

/**
 * Calcula as metas diárias de calorias e macronutrientes.
 */
export function calculateMacroTargets(input: TargetCalculationInput): MacroTargets {
  const deficit = input.deficitKcal ?? 0;
  const targetCalories = Math.max(1200, input.tdee - deficit);

  // Proteína
  let proteinGrams = 0;
  if (input.proteinStrategy.type === 'fixed') {
    proteinGrams = input.proteinStrategy.grams;
  } else {
    proteinGrams = Math.round(input.weightKg * input.proteinStrategy.gramsPerKg);
    if (input.proteinStrategy.maxCapGrams && proteinGrams > input.proteinStrategy.maxCapGrams) {
      proteinGrams = input.proteinStrategy.maxCapGrams;
    }
  }

  // Gordura (padrão 0.8g/kg caso não especificado)
  const fatPerKg = input.fatPerKg ?? 0.8;
  const fatGrams = Math.round(input.weightKg * fatPerKg);

  // Carboidratos completam as calorias restantes (4 kcal/g)
  const caloriesFromProtein = proteinGrams * 4;
  const caloriesFromFat = fatGrams * 9;
  const remainingCaloriesForCarbs = Math.max(0, targetCalories - (caloriesFromProtein + caloriesFromFat));
  const carbGrams = Math.round(remainingCaloriesForCarbs / 4);

  return {
    calories: targetCalories,
    proteinGrams,
    carbGrams,
    fatGrams,
  };
}
