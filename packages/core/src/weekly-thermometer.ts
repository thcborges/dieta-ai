import type { DietGoal } from './biometrics.js';

export type WeeklyThermometerStatus =
  | 'optimal'
  | 'warning'
  | 'blown'
  | 'critical_deficit'
  | 'surplus_drift';

export interface RollingDayLog {
  date: string;
  calories: number;
  proteinGrams?: number;
  isFasting?: boolean;
  isImputed?: boolean;
}

export interface ImputeMissingWeeklyDaysResult {
  days: RollingDayLog[];
  imputedCount: number;
  recordedCount: number;
  averageCalories: number;
  averageProtein: number;
  hasSufficientData: boolean;
}

/**
 * Preenche dias não registrados na janela móvel de 7 dias com a média aritmética dos dias registrados.
 * - Dias de jejum explícito (isFasting === true) são contabilizados como 0 kcal reais na média.
 * - Dias não registrados (calories === 0 e sem isFasting) recebem a média calculada e isImputed: true.
 * - Se nenhum dia for registrado (0 dias preenchidos), retorna hasSufficientData: false e média 0.
 */
export function imputeMissingWeeklyDays(days: RollingDayLog[]): ImputeMissingWeeklyDaysResult {
  if (!days || days.length === 0) {
    return {
      days: [],
      imputedCount: 0,
      recordedCount: 0,
      averageCalories: 0,
      averageProtein: 0,
      hasSufficientData: false,
    };
  }

  const recordedDays = days.filter(d => Boolean(d.isFasting) || d.calories > 0);
  const recordedCount = recordedDays.length;

  if (recordedCount === 0) {
    return {
      days: days.map(d => ({ ...d })),
      imputedCount: 0,
      recordedCount: 0,
      averageCalories: 0,
      averageProtein: 0,
      hasSufficientData: false,
    };
  }

  const totalCalories = recordedDays.reduce((acc, d) => acc + d.calories, 0);
  const avgCalories = Math.round(totalCalories / recordedCount);

  const totalProtein = recordedDays.reduce((acc, d) => acc + (d.proteinGrams || 0), 0);
  const avgProtein = Math.round((totalProtein / recordedCount) * 10) / 10;

  let imputedCount = 0;
  const filledDays = days.map(d => {
    const isRecorded = Boolean(d.isFasting) || d.calories > 0;
    if (!isRecorded) {
      imputedCount++;
      return {
        ...d,
        calories: avgCalories,
        proteinGrams: avgProtein,
        isImputed: true,
      };
    }
    return { ...d };
  });

  return {
    days: filledDays,
    imputedCount,
    recordedCount,
    averageCalories: avgCalories,
    averageProtein: avgProtein,
    hasSufficientData: true,
  };
}

export interface WeeklyThermometerInput {
  goal: DietGoal;
  dailyTargetCalories: number;
  tdee: number;
  weightKg: number;
  dailyDeficitKcal?: number;
  dailySurplusKcal?: number;
  tolerancePercent?: number; // default: 3 (%)
  days: RollingDayLog[]; // Up to 7 days
  imputeMissingDays?: boolean; // Se true, preenche dias não registrados com a média dos dias registrados
}

export interface WeeklyThermometerAlert {
  code:
    | 'BLOWN_BUDGET'
    | 'WARNING_BUDGET'
    | 'CRITICAL_WEIGHT_LOSS'
    | 'WARNING_LOW_CALORIES'
    | 'MAINTENANCE_DRIFT_HIGH'
    | 'MAINTENANCE_DRIFT_LOW';
  severity: 'INFO' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  message: string;
}

export interface WeeklyThermometerReport {
  goal: DietGoal;
  daysCount: number;
  totalTargetCalories: number;
  totalActualCalories: number;
  weeklySlipKcal: number;
  thermalRatioPercent: number;
  adherenceScorePercent: number;
  status: WeeklyThermometerStatus;
  projectedWeightDeltaKg: number;
  neutralizedDeficitDays?: number;
  alerts: WeeklyThermometerAlert[];
  imputedDaysCount?: number;
  hasSufficientData?: boolean;
}

/**
 * Avalia o comportamento do Banco Semanal como um Termômetro Analítico
 * baseado em janela móvel (últimos 7 dias).
 *
 * Implacável, lógico e sem mensagens motivacionais/emocionais.
 */
