import { describe, it, expect } from 'vitest';
import {
  imputeMissingWeeklyDays,
  evaluateWeeklyThermometer,
  type RollingDayLog,
  type WeeklyThermometerInput,
} from '../src/weekly-thermometer.js';

describe('BDD: Imputação da Média Semanal para Dias Não Registrados', () => {
  it('deve preencher 1 dia não registrado com a média dos outros 6 dias registrados', () => {
    const days: RollingDayLog[] = [
      { date: '2026-01-04', calories: 2000, proteinGrams: 160 },
      { date: '2026-01-05', calories: 2000, proteinGrams: 160 },
      { date: '2026-01-06', calories: 2000, proteinGrams: 160 },
      { date: '2026-01-07', calories: 2000, proteinGrams: 160 },
      { date: '2026-01-08', calories: 2000, proteinGrams: 160 },
      { date: '2026-01-09', calories: 0 }, // Dia não preenchido
      { date: '2026-01-10', calories: 2000, proteinGrams: 160 },
    ];

    const result = imputeMissingWeeklyDays(days);

    expect(result.hasSufficientData).toBe(true);
    expect(result.recordedCount).toBe(6);
    expect(result.imputedCount).toBe(1);
    expect(result.averageCalories).toBe(2000);
    expect(result.averageProtein).toBe(160);

    // O dia 09/01/2026 deve ter recebido a média com a flag isImputed: true
    const imputedDay = result.days.find(d => d.date === '2026-01-09');
    expect(imputedDay?.calories).toBe(2000);
    expect(imputedDay?.proteinGrams).toBe(160);
    expect(imputedDay?.isImputed).toBe(true);

    const totalCals = result.days.reduce((acc, d) => acc + d.calories, 0);
    expect(totalCals).toBe(14000); // 7 * 2000
  });

  it('deve preencher 2 dias não registrados com a média dos outros 5 dias registrados', () => {
    const days: RollingDayLog[] = [
      { date: '2026-01-04', calories: 1800, proteinGrams: 150 },
      { date: '2026-01-05', calories: 2000, proteinGrams: 160 },
      { date: '2026-01-06', calories: 0 }, // Não registrado
      { date: '2026-01-07', calories: 2200, proteinGrams: 170 },
      { date: '2026-01-08', calories: 2000, proteinGrams: 160 },
      { date: '2026-01-09', calories: 0 }, // Não registrado
      { date: '2026-01-10', calories: 2000, proteinGrams: 160 },
    ];

    const result = imputeMissingWeeklyDays(days);

    expect(result.hasSufficientData).toBe(true);
    expect(result.recordedCount).toBe(5);
    expect(result.imputedCount).toBe(2);
    // Média = (1800 + 2000 + 2200 + 2000 + 2000) / 5 = 10000 / 5 = 2000
    expect(result.averageCalories).toBe(2000);

    const imputedDays = result.days.filter(d => d.isImputed);
    expect(imputedDays).toHaveLength(2);
    expect(imputedDays[0].calories).toBe(2000);
    expect(imputedDays[1].calories).toBe(2000);
  });

  it('deve incluir dias de jejum explícito (0 kcal) no cálculo da média como 0 kcal reais', () => {
    const days: RollingDayLog[] = [
      { date: '2026-01-04', calories: 2400 },
      { date: '2026-01-05', calories: 2400 },
      { date: '2026-01-06', calories: 2400 },
      { date: '2026-01-07', calories: 2400 },
      { date: '2026-01-08', calories: 2400 },
      { date: '2026-01-09', calories: 0, isFasting: true }, // Jejum explícito
      { date: '2026-01-10', calories: 0 }, // Não registrado
    ];

    const result = imputeMissingWeeklyDays(days);

    expect(result.hasSufficientData).toBe(true);
    expect(result.recordedCount).toBe(6); // 5 dias normais + 1 dia de jejum
    expect(result.imputedCount).toBe(1);
    // Média = (5 * 2400 + 0) / 6 = 12000 / 6 = 2000
    expect(result.averageCalories).toBe(2000);

    const fastingDay = result.days.find(d => d.date === '2026-01-09');
    expect(fastingDay?.calories).toBe(0);
    expect(fastingDay?.isFasting).toBe(true);
    expect(fastingDay?.isImputed).toBeFalsy();

    const missingDay = result.days.find(d => d.date === '2026-01-10');
    expect(missingDay?.calories).toBe(2000);
    expect(missingDay?.isImputed).toBe(true);
  });

  it('deve retornar hasSufficientData: false e manter termômetro inativo caso nenhum dia tenha registro (0 dias preenchidos)', () => {
    const days: RollingDayLog[] = Array.from({ length: 7 }, (_, i) => ({
      date: `2026-01-0${i + 1}`,
      calories: 0,
    }));

    const result = imputeMissingWeeklyDays(days);
    expect(result.hasSufficientData).toBe(false);
    expect(result.recordedCount).toBe(0);
    expect(result.imputedCount).toBe(0);
    expect(result.averageCalories).toBe(0);

    // Avaliação no termômetro deve indicar dados insuficientes
    const report = evaluateWeeklyThermometer({
      goal: 'weight_loss',
      dailyTargetCalories: 2000,
      tdee: 2500,
      weightKg: 90,
      days,
      imputeMissingDays: true,
    });

    expect(report.hasSufficientData).toBe(false);
    expect(report.totalActualCalories).toBe(0);
    expect(report.imputedDaysCount).toBe(0);
  });

  it('deve integrar com evaluateWeeklyThermometer preenchendo o consumo total com os dias imputados', () => {
    const days: RollingDayLog[] = [
      { date: '2026-01-04', calories: 2000 },
      { date: '2026-01-05', calories: 2000 },
      { date: '2026-01-06', calories: 2000 },
      { date: '2026-01-07', calories: 2000 },
      { date: '2026-01-08', calories: 2000 },
      { date: '2026-01-09', calories: 0 }, // Não preenchido -> imputa 2000
      { date: '2026-01-10', calories: 2000 },
    ];

    const input: WeeklyThermometerInput = {
      goal: 'weight_loss',
      dailyTargetCalories: 2000,
      tdee: 2500,
      weightKg: 90,
      days,
      imputeMissingDays: true,
    };

    const report = evaluateWeeklyThermometer(input);

    expect(report.hasSufficientData).toBe(true);
    expect(report.imputedDaysCount).toBe(1);
    expect(report.totalActualCalories).toBe(14000); // 7 * 2000
    expect(report.weeklySlipKcal).toBe(0); // 14000 - 14000 = 0
  });
});
