import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { LogRecipeModal } from '../src/components/LogRecipeModal.js';
import { PREPOPULATED_FOODS, type FoodItem, type RecipeInput } from '@dieta-ai/core';

describe('LogRecipeModal (Lançamento de Porções e Frações de Receitas)', () => {
  const sampleFoods: FoodItem[] = PREPOPULATED_FOODS;
  const sampleRecipe: RecipeInput = {
    id: 'recipe_bolo_cappuccino',
    name: 'Bolo de Whey Cappuccino',
    servings: 4,
    servingUnitName: 'fatia',
    ingredients: [
      { foodId: 'whey_growth_30g', gramsOrUnits: 60 }, // ~248 kcal, 48g P
      { foodId: 'claras_pasteurizadas', gramsOrUnits: 150 }, // ~78 kcal, 16.5g P
      { foodId: 'ovos_inteiros', gramsOrUnits: 100 }, // ~143 kcal, 13g P
    ],
  };

  it('não deve renderizar quando isOpen for falso', () => {
    render(
      <LogRecipeModal
        isOpen={false}
        onClose={vi.fn()}
        recipe={sampleRecipe}
        availableFoods={sampleFoods}
        onLogPortion={vi.fn()}
      />
    );
    expect(screen.queryByText(/Lançar Receita no Diário/i)).not.toBeInTheDocument();
  });

  it('deve renderizar detalhes da receita, modos de porção e macros quando isOpen for verdadeiro', () => {
    render(
      <LogRecipeModal
        isOpen={true}
        onClose={vi.fn()}
        recipe={sampleRecipe}
        availableFoods={sampleFoods}
        onLogPortion={vi.fn()}
      />
    );

    expect(screen.getByText(/Lançar Receita no Diário/i)).toBeInTheDocument();
    expect(screen.getByText(/Bolo de Whey Cappuccino/i)).toBeInTheDocument();
    expect(screen.getByText(/4 fatias/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Janela da Refeição/i)).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /Porção \(fatia\)/i })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /Fração da Receita/i })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /Peso em Gramas/i })).toBeInTheDocument();
  });

  it('deve permitir lançar por porção (1 fatia) chamando onLogPortion com os macros calculados', () => {
    const onLogPortion = vi.fn();
    render(
      <LogRecipeModal
        isOpen={true}
        onClose={vi.fn()}
        recipe={sampleRecipe}
        availableFoods={sampleFoods}
        defaultWindow="afternoon_snack"
        onLogPortion={onLogPortion}
      />
    );

    // O padrão é 1 fatia
    const submitBtn = screen.getByRole('button', { name: /Adicionar ao Diário/i });
    fireEvent.click(submitBtn);

    expect(onLogPortion).toHaveBeenCalledTimes(1);
    const [window, loggedItem] = onLogPortion.mock.calls[0];
    expect(window).toBe('afternoon_snack');
    expect(loggedItem.name).toContain('Bolo de Whey Cappuccino');
    expect(loggedItem.name).toContain('1 fatia');
    expect(loggedItem.protein).toBeGreaterThan(15); // ~77.5 / 4 = ~19.4g
  });

  it('deve permitir lançar por fração (ex: 1/2 da receita)', () => {
    const onLogPortion = vi.fn();
    render(
      <LogRecipeModal
        isOpen={true}
        onClose={vi.fn()}
        recipe={sampleRecipe}
        availableFoods={sampleFoods}
        defaultWindow="lunch"
        onLogPortion={onLogPortion}
      />
    );

    // Seleciona modo fração
    const fractionRadio = screen.getByRole('radio', { name: /Fração da Receita/i });
    fireEvent.click(fractionRadio);

    // Clica no atalho 1/2
    const halfBtn = screen.getByRole('button', { name: '1/2' });
    fireEvent.click(halfBtn);

    const submitBtn = screen.getByRole('button', { name: /Adicionar ao Diário/i });
    fireEvent.click(submitBtn);

    expect(onLogPortion).toHaveBeenCalledTimes(1);
    const [window, loggedItem] = onLogPortion.mock.calls[0];
    expect(window).toBe('lunch');
    expect(loggedItem.name).toContain('1/2');
    expect(loggedItem.protein).toBeCloseTo(77.5 * 0.5, 0);
  });

  it('deve permitir lançar por peso em gramas', () => {
    const onLogPortion = vi.fn();
    render(
      <LogRecipeModal
        isOpen={true}
        onClose={vi.fn()}
        recipe={sampleRecipe}
        availableFoods={sampleFoods}
        defaultWindow="breakfast"
        onLogPortion={onLogPortion}
      />
    );

    // Seleciona modo gramas
    const gramsRadio = screen.getByRole('radio', { name: /Peso em Gramas/i });
    fireEvent.click(gramsRadio);

    const gramsInput = screen.getByLabelText(/Gramas consumidos/i);
    fireEvent.change(gramsInput, { target: { value: '155' } }); // Metade de 310g

    const submitBtn = screen.getByRole('button', { name: /Adicionar ao Diário/i });
    fireEvent.click(submitBtn);

    expect(onLogPortion).toHaveBeenCalledTimes(1);
    const [window, loggedItem] = onLogPortion.mock.calls[0];
    expect(window).toBe('breakfast');
    expect(loggedItem.grams).toBe(155);
  });
});
