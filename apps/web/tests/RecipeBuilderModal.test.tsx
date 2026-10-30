import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { RecipeBuilderModal } from '../src/components/RecipeBuilderModal.js';
import { PREPOPULATED_FOODS, type FoodItem, type RecipeInput } from '@dieta-ai/core';

describe('RecipeBuilderModal (Criação e Edição de Receitas M3)', () => {
  const sampleFoods: FoodItem[] = PREPOPULATED_FOODS;

  it('não deve renderizar quando isOpen for falso', () => {
    render(
      <RecipeBuilderModal
        isOpen={false}
        onClose={vi.fn()}
        onSaveRecipe={vi.fn()}
        availableFoods={sampleFoods}
      />
    );
    expect(screen.queryByText(/Criar Nova Receita/i)).not.toBeInTheDocument();
  });

  it('deve renderizar formulário completo e card analítico quando isOpen for verdadeiro', () => {
    render(
      <RecipeBuilderModal
        isOpen={true}
        onClose={vi.fn()}
        onSaveRecipe={vi.fn()}
        availableFoods={sampleFoods}
      />
    );

    expect(screen.getByText(/Criar Nova Receita/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Nome da Receita/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Rendimento \(Porções\)/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Unidade da Porção/i)).toBeInTheDocument();
    expect(screen.getByText(/Ingredientes da Receita/i)).toBeInTheDocument();
    expect(screen.getByText(/Resumo Nutricional da Receita/i)).toBeInTheDocument();
  });

  it('deve validar nome e ingrediente obrigatório antes de salvar', () => {
    const onSave = vi.fn();
    render(
      <RecipeBuilderModal
        isOpen={true}
        onClose={vi.fn()}
        onSaveRecipe={onSave}
        availableFoods={sampleFoods}
      />
    );

    const saveButton = screen.getByRole('button', { name: /Salvar Receita/i });
    fireEvent.click(saveButton);

    expect(onSave).not.toHaveBeenCalled();
    expect(screen.getByText(/O nome da receita é obrigatório/i)).toBeInTheDocument();
  });

  it('deve permitir adicionar ingrediente, calcular macros em tempo real e salvar a receita', () => {
    const onSave = vi.fn();
    render(
      <RecipeBuilderModal
        isOpen={true}
        onClose={vi.fn()}
        onSaveRecipe={onSave}
        availableFoods={sampleFoods}
      />
    );

    // Preenche nome
    const nameInput = screen.getByLabelText(/Nome da Receita/i);
    fireEvent.change(nameInput, { target: { value: 'Bolo Proteico de Frango e Ovos' } });

    // Seleciona ingrediente sassami e quantidade 200g
    const selectFood = screen.getByLabelText(/Selecionar Ingrediente/i);
    fireEvent.change(selectFood, { target: { value: 'sassami' } });

    const gramsInput = screen.getByLabelText(/Quantidade \(g\)/i);
    fireEvent.change(gramsInput, { target: { value: '200' } });

    // Clica em Adicionar Ingrediente
    const addIngBtn = screen.getByRole('button', { name: /^Adicionar$/i });
    fireEvent.click(addIngBtn);

    // Verifica que o ingrediente aparece na lista
    expect(screen.getAllByText(/Filé de Sassami/i).length).toBeGreaterThanOrEqual(2); // no select e na lista
    expect(screen.getAllByText(/200g/i).length).toBeGreaterThanOrEqual(1);

    // Verifica que o resumo nutricional calculou os macros
    // 200g sassami = 330 kcal, 62g proteina
    expect(screen.getAllByText(/330 kcal/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/62g/i).length).toBeGreaterThanOrEqual(1);

    // Salva a receita
    const saveBtn = screen.getByRole('button', { name: /Salvar Receita/i });
    fireEvent.click(saveBtn);

    expect(onSave).toHaveBeenCalledTimes(1);
    const savedArg: RecipeInput = onSave.mock.calls[0][0];
    expect(savedArg.name).toBe('Bolo Proteico de Frango e Ovos');
    expect(savedArg.servings).toBe(1);
    expect(savedArg.ingredients.length).toBe(1);
    expect(savedArg.ingredients[0].foodId).toBe('sassami');
    expect(savedArg.ingredients[0].gramsOrUnits).toBe(200);
  });

  it('deve permitir remover um ingrediente adicionado', () => {
    render(
      <RecipeBuilderModal
        isOpen={true}
        onClose={vi.fn()}
        onSaveRecipe={vi.fn()}
        availableFoods={sampleFoods}
      />
    );

    // Adiciona ingrediente
    const selectFood = screen.getByLabelText(/Selecionar Ingrediente/i);
    fireEvent.change(selectFood, { target: { value: 'feijao_preto' } });

    const addIngBtn = screen.getByRole('button', { name: /^Adicionar$/i });
    fireEvent.click(addIngBtn);

    expect(screen.getAllByText(/Feijão Preto Cozido/i).length).toBeGreaterThanOrEqual(2);

    // Clica no botão de remover
    const removeBtn = screen.getByRole('button', { name: /Remover Feijão Preto Cozido/i });
    fireEvent.click(removeBtn);

    // O botão de remover o ingrediente não deve mais existir na lista de adicionados
    expect(screen.queryByRole('button', { name: /Remover Feijão Preto Cozido/i })).not.toBeInTheDocument();
    expect(screen.getByText(/Nenhum ingrediente adicionado ainda/i)).toBeInTheDocument();
  });

  it('deve manter a lista de ingredientes fixa, filtrar por busca e permitir selecionar card para adicionar', () => {
    render(
      <RecipeBuilderModal
        isOpen={true}
        onClose={vi.fn()}
        onSaveRecipe={vi.fn()}
        availableFoods={sampleFoods}
      />
    );

    // Lista fixa visível
    expect(screen.getByText(/Ingredientes Disponíveis/i)).toBeInTheDocument();

    // Filtra por termo de busca
    const searchInput = screen.getByPlaceholderText(/Buscar ingrediente por nome/i);
    fireEvent.change(searchInput, { target: { value: 'whey growth' } });

    // Resultados filtrados
    expect(screen.getByText(/Resultados da busca/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Whey Protein Concentrado 80% \(Growth\)/i).length).toBeGreaterThanOrEqual(1);

    // Clica em Selecionar
    const selectBtn = screen.getByRole('button', { name: /Selecionar Whey Protein Concentrado 80% \(Growth\)/i });
    fireEvent.click(selectBtn);

    // Ingrediente selecionado passa a estar visível no painel de lançamento com botão Adicionar
    const addBtn = screen.getByRole('button', { name: /^Adicionar$/i });
    fireEvent.click(addBtn);

    // Agora o whey está na lista de adicionados
    expect(screen.getByRole('button', { name: /Remover Whey Protein Concentrado 80% \(Growth\)/i })).toBeInTheDocument();
  });

  it('deve carregar dados para edição quando editingRecipe for fornecido', () => {
    const existingRecipe: RecipeInput = {
      id: 'recipe_bolo_cappuccino',
      name: 'Bolo Cappuccino Whey',
      servings: 4,
      servingUnitName: 'fatia',
      ingredients: [
        { foodId: 'whey_growth_30g', gramsOrUnits: 60 },
        { foodId: 'claras_pasteurizadas', gramsOrUnits: 150 },
      ],
    };

    render(
      <RecipeBuilderModal
        isOpen={true}
        onClose={vi.fn()}
        onSaveRecipe={vi.fn()}
        availableFoods={sampleFoods}
        editingRecipe={existingRecipe}
      />
    );

    expect(screen.getByText(/Editar Receita/i)).toBeInTheDocument();
    expect(screen.getByDisplayValue('Bolo Cappuccino Whey')).toBeInTheDocument();
    expect(screen.getByDisplayValue('4')).toBeInTheDocument();
    expect(screen.getByDisplayValue('fatia')).toBeInTheDocument();
    expect(screen.getAllByText(/Whey Protein Concentrado 80%/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Clara de Ovo Pasteurizada/i).length).toBeGreaterThanOrEqual(1);
  });
});
