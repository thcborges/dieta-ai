export interface ProteinSource {
  id: string;
  name: string;
  proteinPer100g: number;
  carbsPer100g: number;
  fatPer100g: number;
  caloriesPer100g: number;
  servingSizeGrams?: number;
  servingUnitName?: string;
}

export const PROTEIN_SOURCES: Record<string, ProteinSource> = {
  sassami: {
    id: 'sassami',
    name: 'Filé de Sassami Desfiado',
    proteinPer100g: 31.0,
    carbsPer100g: 0.0,
    fatPer100g: 3.6,
    caloriesPer100g: 165.0,
  },
  whey_growth: {
    id: 'whey_growth',
    name: 'Whey Protein Concentrado (Growth)',
    proteinPer100g: 80.0,
    carbsPer100g: 10.0,
    fatPer100g: 6.0,
    caloriesPer100g: 413.3,
    servingSizeGrams: 30.0,
    servingUnitName: 'scoop',
  },
  egg_whites: {
    id: 'egg_whites',
    name: 'Claras de Ovo Pasteurizadas',
    proteinPer100g: 11.0,
    carbsPer100g: 0.7,
    fatPer100g: 0.2,
    caloriesPer100g: 52.0,
  },
};

export interface SolveProteinInput {
  missingProteinGrams: number;
  remainingCalories: number;
  preferredSource: 'sassami' | 'whey_growth' | 'egg_whites';
}

export interface ProteinSolution {
  sourceName: string;
  gramsNeeded: number;
  scoopsNeeded?: number;
  proteinProvided: number;
  caloriesAdded: number;
  carbsAdded: number;
  fatAdded: number;
  fitsInRemainingCalories: boolean;
  calorieOverhead: number;
  warning?: string;
}

/**
 * Resolve o déficit de proteína sugerindo a porção exata da fonte selecionada.
 */
export function solveProteinDeficit(input: SolveProteinInput): ProteinSolution {
  const source = PROTEIN_SOURCES[input.preferredSource] ?? PROTEIN_SOURCES.sassami;
  if (!source) {
    throw new Error(`Fonte de proteína desconhecida: ${input.preferredSource}`);
  }

  const factor = input.missingProteinGrams / (source.proteinPer100g / 100);
  const gramsNeeded = Math.round(factor * 10) / 10;
  const multiplier = gramsNeeded / 100;

  const proteinProvided = Math.round(source.proteinPer100g * multiplier * 10) / 10;
  const carbsAdded = Math.round(source.carbsPer100g * multiplier * 10) / 10;
  const fatAdded = Math.round(source.fatPer100g * multiplier * 10) / 10;
  const caloriesAdded = Math.round(source.caloriesPer100g * multiplier);

  const fitsInRemainingCalories = caloriesAdded <= input.remainingCalories;
  const calorieOverhead = fitsInRemainingCalories ? 0 : caloriesAdded - input.remainingCalories;

  let scoopsNeeded: number | undefined;
  if (source.servingSizeGrams) {
    scoopsNeeded = Math.round((gramsNeeded / source.servingSizeGrams) * 10) / 10;
  }

  let warning: string | undefined;
  if (!fitsInRemainingCalories) {
    warning = `Atenção: Adicionar ${gramsNeeded}g de ${source.name} ultrapassará o orçamento calórico restante em ${calorieOverhead} kcal. Considere fracionar ou usar fonte mais isolada.`;
  }

  return {
    sourceName: source.name,
    gramsNeeded,
    scoopsNeeded,
    proteinProvided,
    caloriesAdded,
    carbsAdded,
    fatAdded,
    fitsInRemainingCalories,
    calorieOverhead,
    warning,
  };
}

export interface ProteinItemSelection {
  sourceId: string;
  grams: number;
}

export interface MultiProteinItemResult {
  source: ProteinSource;
  grams: number;
  protein: number;
  calories: number;
  carbs: number;
  fat: number;
}

