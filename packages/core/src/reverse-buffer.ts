export interface MacroBudget {
  calories: number;
  proteinGrams: number;
  carbGrams: number;
  fatGrams: number;
}

export interface EventBufferInput {
  name: string;
  calories: number;
  proteinGrams: number;
  carbGrams: number;
  fatGrams: number;
}

export type FeasibilityStatus = 'BALANCED' | 'COMPRESSED' | 'EXTREME' | 'IMPOSSIBLE';

export interface BufferCalculationResult {
  remainingBudget: MacroBudget;
  requiredProteinDensity: number; // g proteína por 100 kcal
  isThermodynamicallyPossible: boolean;
  feasibilityStatus: FeasibilityStatus;
  advisoryMessage: string;
}

export const EVENT_PRESETS: Record<string, EventBufferInput> = {
  PIZZA_NIGHT: {
    name: 'Noite da Pizza (3-4 Fatias)',
    calories: 1100,
    proteinGrams: 38,
    carbGrams: 120,
    fatGrams: 52,
  },
  KIDS_PARTY: {
    name: 'Festa Infantil (Salgadinhos/Doces)',
    calories: 950,
    proteinGrams: 18,
    carbGrams: 130,
    fatGrams: 42,
  },
  FAMILY_BARBECUE: {
    name: 'Churrasco em Família',
    calories: 1350,
    proteinGrams: 75,
    carbGrams: 60,
    fatGrams: 95,
  },
};

/**
 * Motor de Engenharia Reversa para abater eventos sociais do orçamento diário.
 */
export function calculateEventBuffer(
  dailyTarget: MacroBudget,
  event: EventBufferInput
): BufferCalculationResult {
  const remainingCalories = dailyTarget.calories - event.calories;
  const remainingProtein = dailyTarget.proteinGrams - event.proteinGrams;
  const remainingCarbs = dailyTarget.carbGrams - event.carbGrams;
  const remainingFat = dailyTarget.fatGrams - event.fatGrams;

  const remainingBudget: MacroBudget = {
    calories: remainingCalories,
    proteinGrams: remainingProtein,
    carbGrams: remainingCarbs,
    fatGrams: remainingFat,
  };

  // Verificação termodinâmica: 1g proteína = 4 kcal
  const minCaloriesNeededForProtein = Math.max(0, remainingProtein) * 4;
  const isThermodynamicallyPossible = remainingCalories >= minCaloriesNeededForProtein;

  let requiredProteinDensity = 0;
  if (remainingCalories > 0 && remainingProtein > 0) {
    requiredProteinDensity = (remainingProtein / remainingCalories) * 100;
  }

  let feasibilityStatus: FeasibilityStatus = 'BALANCED';
  let advisoryMessage = 'Orçamento restante equilibrado. Prossiga com refeições balanceadas habituais.';

  if (!isThermodynamicallyPossible || remainingCalories <= 0) {
    feasibilityStatus = 'IMPOSSIBLE';
    advisoryMessage = `Inviabilidade termodinâmica detectada: restam ${remainingProtein}g de proteína necessárias (${minCaloriesNeededForProtein} kcal mínimas puras), porém há apenas ${remainingCalories} kcal disponíveis no orçamento restante do dia.`;
  } else if (requiredProteinDensity > 18) {
    feasibilityStatus = 'EXTREME';
    advisoryMessage = `Compressão extrema (${requiredProteinDensity.toFixed(1)}g P / 100 kcal). Exige fontes proteicas isoladas estritas (Whey Isolate, claras de ovo, sassami sem gordura) para evitar estourar as calorias.`;
  } else if (requiredProteinDensity > 14) {
    feasibilityStatus = 'COMPRESSED';
    advisoryMessage = `Orçamento comprimido (${requiredProteinDensity.toFixed(1)}g P / 100 kcal). Priorize carnes magras e reduza carboidratos das demais refeições.`;
  }

  return {
    remainingBudget,
    requiredProteinDensity,
    isThermodynamicallyPossible,
    feasibilityStatus,
    advisoryMessage,
  };
}
