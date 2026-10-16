export type AlertSeverity = 'INFO' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type AlertType = 'MATHEMATICAL_IMPOSSIBILITY' | 'PROTEIN_DILUTION' | 'DEFICIT_BREACH';

export interface AuditAlert {
  type: AlertType;
  severity: AlertSeverity;
  message: string;
  currentGramsPerKg?: number;
  neutralizedDays?: number;
}

export interface DailyAuditInput {
  weightKg: number;
  plannedDailyDeficitKcal: number;
  targetCalories: number;
  targetProteinGrams: number;
  currentCalories: number;
  currentProteinGrams: number;
}

export interface DailyAuditReport {
  hasMathematicalImpossibility: boolean;
  hasProteinDilution: boolean;
  deficitBreached: boolean;
  neutralizedDeficitDays: number;
  currentGramsPerKg: number;
  alerts: AuditAlert[];
}

/**
 * Auditor Lógico Implacável (Conselheiro Sênior)
 * Regras estritas sem mensagens motivacionais/emocionais. Foco em causa e efeito matemático.
 */
export function auditDailyIntake(input: DailyAuditInput): DailyAuditReport {
  const alerts: AuditAlert[] = [];
  const remainingCalories = input.targetCalories - input.currentCalories;
  const remainingProtein = input.targetProteinGrams - input.currentProteinGrams;

  // 1. Alerta de Inviabilidade Matemática:
  // Se faltar proteína e as calorias restantes forem inferiores a 4 kcal por grama de proteína necessária.
  let hasMathematicalImpossibility = false;
  if (remainingProtein > 0) {
    const minPureCaloriesForProtein = remainingProtein * 4;
    if (remainingCalories < minPureCaloriesForProtein) {
      hasMathematicalImpossibility = true;
      alerts.push({
        type: 'MATHEMATICAL_IMPOSSIBILITY',
        severity: 'CRITICAL',
        message: `Inviabilidade Matemática: Faltam ${remainingProtein}g de proteína (${minPureCaloriesForProtein} kcal mínimas puras), porém restam apenas ${remainingCalories} kcal no orçamento. Bater a meta proteica dentro do teto calórico é fisicamente impossível hoje.`,
      });
    }
  }

  // 2. Alerta de Diluição Proteica:
  // Quando a ingestão proteica por kg de peso corporal cair abaixo do piso de 1.8g/kg
  const currentGramsPerKg = Math.round((input.currentProteinGrams / input.weightKg) * 100) / 100;
  let hasProteinDilution = false;
  if (currentGramsPerKg < 1.8 && input.currentCalories >= input.targetCalories * 0.7) {
    hasProteinDilution = true;
    alerts.push({
      type: 'PROTEIN_DILUTION',
      severity: 'HIGH',
      currentGramsPerKg,
      message: `Diluição Proteica Crítica: Ingestão atual em ${currentGramsPerKg}g/kg (abaixo do piso de 1.8g/kg para preservação de massa magra em déficit). Adicione fontes magras imediatamente.`,
    });
  }

  // 3. Alerta de Quebra de Déficit:
  // Quantifica quantos dias de déficit foram neutralizados pelo superávit
  let deficitBreached = false;
  let neutralizedDeficitDays = 0;
  if (input.currentCalories > input.targetCalories) {
    deficitBreached = true;
    const excessKcal = input.currentCalories - input.targetCalories;
    neutralizedDeficitDays = Math.round((excessKcal / input.plannedDailyDeficitKcal) * 10) / 10;

    alerts.push({
      type: 'DEFICIT_BREACH',
      severity: 'HIGH',
      neutralizedDays: neutralizedDeficitDays,
      message: `Quebra de Déficit Calórico: Superávit de ${excessKcal} kcal acima da meta planejada neutralizou o progresso equivalente a ${neutralizedDeficitDays} dias inteiros de déficit calórico.`,
    });
  }

  return {
    hasMathematicalImpossibility,
    hasProteinDilution,
    deficitBreached,
    neutralizedDeficitDays,
    currentGramsPerKg,
    alerts,
  };
}
