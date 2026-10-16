import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MealBuilder } from '../src/components/MealBuilder.js';

describe('MealBuilder (Módulo 3: Construtor de Refeições & Cronometer UX)', () => {
  const mockMeals = {
    breakfast: [
      { id: '1', foodId: 'ovos_inteiros', name: 'Ovos Inteiros', grams: 100, calories: 143, protein: 13, carbs: 1, fat: 10 },
    ],
    lunch: [],
    afternoon_snack: [],
    dinner_event: [],
  };

  it('deve renderizar as janelas de refeição práticas', () => {
    render(
      <MealBuilder
        meals={mockMeals}
        onAddFood={vi.fn()}
        onRemoveFood={vi.fn()}
        onCopyMeal={vi.fn()}
        onAutoCompleteProtein={vi.fn()}
        missingProtein={40}
        remainingCalories={300}
      />
    );

    expect(screen.getAllByText(/Café da Manhã \/ Pré-Treino/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Almoço/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Lanche da Tarde/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Jantar \/ Evento/i).length).toBeGreaterThan(0);
  });

  it('deve acionar o Auto-Completar Proteína quando clicado', () => {
    const onAutoComplete = vi.fn();

    render(
      <MealBuilder
        meals={mockMeals}
        onAddFood={vi.fn()}
        onRemoveFood={vi.fn()}
        onCopyMeal={vi.fn()}
        onAutoCompleteProtein={onAutoComplete}
        missingProtein={48}
        remainingCalories={300}
      />
    );

    const autoBtn = screen.getByRole('button', { name: /Auto-Completar Proteína/i });
    expect(autoBtn).toBeInTheDocument();

    fireEvent.click(autoBtn);
    expect(onAutoComplete).toHaveBeenCalled();
  });

  it('deve permitir copiar refeições entre janelas', () => {
    const onCopyMeal = vi.fn();

    render(
      <MealBuilder
        meals={mockMeals}
        onAddFood={vi.fn()}
        onRemoveFood={vi.fn()}
        onCopyMeal={onCopyMeal}
        onAutoCompleteProtein={vi.fn()}
        missingProtein={20}
        remainingCalories={400}
      />
    );

    const copyButtons = screen.getAllByTitle(/Copiar Refeição/i);
    expect(copyButtons.length).toBeGreaterThan(0);
    fireEvent.click(copyButtons[0]!);

    const confirmBtn = screen.getByRole('button', { name: /Confirmar Cópia/i });
    fireEvent.click(confirmBtn);
    expect(onCopyMeal).toHaveBeenCalled();
  });

  it('deve adicionar um alimento através do formulário de lançamento rápido', () => {
    const onAddFood = vi.fn();

    render(
      <MealBuilder
        meals={mockMeals}
        onAddFood={onAddFood}
        onRemoveFood={vi.fn()}
        onCopyMeal={vi.fn()}
        onAutoCompleteProtein={vi.fn()}
        missingProtein={20}
        remainingCalories={400}
      />
    );

    const gramInput = screen.getByRole('spinbutton');
    fireEvent.change(gramInput, { target: { value: '150' } });

    const launchButton = screen.getByRole('button', { name: /Lançar/i });
    fireEvent.click(launchButton);

    expect(onAddFood).toHaveBeenCalled();
    const calledArgs = onAddFood.mock.calls[0];
    expect(calledArgs[1].grams).toBe(150);
  });

  it('deve adicionar um alimento clicando em um chip de alimento frequente', () => {
    const onAddFood = vi.fn();

    render(
      <MealBuilder
        meals={mockMeals}
        onAddFood={onAddFood}
        onRemoveFood={vi.fn()}
        onCopyMeal={vi.fn()}
        onAutoCompleteProtein={vi.fn()}
        missingProtein={20}
        remainingCalories={400}
      />
    );

    const chipButton = screen.getByRole('button', { name: /\+ Feijão/i });
    fireEvent.click(chipButton);

    expect(onAddFood).toHaveBeenCalled();
    const calledArgs = onAddFood.mock.calls[0];
    expect(calledArgs[0]).toBe('lunch');
    expect(calledArgs[1].foodId).toBe('feijao_preto');
  });

  it('deve chamar onRemoveFood ao clicar no botão de lixeira de um alimento', () => {
    const onRemoveFood = vi.fn();

    render(
      <MealBuilder
        meals={mockMeals}
        onAddFood={vi.fn()}
        onRemoveFood={onRemoveFood}
        onCopyMeal={vi.fn()}
        onAutoCompleteProtein={vi.fn()}
        missingProtein={20}
        remainingCalories={400}
      />
    );

    const removeBtn = screen.getByTitle(/Remover Item/i);
    fireEvent.click(removeBtn);

    expect(onRemoveFood).toHaveBeenCalledWith('breakfast', '1');
  });
});
