import { describe, it, expect } from 'vitest';
import {
  auditDailyIntake,
  type DailyAuditInput,
} from '../src/auditor.js';

describe('Ruthless Logic Auditor (Módulo 4: Auditoria Lógica Implacável)', () => {
  const baseProfile = {
    weightKg: 95,
    plannedDailyDeficitKcal: 500, // Déficit planejado de 500 kcal
    targetCalories: 2400,
    targetProteinGrams: 220,
  };

  it('deve gerar alerta de Inviabilidade Matemática quando a proteína restante exceder 4 kcal/g das calorias restantes', () => {
    const input: DailyAuditInput = {
      ...baseProfile,
      currentCalories: 2250,
      currentProteinGrams: 140, // Faltam 80g de proteína = 320 kcal mínimas
      // Restam apenas 150 kcal (2400 - 2250)
    };

    const audit = auditDailyIntake(input);

    expect(audit.hasMathematicalImpossibility).toBe(true);
    const alert = audit.alerts.find(a => a.type === 'MATHEMATICAL_IMPOSSIBILITY');
    expect(alert).toBeDefined();
    expect(alert?.severity).toBe('CRITICAL');
    expect(alert?.message).toContain('Inviabilidade Matemática');
  });

  it('deve gerar alerta de Diluição Proteica quando a ingestão cair abaixo de 1.8g/kg', () => {
    const input: DailyAuditInput = {
      ...baseProfile,
      currentCalories: 2350,
      currentProteinGrams: 150, // 150 / 95 = 1.57 g/kg (< 1.8g/kg)
    };

    const audit = auditDailyIntake(input);

    expect(audit.hasProteinDilution).toBe(true);
    const alert = audit.alerts.find(a => a.type === 'PROTEIN_DILUTION');
    expect(alert).toBeDefined();
    expect(alert?.severity).toBe('HIGH');
    expect(alert?.currentGramsPerKg).toBeCloseTo(1.58, 1);
    expect(alert?.message).toContain('Diluição Proteica');
  });

  it('deve calcular exatamente quantos dias de déficit foram neutralizados em caso de superávit', () => {
    // Manutenção = 2900 kcal. Alvo de déficit = 2400 kcal (500 kcal déficit).
    // O usuário consumiu 3400 kcal (1000 kcal acima do alvo, ou 500 kcal acima da manutenção).
    // O excesso sobre a meta de déficit é 1000 kcal -> equivale a 1000 / 500 = 2.0 dias de déficit neutralizados!
    const input: DailyAuditInput = {
      ...baseProfile,
      currentCalories: 3400,
      currentProteinGrams: 230,
    };

    const audit = auditDailyIntake(input);

    expect(audit.deficitBreached).toBe(true);
    expect(audit.neutralizedDeficitDays).toBe(2.0);
    const alert = audit.alerts.find(a => a.type === 'DEFICIT_BREACH');
    expect(alert).toBeDefined();
    expect(alert?.message).toContain('2 dias');
  });

  it('não deve emitir alertas críticos quando o dia estiver dentro do planejado e com proteína alta', () => {
    const input: DailyAuditInput = {
      ...baseProfile,
      currentCalories: 2300,
      currentProteinGrams: 225, // 2.36 g/kg
    };

    const audit = auditDailyIntake(input);

    expect(audit.hasMathematicalImpossibility).toBe(false);
    expect(audit.hasProteinDilution).toBe(false);
    expect(audit.deficitBreached).toBe(false);
    expect(audit.alerts.filter(a => a.severity === 'CRITICAL')).toHaveLength(0);
  });
});
