import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { MealBuilder } from '../src/components/MealBuilder.js';

describe('MealBuilder - Edição de Porção de Item Já Lançado', () => {
  const mockMeals = {
    breakfast: [
      {
        id: 'item_1',
        foodId: 'sassami',
        name: 'Filé de Sassami Desfiado',
        grams: 100,
        calories: 165,
        protein: 31,
        carbs: 0,
        fat: 3.6,
        fiber: 0,
      },
    ],
    lunch: [],
    afternoon_snack: [],
    dinner_event: [],
  };

  it('deve exibir botão de editar porção para cada item lançado na refeição', () => {
    render(
      <MealBuilder
        meals={mockMeals}
        onAddFood={vi.fn()}
        onRemoveFood={vi.fn()}
        onCopyMeal={vi.fn()}
        onUpdateFood={vi.fn()}
        missingProtein={30}
        remainingCalories={500}
      />
    );

    const editBtn = screen.getByRole('button', { name: /Editar item Filé de Sassami Desfiado/i });
    expect(editBtn).toBeInTheDocument();
  });

  it('deve abrir modo de edição ao clicar no botão de editar, permitindo alterar a porção com recálculo automático', () => {
    const onUpdateFood = vi.fn();

    render(
      <MealBuilder
        meals={mockMeals}
        onAddFood={vi.fn()}
        onRemoveFood={vi.fn()}
        onCopyMeal={vi.fn()}
        onUpdateFood={onUpdateFood}
        missingProtein={30}
        remainingCalories={500}
      />
    );

    const editBtn = screen.getByRole('button', { name: /Editar item Filé de Sassami Desfiado/i });
    fireEvent.click(editBtn);

    // O input com a gramatura deve estar visível e preenchido com a porção original (100)
    const portionInput = screen.getByRole('spinbutton', { name: /Editar gramas/i }) as HTMLInputElement;
    expect(portionInput).toBeInTheDocument();
    expect(portionInput.value).toBe('100');

    // Altera para 200g
    fireEvent.change(portionInput, { target: { value: '200' } });

    // Clica em Salvar / Confirmar edição
    const saveBtn = screen.getByRole('button', { name: /Salvar porção/i });
    fireEvent.click(saveBtn);

    expect(onUpdateFood).toHaveBeenCalledTimes(1);
    const [targetWindow, updatedItem] = onUpdateFood.mock.calls[0];
    expect(targetWindow).toBe('breakfast');
    expect(updatedItem.id).toBe('item_1');
    expect(updatedItem.grams).toBe(200);
    // Sassami 200g: ~330 kcal, ~62g P, ~0g C, ~7.2g G
    expect(updatedItem.calories).toBe(330);
    expect(updatedItem.protein).toBe(62);
    expect(updatedItem.carbs).toBe(0);
    expect(updatedItem.fat).toBe(7.2);
  });

  it('deve permitir cancelar a edição sem disparar onUpdateFood', () => {
    const onUpdateFood = vi.fn();

    render(
      <MealBuilder
        meals={mockMeals}
        onAddFood={vi.fn()}
        onRemoveFood={vi.fn()}
        onCopyMeal={vi.fn()}
        onUpdateFood={onUpdateFood}
        missingProtein={30}
        remainingCalories={500}
      />
    );

    const editBtn = screen.getByRole('button', { name: /Editar item Filé de Sassami Desfiado/i });
    fireEvent.click(editBtn);

    const portionInput = screen.getByRole('spinbutton', { name: /Editar gramas/i });
    fireEvent.change(portionInput, { target: { value: '250' } });

    const cancelBtn = screen.getByRole('button', { name: /Cancelar edição/i });
    fireEvent.click(cancelBtn);

    expect(onUpdateFood).not.toHaveBeenCalled();
    expect(screen.queryByRole('spinbutton', { name: /Editar gramas/i })).not.toBeInTheDocument();
  });
});