export interface MultiProteinCalculationInput {
  missingProteinGrams: number;
  remainingCalories: number;
  selections: ProteinItemSelection[];
  customSources?: Record<string, ProteinSource>;
}

export interface MultiProteinCalculationResult {
  initialMissingProteinGrams: number;
  totalProteinSelected: number;
  remainingProteinDeficit: number;
  status: 'missing' | 'reached' | 'surplus';
  totalCaloriesSelected: number;
  totalCarbsSelected: number;
  totalFatSelected: number;
  fitsInRemainingCalories: boolean;
  calorieOverhead: number;
  items: MultiProteinItemResult[];
  warning?: string;
}

/**
 * Sugere a gramatura exata para completar o déficit de proteína com a fonte informada.
 */
export function suggestGramsForSource(source: ProteinSource, remainingProteinNeeded: number): number {
  if (remainingProteinNeeded <= 0) return 0;
  if (!source.proteinPer100g || source.proteinPer100g <= 0) return 0;
  const factor = remainingProteinNeeded / (source.proteinPer100g / 100);
  return Math.round(factor * 10) / 10;
}

/**
 * Calcula em tempo real o impacto e quanto falta para atingir a meta
 * a partir de uma lista de fontes e suas respectivas gramaturas informadas pelo usuário.
 */
export function calculateMultiProteinSelection(
  input: MultiProteinCalculationInput
): MultiProteinCalculationResult {
  const allSources: Record<string, ProteinSource> = {
    ...PROTEIN_SOURCES,
    ...(input.customSources ?? {}),
  };

  let totalProtein = 0;
  let totalCalories = 0;
  let totalCarbs = 0;
  let totalFat = 0;

  const items: MultiProteinItemResult[] = [];

  for (const sel of input.selections) {
    if (sel.grams <= 0) continue;
    const source = allSources[sel.sourceId];
    if (!source) continue;

    const multiplier = sel.grams / 100;
    const protein = Math.round(source.proteinPer100g * multiplier * 10) / 10;
    const carbs = Math.round(source.carbsPer100g * multiplier * 10) / 10;
    const fat = Math.round(source.fatPer100g * multiplier * 10) / 10;
    const calories = Math.round(source.caloriesPer100g * multiplier);

    totalProtein += protein;
    totalCarbs += carbs;
    totalFat += fat;
    totalCalories += calories;

    items.push({
      source,
      grams: sel.grams,
      protein,
      calories,
      carbs,
      fat,
    });
  }

  totalProtein = Math.round(totalProtein * 10) / 10;
  totalCarbs = Math.round(totalCarbs * 10) / 10;
  totalFat = Math.round(totalFat * 10) / 10;

  const remainingProteinDeficit = Math.round((input.missingProteinGrams - totalProtein) * 10) / 10;
  let status: 'missing' | 'reached' | 'surplus' = 'missing';
  if (remainingProteinDeficit === 0) {
    status = 'reached';
  } else if (remainingProteinDeficit < 0) {
    status = 'surplus';
  }

  const fitsInRemainingCalories = totalCalories <= input.remainingCalories;
  const calorieOverhead = fitsInRemainingCalories ? 0 : totalCalories - input.remainingCalories;

  let warning: string | undefined;
  if (!fitsInRemainingCalories) {
    warning = `Atenção: A seleção adicionará ${totalCalories} kcal e ultrapassará o orçamento calórico restante em ${calorieOverhead} kcal.`;
  }

  return {
    initialMissingProteinGrams: input.missingProteinGrams,
    totalProteinSelected: totalProtein,
    remainingProteinDeficit,
    status,
    totalCaloriesSelected: totalCalories,
    totalCarbsSelected: totalCarbs,
    totalFatSelected: totalFat,
    fitsInRemainingCalories,
    calorieOverhead,
    items,
    warning,
  };
}

