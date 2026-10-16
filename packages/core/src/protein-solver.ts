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
