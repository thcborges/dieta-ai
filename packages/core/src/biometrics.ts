export type Gender = 'male' | 'female';
export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'heavy' | 'athlete';
export type DietGoal = 'weight_loss' | 'maintenance' | 'muscle_gain' | 'weight_gain';
export type BmrSource = 'mifflin_st_jeor' | 'manual_bioimpedance';

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

export interface ResolveBmrInput {
  source: BmrSource;
  manualBmr?: number;
  profile?: BiometricProfile;
}

export interface GoalBasedMacroCalculationInput {
  bmr: number;
  activityLevel: ActivityLevel;
  goal: DietGoal;
  weightKg: number;
  age?: number;
  gender?: Gender;
  heightCm?: number;
  customDeltaKcal?: number;
  customProteinPerKg?: number;
  customFatPerKg?: number;
  customFiberGrams?: number;
  maxProteinCapGrams?: number;
}

export interface GoalBasedMacroTargets extends MacroTargets {
  bmr: number;
  tdee: number;
  goal: DietGoal;
  calorieDelta: number;
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
 * Resolve a Taxa Metabólica Basal (TMB):
 * - Vinda diretamente de exame de bioimpedância (`manual_bioimpedance`)
 * - Recalculada através da equação Mifflin-St Jeor (`mifflin_st_jeor`)
 */
export function resolveBMR(input: ResolveBmrInput): number {
  if (input.source === 'manual_bioimpedance') {
    if (input.manualBmr === undefined || input.manualBmr <= 0) {
      throw new Error('Taxa metabólica basal informada deve ser maior que zero');
    }
    return input.manualBmr;
  }

  if (input.source === 'mifflin_st_jeor') {
    if (!input.profile) {
      throw new Error('Perfil biométrico é obrigatório para cálculo via Mifflin-St Jeor');
    }
    return calculateBMR(input.profile);
  }

  throw new Error(`Fonte de TMB desconhecida: ${input.source}`);
}

/**
 * Calcula a meta de calorias alvo por dia e proporções recomendadas para proteína,
 * carboidrato, gordura e fibras de acordo com o nível de atividade e objetivo
 * ('weight_loss', 'maintenance', 'muscle_gain').
 */
export function calculateMacrosForGoal(input: GoalBasedMacroCalculationInput): GoalBasedMacroTargets {
  if (input.bmr <= 0) {
    throw new Error('Taxa metabólica basal deve ser maior que zero');
  }
  if (input.weightKg <= 0) {
    throw new Error('Peso deve ser maior que zero');
  }

  const tdee = calculateTDEE(input.bmr, input.activityLevel);

  // Déficit ou Superávit por padrão segundo objetivo
  const defaultDeltas: Record<DietGoal, number> = {
    weight_loss: -500,
    maintenance: 0,
    muscle_gain: 350,
    weight_gain: 350,
  };

  const calorieDelta = input.customDeltaKcal ?? defaultDeltas[input.goal] ?? 0;
  const targetCalories = Math.max(1200, tdee + calorieDelta);

  // Proporção recomendada de proteína por kg por objetivo
  const defaultProteinPerKg: Record<DietGoal, number> = {
    weight_loss: 2.2, // Proteção de massa magra em restrição
    maintenance: 2.0, // Alta densidade e homeostase
    muscle_gain: 2.0, // Síntese proteica hipertrófica ideal
    weight_gain: 2.0,
  };

  const proteinPerKg = input.customProteinPerKg ?? defaultProteinPerKg[input.goal] ?? 2.0;
  let proteinGrams = Math.round(input.weightKg * proteinPerKg);
  const maxCap = input.maxProteinCapGrams ?? 240;
  if (maxCap && proteinGrams > maxCap) {
    proteinGrams = maxCap;
  }

  // Proporção recomendada de gordura por kg por objetivo
  const defaultFatPerKg: Record<DietGoal, number> = {
    weight_loss: 0.8,
    maintenance: 0.9,
    muscle_gain: 0.9,
    weight_gain: 0.9,
  };

  const fatPerKg = input.customFatPerKg ?? defaultFatPerKg[input.goal] ?? 0.8;
  const fatGrams = Math.round(input.weightKg * fatPerKg);

  // Carboidratos completam o saldo calórico restante
  const caloriesFromProtein = proteinGrams * 4;
  const caloriesFromFat = fatGrams * 9;
  const remainingCalories = Math.max(0, targetCalories - (caloriesFromProtein + caloriesFromFat));
  const carbGrams = Math.round(remainingCalories / 4);

  // Meta de fibras: Diretriz DRI oficial por idade/gênero ou customizada
  let fiberGrams = 38;
  if (input.customFiberGrams !== undefined) {
    fiberGrams = input.customFiberGrams;
  } else if (input.age !== undefined) {
    fiberGrams = calculateRecommendedFiber(input.age, input.gender ?? 'male');
  }

  return {
    bmr: input.bmr,
    tdee,
    goal: input.goal,
    calorieDelta,
    calories: targetCalories,
    proteinGrams,
    carbGrams,
    fatGrams,
    fiberGrams,
  };
}
