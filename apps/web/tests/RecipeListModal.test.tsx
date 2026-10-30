import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { RecipeListModal } from '../src/components/RecipeListModal.js';
import type { RecipeInput, FoodItem } from '@dieta-ai/core';

const sampleFoods: FoodItem[] = [
  {
    id: 'whey_growth_30g',
    name: 'Whey Protein Concentrado 80%',
    servingSizeGrams: 30,
    caloriesPer100g: 400,
    proteinPer100g: 80,
    carbsPer100g: 10,
    fatPer100g: 6.67,
    fiberPer100g: 0,
    tags: ['suplemento'],
  },
  {
    id: 'claras_pasteurizadas',
    name: 'Clara de Ovo Pasteurizada',
    servingSizeGrams: 100,
    caloriesPer100g: 50,
    proteinPer100g: 11,
    carbsPer100g: 0,
    fatPer100g: 0,
    fiberPer100g: 0,
    tags: ['proteina'],
  },
];

const sampleRecipes: RecipeInput[] = [
  {
    id: 'recipe_bolo_cappuccino',
    name: 'Bolo de Whey Cappuccino',
    servings: 4,
    servingUnitName: 'fatia',
    ingredients: [
      { foodId: 'whey_growth_30g', gramsOrUnits: 60 },
      { foodId: 'claras_pasteurizadas', gramsOrUnits: 150 },
    ],
  },
];

describe('RecipeListModal (Listagem e Gestão de Receitas)', () => {
  it('não deve renderizar quando isOpen for falso', () => {
    const { container } = render(
      <RecipeListModal
        isOpen={false}
        onClose={vi.fn()}
        recipes={[]}
        availableFoods={sampleFoods}
        onOpenCreate={vi.fn()}
        onOpenEdit={vi.fn()}
        onOpenLog={vi.fn()}
        onDeleteRecipe={vi.fn()}
      />
    );

    expect(container.firstChild).toBeNull();
  });

  it('deve exibir mensagem de lista vazia quando não houver receitas cadastradas', () => {
    const onOpenCreate = vi.fn();
    render(
      <RecipeListModal
        isOpen={true}
        onClose={vi.fn()}
        recipes={[]}
        availableFoods={sampleFoods}
        onOpenCreate={onOpenCreate}
        onOpenEdit={vi.fn()}
        onOpenLog={vi.fn()}
        onDeleteRecipe={vi.fn()}
      />
    );

    expect(screen.getByText(/Nenhuma receita cadastrada/i)).toBeInTheDocument();
    const createBtn = screen.getByRole('button', { name: /Criar Primeira Receita/i });
    fireEvent.click(createBtn);
    expect(onOpenCreate).toHaveBeenCalledTimes(1);
  });

  it('deve listar receitas com detalhes, rendimento e resumo nutricional', () => {
    render(
      <RecipeListModal
        isOpen={true}
        onClose={vi.fn()}
        recipes={sampleRecipes}
        availableFoods={sampleFoods}
        onOpenCreate={vi.fn()}
        onOpenEdit={vi.fn()}
        onOpenLog={vi.fn()}
        onDeleteRecipe={vi.fn()}
      />
    );

    expect(screen.getByText('Bolo de Whey Cappuccino')).toBeInTheDocument();
    expect(screen.getByText(/4 fatias/i)).toBeInTheDocument();
    expect(screen.getByText(/210g total/i)).toBeInTheDocument(); // 60g + 150g
    expect(screen.getByText(/Whey Protein Concentrado 80%/i)).toBeInTheDocument();
    expect(screen.getByText(/Clara de Ovo Pasteurizada/i)).toBeInTheDocument();
  });

  it('deve chamar callbacks de Lançar, Editar e Excluir receita', () => {
    const onOpenLog = vi.fn();
    const onOpenEdit = vi.fn();
    const onDeleteRecipe = vi.fn();

    render(
      <RecipeListModal
        isOpen={true}
        onClose={vi.fn()}
        recipes={sampleRecipes}
        availableFoods={sampleFoods}
        onOpenCreate={vi.fn()}
        onOpenEdit={onOpenEdit}
        onOpenLog={onOpenLog}
        onDeleteRecipe={onDeleteRecipe}
      />
    );

    // Lançar no diário
    const logBtn = screen.getByRole('button', { name: /Lançar/i });
    fireEvent.click(logBtn);
    expect(onOpenLog).toHaveBeenCalledWith(sampleRecipes[0]);

    // Editar
    const editBtn = screen.getByRole('button', { name: /Editar Bolo de Whey Cappuccino/i });
    fireEvent.click(editBtn);
    expect(onOpenEdit).toHaveBeenCalledWith(sampleRecipes[0]);

    // Excluir
    const deleteBtn = screen.getByRole('button', { name: /Excluir Bolo de Whey Cappuccino/i });
    fireEvent.click(deleteBtn);
    expect(onDeleteRecipe).toHaveBeenCalledWith('recipe_bolo_cappuccino');
  });
});
