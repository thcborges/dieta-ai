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
  age?: number;
  gender?: Gender;
  customFiberGrams?: number;
}

export interface MacroTargets {
  calories: number;
  proteinGrams: number;
  carbGrams: number;
  fatGrams: number;
  fiberGrams: number;
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
 * Calcula a recomendação diária de fibras (g/dia) segundo diretrizes DRI (Dietary Reference Intakes)
 * com base na idade e sexo do indivíduo.
 */
export function calculateRecommendedFiber(age: number, gender: Gender = 'male'): number {
  if (age <= 0) {
    throw new Error('Idade deve ser maior que zero');
  }

  // Crianças pequenas (1 a 3 anos): 19g
  if (age <= 3) {
    return 19;
  }

  // Crianças (4 a 8 anos): 25g
  if (age <= 8) {
    return 25;
  }

  // Adolescentes (9 a 13 anos): Homens 31g, Mulheres 26g
  if (age <= 13) {
    return gender === 'female' ? 26 : 31;
  }

  // Jovens (14 a 18 anos): Homens 38g, Mulheres 26g
  if (age <= 18) {
    return gender === 'female' ? 26 : 38;
  }

  // Adultos (19 a 50 anos): Homens 38g, Mulheres 25g
  if (age <= 50) {
    return gender === 'female' ? 25 : 38;
  }

  // Adultos mais velhos / Idosos (> 50 anos): Homens 30g, Mulheres 21g
  return gender === 'female' ? 21 : 30;
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

  // Fibras: meta recomendada por idade e sexo ou valor customizado
  let fiberGrams = 38;
  if (input.customFiberGrams !== undefined) {
    fiberGrams = input.customFiberGrams;
  } else if (input.age !== undefined) {
    fiberGrams = calculateRecommendedFiber(input.age, input.gender ?? 'male');
  }

  return {
    calories: targetCalories,
    proteinGrams,
    carbGrams,
    fatGrams,
    fiberGrams,
  };
}

/**
 * Calcula automaticamente a quantidade de calorias alvo a partir das quantidades
 * de proteína, carboidrato e gordura (4 kcal/g para proteína, 4 kcal/g para carboidrato e 9 kcal/g para gordura).
 */
export function calculateCaloriesFromMacros(macros: {
  proteinGrams: number;
  carbGrams: number;
  fatGrams: number;
}): number {
  const p = Math.max(0, macros.proteinGrams || 0);
  const c = Math.max(0, macros.carbGrams || 0);
  const f = Math.max(0, macros.fatGrams || 0);
  return Math.round(p * 4 + c * 4 + f * 9);
}

/**
 * Recalcula apenas a quantidade de carboidratos quando as calorias alvo forem alteradas,
 * mantendo as quantidades de proteína e gordura inalteradas.
 * Se as calorias forem inferiores à soma de proteína e gordura, o piso é 0g.
 */
export function calculateCarbsFromCalories(input: {
  calories: number;
  proteinGrams: number;
  fatGrams: number;
}): number {
  const targetCalories = Math.max(0, input.calories || 0);
  const p = Math.max(0, input.proteinGrams || 0);
  const f = Math.max(0, input.fatGrams || 0);
  const fixedCalories = p * 4 + f * 9;
  const remainingForCarbs = Math.max(0, targetCalories - fixedCalories);
  return Math.round(remainingForCarbs / 4);
}