export function evaluateWeeklyThermometer(
  input: WeeklyThermometerInput
): WeeklyThermometerReport {
  if (!input.days || input.days.length === 0) {
    throw new Error('A janela móvel deve conter pelo menos 1 dia registrado');
  }

  // Janela móvel: restringe estritamente aos 7 dias mais recentes
  let windowDays = input.days.slice(-7);
  let imputedDaysCount = 0;
  let hasSufficientData = true;

  if (input.imputeMissingDays) {
    const imputationResult = imputeMissingWeeklyDays(windowDays);
    windowDays = imputationResult.days;
    imputedDaysCount = imputationResult.imputedCount;
    hasSufficientData = imputationResult.hasSufficientData;

    if (!hasSufficientData) {
      return {
        goal: input.goal,
        daysCount: windowDays.length,
        totalTargetCalories: windowDays.length * input.dailyTargetCalories,
        totalActualCalories: 0,
        weeklySlipKcal: 0,
        thermalRatioPercent: 0,
        adherenceScorePercent: 0,
        status: 'optimal',
        projectedWeightDeltaKg: 0,
        alerts: [],
        imputedDaysCount: 0,
        hasSufficientData: false,
      };
    }
  }

  const daysCount = windowDays.length;

  const totalTargetCalories = daysCount * input.dailyTargetCalories;
  const totalActualCalories = windowDays.reduce(
    (acc: number, d: RollingDayLog) => acc + d.calories,
    0
  );
  const weeklySlipKcal = totalActualCalories - totalTargetCalories;

  const thermalRatioPercent =
    Math.round((totalActualCalories / Math.max(1, totalTargetCalories)) * 1000) / 10;

  // Impacto biológico no peso corporal baseado na diferença contra o TDEE
  const totalTdee = daysCount * input.tdee;
  const netEnergyBalanceVsTdee = totalActualCalories - totalTdee;
  const projectedWeightDeltaKg =
    Math.round((netEnergyBalanceVsTdee / 7700) * 100) / 100;

  // Cálculo da pontuação de adesão (0 a 100%)
  const sumDeviations = windowDays.reduce((acc: number, d: RollingDayLog) => {
    return (
      acc +
      Math.abs(d.calories - input.dailyTargetCalories) /
        Math.max(1, input.dailyTargetCalories)
    );
  }, 0);
  const avgDeviation = sumDeviations / daysCount;
  const adherenceScorePercent = Math.max(
    0,
    Math.min(100, Math.round((1 - avgDeviation) * 100))
  );

  let status: WeeklyThermometerStatus = 'optimal';
  const alerts: WeeklyThermometerAlert[] = [];
  let neutralizedDeficitDays: number | undefined;

  switch (input.goal) {
    case 'weight_loss': {
      const dailyDeficit = input.dailyDeficitKcal ?? 500;
      if (thermalRatioPercent <= 100) {
        status = 'optimal';
      } else if (thermalRatioPercent <= 105) {
        status = 'warning';
        alerts.push({
          code: 'WARNING_BUDGET',
          severity: 'MEDIUM',
          message: `Atenção: Consumo acumulado (${totalActualCalories} kcal) está ${thermalRatioPercent}% da meta planejada. Deslize leve na janela móvel de ${weeklySlipKcal} kcal.`,
        });
      } else {
        status = 'blown';
        neutralizedDeficitDays =
          Math.round((weeklySlipKcal / Math.max(1, dailyDeficit)) * 10) / 10;

        alerts.push({
          code: 'BLOWN_BUDGET',
          severity: 'CRITICAL',
          message: `Estouro de Teto Calórico Semanal: Consumo acumulado de ${totalActualCalories} kcal superou a cota planejada (${totalTargetCalories} kcal) em +${weeklySlipKcal} kcal. Esse excedente neutralizou ${neutralizedDeficitDays} dias inteiros de déficit calórico na janela móvel.`,
        });
      }
      break;
    }

    case 'weight_gain':
    case 'muscle_gain': {
      if (totalActualCalories < totalTdee) {
        status = 'critical_deficit';
        alerts.push({
          code: 'CRITICAL_WEIGHT_LOSS',
          severity: 'CRITICAL',
          message: `Alerta Crítico: Subconsumo & Risco de Perda Ponderal: Consumo calórico nos últimos ${daysCount} dias (${totalActualCalories} kcal) está abaixo do gasto de manutenção (${totalTdee} kcal). Déficit acumulado de ${netEnergyBalanceVsTdee} kcal projeta perda involuntária de peso corporal de ${projectedWeightDeltaKg} kg, com risco imediato de catabolismo proteico.`,
        });
      } else if (thermalRatioPercent < 98) {
        status = 'warning';
        alerts.push({
          code: 'WARNING_LOW_CALORIES',
          severity: 'MEDIUM',
          message: `Alerta: Consumo calórico semanal (${totalActualCalories} kcal) está abaixo da meta planejada de superávit (${totalTargetCalories} kcal). Ritmo anabólico sub-ótimo.`,
        });
      } else {
        status = 'optimal';
      }
      break;
    }

    case 'maintenance': {
      const tol = input.tolerancePercent ?? 3;
      const lowerBound = 100 - tol;
      const upperBound = 100 + tol;

      if (thermalRatioPercent >= lowerBound && thermalRatioPercent <= upperBound) {
        status = 'optimal';
      } else if (thermalRatioPercent > upperBound) {
        status = 'surplus_drift';
        alerts.push({
          code: 'MAINTENANCE_DRIFT_HIGH',
          severity: 'HIGH',
          message: `Desvio de Manutenção para Cima: Consumo acumulado nos últimos ${daysCount} dias (${totalActualCalories} kcal) ultrapassou a margem de tolerância (+${tol}%) em relação à manutenção (${totalTargetCalories} kcal). Risco de ganho de peso não planejado.`,
        });
      } else {
        status = 'critical_deficit';
        alerts.push({
          code: 'MAINTENANCE_DRIFT_LOW',
          severity: 'HIGH',
          message: `Desvio de Manutenção para Baixo: Consumo acumulado nos últimos ${daysCount} dias (${totalActualCalories} kcal) caiu abaixo da margem de tolerância (-${tol}%) em relação à manutenção (${totalTargetCalories} kcal). Risco de perda de peso não planejada.`,
        });
      }
      break;
    }
  }

  return {
    goal: input.goal,
    daysCount,
    totalTargetCalories,
    totalActualCalories,
    weeklySlipKcal,
    thermalRatioPercent,
    adherenceScorePercent,
    status,
    projectedWeightDeltaKg,
    neutralizedDeficitDays,
    alerts,
    imputedDaysCount,
    hasSufficientData,
  };
}
