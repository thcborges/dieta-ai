import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { WeeklyThermometerCard } from '../src/components/WeeklyThermometerCard.js';

describe('WeeklyThermometerCard (UI do Termômetro do Banco Semanal)', () => {
  describe('Dieta de Perda de Peso (weight_loss)', () => {
    it('deve renderizar zona ótima quando o consumo estiver dentro do planejado', () => {
      const days = Array.from({ length: 7 }, (_, i) => ({
        date: `2026-10-${10 + i}`,
        calories: 2200,
      }));

      render(
        <WeeklyThermometerCard
          goal="weight_loss"
          dailyTargetCalories={2400}
          tdee={2900}
          weightKg={95}
          dailyDeficitKcal={500}
          days={days}
        />
      );

      expect(screen.getByText(/Termômetro do Banco Semanal/i)).toBeInTheDocument();
      expect(screen.getByText(/ZONA ÓTIMA/i)).toBeInTheDocument();
      expect(screen.getByText(/15400/i)).toBeInTheDocument(); // 7 * 2200
      expect(screen.getByText(/\/ 16800 kcal/i)).toBeInTheDocument(); // 7 * 2400
      expect(screen.queryByText(/ESTOURO DE TETO/i)).not.toBeInTheDocument();
    });

    it('deve estourar o termômetro com alerta crítico quando o consumo superar os limites planejados', () => {
      const days = Array.from({ length: 7 }, (_, i) => ({
        date: `2026-10-${10 + i}`,
        calories: 2700, // 7 * 2700 = 18900 (> 105% de 16800)
      }));

      render(
        <WeeklyThermometerCard
          goal="weight_loss"
          dailyTargetCalories={2400}
          tdee={2900}
          weightKg={95}
          dailyDeficitKcal={500}
          days={days}
        />
      );

      expect(screen.getByText('ESTOURO DE TETO CALÓRICO')).toBeInTheDocument();
      expect(screen.getByText(/Estouro de Teto Calórico Semanal/i)).toBeInTheDocument();
      expect(screen.getByText(/dias inteiros de déficit/i)).toBeInTheDocument();
    });
  });

  describe('Dieta de Ganho de Peso (weight_gain)', () => {
    it('deve exibir alerta crítico de perda ponderal se o consumo estiver abaixo do TDEE', () => {
      const days = Array.from({ length: 7 }, (_, i) => ({
        date: `2026-10-${10 + i}`,
        calories: 2500, // abaixo do TDEE de 2900
      }));

      render(
        <WeeklyThermometerCard
          goal="weight_gain"
          dailyTargetCalories={3300}
          tdee={2900}
          weightKg={95}
          dailySurplusKcal={400}
          days={days}
        />
      );

      expect(screen.getByText('RISCO CRÍTICO: PERDA PONDERAL')).toBeInTheDocument();
      expect(screen.getByText(/Alerta Crítico: Subconsumo & Risco de Perda Ponderal/i)).toBeInTheDocument();
      expect(screen.getByText(/catabolismo proteico/i)).toBeInTheDocument();
    });
  });

  describe('Dieta de Manutenção (maintenance)', () => {
    it('deve indicar estabilidade de nível quando o consumo estiver dentro da tolerância', () => {
      const days = Array.from({ length: 7 }, (_, i) => ({
        date: `2026-10-${10 + i}`,
        calories: 2920, // dentro de 3% de 2900
      }));

      render(
        <WeeklyThermometerCard
          goal="maintenance"
          dailyTargetCalories={2900}
          tdee={2900}
          weightKg={95}
          tolerancePercent={3}
          days={days}
        />
      );

      expect(screen.getByText('HOMEOSTASE / NÍVEL EQUILIBRADO')).toBeInTheDocument();
      expect(screen.queryByText(/Desvio de Manutenção/i)).not.toBeInTheDocument();
    });

    it('deve alertar desvio de manutenção quando o consumo afastar do equilíbrio', () => {
      const days = Array.from({ length: 7 }, (_, i) => ({
        date: `2026-10-${10 + i}`,
        calories: 3100, // > 3% de 2900
      }));

      render(
        <WeeklyThermometerCard
          goal="maintenance"
          dailyTargetCalories={2900}
          tdee={2900}
          weightKg={95}
          tolerancePercent={3}
          days={days}
        />
      );

      expect(screen.getByText('DESVIO DE MANUTENÇÃO (SUPERÁVIT)')).toBeInTheDocument();
      expect(screen.getByText(/Desvio de Manutenção para Cima/i)).toBeInTheDocument();
    });
  });
});
