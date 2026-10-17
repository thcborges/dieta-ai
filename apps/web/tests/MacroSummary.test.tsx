import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MacroSummary } from '../src/components/MacroSummary.js';
import type { MacroBudget } from '@dieta-ai/core';

describe('MacroSummary (Dashboard de Métricas & Banco Semanal)', () => {
  const target: MacroBudget = {
    calories: 2400,
    proteinGrams: 220,
    carbGrams: 200,
    fatGrams: 80,
    fiberGrams: 38,
  };

  const current = {
    calories: 1800,
    proteinGrams: 170,
    carbGrams: 140,
    fatGrams: 60,
    fiberGrams: 28,
  };

  it('deve renderizar totais atuais versus metas com precisão analítica', () => {
    render(<MacroSummary target={target} current={current} weeklyBankKcal={450} />);

    expect(screen.getByText(/1800/i)).toBeInTheDocument();
    expect(screen.getByText(/2400/i)).toBeInTheDocument();
    expect(screen.getByText(/170g/i)).toBeInTheDocument();
    expect(screen.getByText(/220g/i)).toBeInTheDocument();
    expect(screen.getByText(/Fibras/i)).toBeInTheDocument();
    expect(screen.getByText(/28g/i)).toBeInTheDocument();
    expect(screen.getByText(/\/ 38g/i)).toBeInTheDocument();
    expect(screen.getByText(/10g rest\./i)).toBeInTheDocument();
    expect(screen.getByText(/Banco Semanal/i)).toBeInTheDocument();
    expect(screen.getByText(/\+450 kcal/i)).toBeInTheDocument();
  });

  it('deve formatar valores restantes como números inteiros para evitar quebra de interface por decimais', () => {
    // Cenário exato reportado:
    // Calorias: 1975 / 2560 (restam 585)
    // Proteínas: 156.7g / 220g (220 - 156.7 = 63.30000000000001 -> deve exibir 63g rest.)
    // Carboidratos: 169.9g / 220g (220 - 169.9 = 50.099999999999994 -> deve exibir 50g rest.)
    // Gorduras: 68.6g / 80g (80 - 68.6 = 11.400000000000006 -> deve exibir 11g rest.)
    // Fibras: 4.8g / 38g (38 - 4.8 = 33.2 -> deve exibir 33g rest.)
    const userTarget: MacroBudget = {
      calories: 2560,
      proteinGrams: 220,
      carbGrams: 220,
      fatGrams: 80,
      fiberGrams: 38,
    };

    const userCurrent = {
      calories: 1975,
      proteinGrams: 156.7,
      carbGrams: 169.9,
      fatGrams: 68.6,
      fiberGrams: 4.8,
    };

    render(<MacroSummary target={userTarget} current={userCurrent} weeklyBankKcal={450} />);

    // Deve exibir inteiros no "rest." e não decimais ou dízimas de ponto flutuante
    expect(screen.getByText('585 rest.')).toBeInTheDocument();
    expect(screen.getByText('63g rest.')).toBeInTheDocument();
    expect(screen.getByText('50g rest.')).toBeInTheDocument();
    expect(screen.getByText('11g rest.')).toBeInTheDocument();
    expect(screen.getByText('33g rest.')).toBeInTheDocument();

    // Garante que não existem dízimas de ponto flutuante renderizadas
    expect(screen.queryByText(/63\.3/)).not.toBeInTheDocument();
    expect(screen.queryByText(/50\.09/)).not.toBeInTheDocument();
    expect(screen.queryByText(/11\.4/)).not.toBeInTheDocument();
    expect(screen.queryByText(/33\.2/)).not.toBeInTheDocument();
  });
});
