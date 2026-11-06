import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { ProteinAutocompleteModal } from '../src/components/ProteinAutocompleteModal.js';
import { MealBuilder } from '../src/components/MealBuilder.js';

describe('Auto-Completar Proteína - Comportamento de Não Lançamento Instantâneo', () => {
  it('não deve lançar no diário quando o usuário clica em "Completar proteína" em um item no modal', () => {
    const onConfirm = vi.fn();
    const onClose = vi.fn();

    render(
      <ProteinAutocompleteModal
        isOpen={true}
        onClose={onClose}
        missingProtein={40}
        remainingCalories={300}
        activeWindow="dinner_event"
        onConfirm={onConfirm}
      />
    );

    // Encontra o botão de completar proteína do item Sassami
    const completeBtn = screen.getByRole('button', {
      name: /Completar restante de proteína para Filé de Sassami Desfiado/i,
    });
    expect(completeBtn).toBeInTheDocument();

    // Clica no botão de completar
    fireEvent.click(completeBtn);

    // NÃO deve disparar onConfirm nem onClose
    expect(onConfirm).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();

    // Deve apenas preencher o valor estimado no input
    const sassamiInput = screen.getByLabelText(/Gramas de Filé de Sassami Desfiado/i) as HTMLInputElement;
    expect(Number(sassamiInput.value)).toBeGreaterThan(0);
  });

  it('no MealBuilder, o modal de Auto-Completar deve adicionar apenas os itens confirmados sem duplicata automática de Sassami', () => {
    const onAddFood = vi.fn();
    const onAutoCompleteProtein = vi.fn();

    const mockMeals = {
      breakfast: [],
      lunch: [],
      afternoon_snack: [],
      dinner_event: [],
    };

    render(
      <MealBuilder
        meals={mockMeals}
        onAddFood={onAddFood}
        onRemoveFood={vi.fn()}
        onCopyMeal={vi.fn()}
        onAutoCompleteProtein={onAutoCompleteProtein}
        missingProtein={31}
        remainingCalories={300}
      />
    );

    // Abre o modal de Auto-Completar Proteína
    const autoBtn = screen.getByRole('button', { name: /Auto-Completar Proteína/i });
    fireEvent.click(autoBtn);

    // Clica no botão de completar proteína do Sassami dentro do modal
    const completeBtn = screen.getByRole('button', {
      name: /Completar restante de proteína para Filé de Sassami Desfiado/i,
    });
    fireEvent.click(completeBtn);

    // Alimentos NÃO foram adicionados ainda
    expect(onAddFood).not.toHaveBeenCalled();

    // O lançamento só deve ocorrer ao clicar em "Lançar no Diário"
    const confirmBtn = screen.getByRole('button', { name: /Lançar no Diário/i });
    expect(confirmBtn).not.toBeDisabled();
    fireEvent.click(confirmBtn);

    // onAddFood deve ser chamado exatamente UMA vez (apenas para o Sassami selecionado)
    expect(onAddFood).toHaveBeenCalledTimes(1);
    const [, addedFood] = onAddFood.mock.calls[0];
    expect(addedFood.name).toContain('Filé de Sassami Desfiado');
    expect(addedFood.grams).toBe(100);
  });
});
