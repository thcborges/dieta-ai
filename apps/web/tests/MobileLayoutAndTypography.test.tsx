import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { MealBuilder, type MealMap } from '../src/components/MealBuilder.js';
import { MacroSummary } from '../src/components/MacroSummary.js';
import { PREPOPULATED_FOODS } from '@dieta-ai/core';

describe('Diagramação Mobile & Tipografia (MacroMetrics Pro Mobile Layout)', () => {
  const dummyMeals: MealMap = {
    breakfast: [
      {
        id: 'item_1',
        foodId: 'sassami',
        name: 'Sassami de Frango Desfiado Grelhado',
        grams: 150,
        calories: 240,
        protein: 48,
        carbs: 0,
        fat: 4.5,
        fiber: 0,
      },
    ],
    lunch: [],
    afternoon_snack: [],
    dinner_event: [],
  };

  const dummyTarget = {
    calories: 2000,
    proteinGrams: 200,
    carbGrams: 150,
    fatGrams: 60,
    fiberGrams: 38,
  };

  const dummyCurrent = {
    calories: 240,
    proteinGrams: 48,
    carbGrams: 0,
    fatGrams: 4.5,
    fiberGrams: 0,
  };

  it('deve estruturar o cabeçalho das janelas de refeição com flex items-center justify-between (não flex-col) para posicionar ações no topo direito', () => {
    const { container } = render(
      <MealBuilder
        meals={dummyMeals}
        availableFoods={PREPOPULATED_FOODS}
        recipes={[]}
        onAddFood={vi.fn()}
        onRemoveFood={vi.fn()}
        onCopyMeal={vi.fn()}
        missingProtein={152}
        remainingCalories={1760}
      />
    );

    // O header de cada janela de refeição deve ter items-center justify-between sem flex-col
    const header = container.querySelector('[data-testid="meal-window-header-breakfast"]');
    expect(header).toBeInTheDocument();
    // Não deve conter flex-col para evitar que ações caiam abaixo do ícone à esquerda
    expect(header?.className).not.toContain('flex-col');
    expect(header?.className).toContain('justify-between');
    expect(header?.className).toContain('items-center');
  });

  it('deve abrir o menu de ações mobile no topo direito e fechá-lo ao tocar no backdrop externo', () => {
    render(
      <MealBuilder
        meals={dummyMeals}
        availableFoods={PREPOPULATED_FOODS}
        recipes={[]}
        onAddFood={vi.fn()}
        onRemoveFood={vi.fn()}
        onCopyMeal={vi.fn()}
        missingProtein={152}
        remainingCalories={1760}
      />
    );

    const menuButtons = screen.getAllByRole('button', { name: /Ações da Refeição/i });
    expect(menuButtons.length).toBeGreaterThan(0);

    // Clica para abrir o menu da primeira janela (breakfast)
    fireEvent.click(menuButtons[0]);

    // O menu deve estar visível com suas opções
    expect(screen.getByRole('menuitem', { name: /Foto da Refeição \(IA\)/i })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: /Lançamento Rápido/i })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: /Copiar Refeição/i })).toBeInTheDocument();

    // Deve existir um backdrop para fechar ao tocar fora
    const backdrop = document.querySelector('.fixed.inset-0.z-20');
    expect(backdrop).toBeInTheDocument();

    // Clica no backdrop para fechar
    fireEvent.click(backdrop!);
    expect(screen.queryByRole('menuitem', { name: /Foto da Refeição \(IA\)/i })).not.toBeInTheDocument();
  });

  it('deve diagramar o MacroSummary com grid responsivo otimizado para celular (grid-cols-2 no mobile)', () => {
    const { container } = render(
      <MacroSummary target={dummyTarget} current={dummyCurrent} weeklyBankKcal={150} />
    );

    const grid = container.querySelector('[class*="grid grid-cols-2 sm:grid-cols-5"]');
    expect(grid).toBeInTheDocument();

    // O card de calorias deve ocupar 2 colunas no mobile e 1 no desktop
    const caloriesCard = grid?.firstElementChild;
    expect(caloriesCard?.className).toContain('col-span-2');
    expect(caloriesCard?.className).toContain('sm:col-span-1');
  });
});
