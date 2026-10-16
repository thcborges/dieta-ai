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
});
