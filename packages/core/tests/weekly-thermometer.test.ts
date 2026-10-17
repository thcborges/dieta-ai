import { describe, it, expect } from 'vitest';
import {
  evaluateWeeklyThermometer,
  type WeeklyThermometerInput,
} from '../src/weekly-thermometer';

describe('evaluateWeeklyThermometer (Motor do Banco Semanal & Termômetro Móvel)', () => {
  describe('Validações de Entrada', () => {
    it('deve lançar erro se a lista de dias estiver vazia', () => {
      const input: WeeklyThermometerInput = {
        goal: 'weight_loss',
        dailyTargetCalories: 2400,
        tdee: 2900,
        weightKg: 95,
        dailyDeficitKcal: 500,
        days: [],
      };

      expect(() => evaluateWeeklyThermometer(input)).toThrow(
        'A janela móvel deve conter pelo menos 1 dia registrado'
      );
    });

    it('deve limitar a janela móvel aos 7 dias mais recentes se forem passados mais de 7 dias', () => {
      const days = Array.from({ length: 10 }, (_, i) => ({
        date: `2026-10-${10 + i}`,
        calories: 2000,
      }));

      const report = evaluateWeeklyThermometer({
        goal: 'weight_loss',
        dailyTargetCalories: 2400,
        tdee: 2900,
        weightKg: 95,
        dailyDeficitKcal: 500,
        days,
      });

      expect(report.daysCount).toBe(7);
      expect(report.totalActualCalories).toBe(14000); // 7 * 2000
    });
  });

  describe('Objetivo: Perda de Peso (weight_loss)', () => {
    it('deve retornar status optimal quando o consumo estiver abaixo ou igual à meta', () => {
      // 7 dias com meta de 2400 kcal (total 16.800 kcal). Consumido: 16.000 kcal (-800 kcal economizados)
      const days = Array.from({ length: 7 }, () => ({
        date: '2026-10-15',
        calories: 2285,
      }));

      const report = evaluateWeeklyThermometer({
        goal: 'weight_loss',
        dailyTargetCalories: 2400,
        tdee: 2900,
        weightKg: 95,
        dailyDeficitKcal: 500,
        days,
      });

      expect(report.status).toBe('optimal');
      expect(report.thermalRatioPercent).toBeLessThanOrEqual(100);
      expect(report.weeklySlipKcal).toBeLessThan(0); // Poupança
      expect(report.alerts).toHaveLength(0);
      expect(report.adherenceScorePercent).toBeGreaterThanOrEqual(90);
    });

    it('deve retornar status warning quando o consumo estiver ligeiramente acima da meta (entre 100% e 105%)', () => {
      // Meta 7 * 2400 = 16.800 kcal. Consumo: 17.200 kcal (~102.4%)
      const days = [
        { date: 'd1', calories: 2500 },
        { date: 'd2', calories: 2450 },
        { date: 'd3', calories: 2450 },
        { date: 'd4', calories: 2450 },
        { date: 'd5', calories: 2450 },
        { date: 'd6', calories: 2450 },
        { date: 'd7', calories: 2450 },
      ]; // total = 17.200 kcal

      const report = evaluateWeeklyThermometer({
        goal: 'weight_loss',
        dailyTargetCalories: 2400,
        tdee: 2900,
        weightKg: 95,
        dailyDeficitKcal: 500,
        days,
      });

      expect(report.status).toBe('warning');
      expect(report.thermalRatioPercent).toBeGreaterThan(100);
      expect(report.thermalRatioPercent).toBeLessThanOrEqual(105);
      expect(report.alerts.some(a => a.code === 'WARNING_BUDGET')).toBe(true);
    });

    it('deve estourar o termômetro (blown) com alerta crítico e cálculo de dias neutralizados quando consumo > 105%', () => {
      // Meta 7 * 2400 = 16.800 kcal. Consumido: 18.500 kcal (+1.700 kcal de deslize)
      // Com deficit diário de 500 kcal, neutralizou 1700 / 500 = 3.4 dias inteiros de déficit
      const days = Array.from({ length: 7 }, () => ({
        date: '2026-10-15',
        calories: 2643,
      })); // 7 * 2643 = 18.501 kcal

      const report = evaluateWeeklyThermometer({
        goal: 'weight_loss',
        dailyTargetCalories: 2400,
        tdee: 2900,
        weightKg: 95,
        dailyDeficitKcal: 500,
        days,
      });

      expect(report.status).toBe('blown');
      expect(report.thermalRatioPercent).toBeGreaterThan(105);
      expect(report.weeklySlipKcal).toBeGreaterThan(0);
      expect(report.neutralizedDeficitDays).toBe(3.4);
      expect(report.alerts.some(a => a.code === 'BLOWN_BUDGET' && a.severity === 'CRITICAL')).toBe(true);
      expect(report.alerts[0].message).toContain('Estouro de Teto Calórico Semanal');
      expect(report.alerts[0].message).toContain('3.4 dias');
    });
  });

  describe('Objetivo: Ganho de Peso (weight_gain)', () => {
    it('deve retornar status optimal quando atingir o teto anabólico planejado', () => {
      // TDEE 2900 kcal, meta de superávit: 3300 kcal/dia. 7 dias = 23.100 kcal
      const days = Array.from({ length: 7 }, () => ({
        date: '2026-10-15',
        calories: 3300,
      }));

      const report = evaluateWeeklyThermometer({
        goal: 'weight_gain',
        dailyTargetCalories: 3300,
        tdee: 2900,
        weightKg: 95,
        dailySurplusKcal: 400,
        days,
      });

      expect(report.status).toBe('optimal');
      expect(report.thermalRatioPercent).toBe(100);
      expect(report.projectedWeightDeltaKg).toBeGreaterThan(0);
      expect(report.alerts).toHaveLength(0);
    });

    it('deve emitir warning se o superávit estiver abaixo do planejado mas ainda acima do TDEE', () => {
      // 7 * 3300 = 23.100 kcal. Consumo: 7 * 3100 = 21.700 kcal (~93.9% da meta)
      const days = Array.from({ length: 7 }, () => ({
        date: '2026-10-15',
        calories: 3100,
      }));

      const report = evaluateWeeklyThermometer({
        goal: 'weight_gain',
        dailyTargetCalories: 3300,
        tdee: 2900,
        weightKg: 95,
        dailySurplusKcal: 400,
        days,
      });

      expect(report.status).toBe('warning');
      expect(report.alerts.some(a => a.code === 'WARNING_LOW_CALORIES')).toBe(true);
    });

    it('deve disparar alerta crítico de perda de peso quando consumo estiver abaixo do TDEE (risco catabólico)', () => {
      // TDEE 2900 kcal (7 * 2900 = 20.300 kcal). Consumo: 7 * 2500 = 17.500 kcal (Déficit involuntário de -2800 kcal)
      // Perda projetada: -2800 / 7700 = -0.36 kg
      const days = Array.from({ length: 7 }, () => ({
        date: '2026-10-15',
        calories: 2500,
      }));

      const report = evaluateWeeklyThermometer({
        goal: 'weight_gain',
        dailyTargetCalories: 3300,
        tdee: 2900,
        weightKg: 95,
        dailySurplusKcal: 400,
        days,
      });

      expect(report.status).toBe('critical_deficit');
      expect(report.projectedWeightDeltaKg).toBeLessThan(0);
      expect(report.alerts.some(a => a.code === 'CRITICAL_WEIGHT_LOSS' && a.severity === 'CRITICAL')).toBe(true);
      expect(report.alerts[0].message).toContain('Alerta Crítico: Subconsumo & Risco de Perda Ponderal');
      expect(report.alerts[0].message).toContain('-0.36 kg');
    });
  });

  describe('Objetivo: Manutenção (maintenance)', () => {
    it('deve manter o termômetro no nível ótimo quando a variação estiver dentro da tolerância percentual', () => {
      // TDEE 2900 kcal. 7 * 2900 = 20.300 kcal. Consumo: 20.500 kcal (+0.98% de desvio, tolerância padrão 3%)
      const days = [
        { date: 'd1', calories: 2950 },
        { date: 'd2', calories: 2900 },
        { date: 'd3', calories: 2900 },
        { date: 'd4', calories: 2950 },
        { date: 'd5', calories: 2900 },
        { date: 'd6', calories: 2900 },
        { date: 'd7', calories: 2900 },
      ]; // total = 20.400 kcal

      const report = evaluateWeeklyThermometer({
        goal: 'maintenance',
        dailyTargetCalories: 2900,
        tdee: 2900,
        weightKg: 95,
        tolerancePercent: 3,
        days,
      });

      expect(report.status).toBe('optimal');
      expect(report.alerts).toHaveLength(0);
      expect(report.adherenceScorePercent).toBeGreaterThanOrEqual(95);
    });

    it('deve alertar desvio para cima (surplus_drift) quando ultrapassar a tolerância positiva', () => {
      // 7 * 2900 = 20.300 kcal. Consumo: 21.500 kcal (+5.9% de desvio)
      const days = Array.from({ length: 7 }, () => ({
        date: '2026-10-15',
        calories: 3072,
      })); // ~21.504 kcal

      const report = evaluateWeeklyThermometer({
        goal: 'maintenance',
        dailyTargetCalories: 2900,
        tdee: 2900,
        weightKg: 95,
        tolerancePercent: 3,
        days,
      });

      expect(report.status).toBe('surplus_drift');
      expect(report.alerts.some(a => a.code === 'MAINTENANCE_DRIFT_HIGH')).toBe(true);
      expect(report.alerts[0].message).toContain('Desvio de Manutenção para Cima');
    });

    it('deve alertar desvio para baixo (critical_deficit) quando ultrapassar a tolerância negativa', () => {
      // 7 * 2900 = 20.300 kcal. Consumo: 19.000 kcal (-6.4% de desvio)
      const days = Array.from({ length: 7 }, () => ({
        date: '2026-10-15',
        calories: 2714,
      })); // ~18.998 kcal

      const report = evaluateWeeklyThermometer({
        goal: 'maintenance',
        dailyTargetCalories: 2900,
        tdee: 2900,
        weightKg: 95,
        tolerancePercent: 3,
        days,
      });

      expect(report.status).toBe('critical_deficit');
      expect(report.alerts.some(a => a.code === 'MAINTENANCE_DRIFT_LOW')).toBe(true);
      expect(report.alerts[0].message).toContain('Desvio de Manutenção para Baixo');
    });
  });
});
