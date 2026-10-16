import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MealBuilder } from '../src/components/MealBuilder.js';

describe('MealBuilder (Módulo 3: Construtor de Refeições & Cronometer UX)', () => {
  const mockMeals = {
    breakfast: [
      { id: '1', foodId: 'ovos_inteiros', name: 'Ovos Inteiros', grams: 100, calories: 143, protein: 13, carbs: 1, fat: 10, fiber: 0 },
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
    expect(calledArgs[1].fiber).toBe(8.5);
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

  it('deve priorizar itens mais comuns no select para a refeição selecionada e atualizar ao trocar a janela', () => {
    render(
      <MealBuilder
        meals={mockMeals}
        onAddFood={vi.fn()}
        onRemoveFood={vi.fn()}
        onCopyMeal={vi.fn()}
        onAutoCompleteProtein={vi.fn()}
        missingProtein={20}
        remainingCalories={400}
      />
    );

    // No almoço (padrão inicial), grupo de comuns deve conter Sassami e Feijão
    const select = screen.getByLabelText(/Alimento Selecionado/i);
    expect(select).toBeInTheDocument();
    expect(screen.getByRole('group', { name: /Mais Comuns para Almoço/i })).toBeInTheDocument();

    // Troca a janela para Café da Manhã
    const windowSelect = screen.getByLabelText(/Janela de Refeição/i);
    fireEvent.change(windowSelect, { target: { value: 'breakfast' } });

    // Grupo de comuns deve atualizar para Café da Manhã
    expect(screen.getByRole('group', { name: /Mais Comuns para Café da Manhã/i })).toBeInTheDocument();
  });

  it('deve permitir consultar alimento no banco de dados local primeiro', () => {
    render(
      <MealBuilder
        meals={mockMeals}
        onAddFood={vi.fn()}
        onRemoveFood={vi.fn()}
        onCopyMeal={vi.fn()}
        onAutoCompleteProtein={vi.fn()}
        missingProtein={20}
        remainingCalories={400}
      />
    );

    const searchInput = screen.getByPlaceholderText(/Consultar alimento ou código de barras/i);
    fireEvent.change(searchInput, { target: { value: 'Feijão' } });

    const searchBtn = screen.getByRole('button', { name: /Consultar/i });
    fireEvent.click(searchBtn);

    expect(screen.getByText(/Alimento encontrado no banco local/i)).toBeInTheDocument();
    const select = screen.getByLabelText(/Alimento Selecionado/i) as HTMLSelectElement;
    expect(select.value).toBe('feijao_preto');
  });

  it('deve consultar Open Food Facts se não encontrado localmente e salvar no banco', async () => {
    const onRegisterFood = vi.fn();
    const mockOFFResult = {
      source: 'open_food_facts',
      foods: [
        {
          id: 'off_7894000400040',
          name: 'Iogurte Grego Frutas Vermelhas',
          servingDescription: '120g',
          servingSizeGrams: 120,
          caloriesPer100g: 85,
          proteinPer100g: 7.5,
          carbsPer100g: 10,
          fatPer100g: 2,
          fiberPer100g: 1,
        },
      ],
    };

    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify(mockOFFResult), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    render(
      <MealBuilder
        meals={mockMeals}
        onAddFood={vi.fn()}
        onRemoveFood={vi.fn()}
        onCopyMeal={vi.fn()}
        onAutoCompleteProtein={vi.fn()}
        onRegisterFood={onRegisterFood}
        missingProtein={20}
        remainingCalories={400}
      />
    );

    const searchInput = screen.getByPlaceholderText(/Consultar alimento ou código de barras/i);
    fireEvent.change(searchInput, { target: { value: 'Iogurte Grego Frutas' } });

    const searchBtn = screen.getByRole('button', { name: /Consultar/i });
    fireEvent.click(searchBtn);

    // Aguarda resolução da busca na API/Open Food Facts
    expect(await screen.findByText(/Alimento encontrado e salvo no banco de dados/i)).toBeInTheDocument();
    expect(onRegisterFood).toHaveBeenCalled();
    const registered = onRegisterFood.mock.calls[0][0];
    expect(registered.name).toBe('Iogurte Grego Frutas Vermelhas');

    fetchSpy.mockRestore();
  });

  it('deve abrir o modal de cadastro de novo alimento e adicionar à lista de opções', () => {
    const onRegisterFood = vi.fn();
    const onAddFood = vi.fn();

    render(
      <MealBuilder
        meals={mockMeals}
        onAddFood={onAddFood}
        onRemoveFood={vi.fn()}
        onCopyMeal={vi.fn()}
        onAutoCompleteProtein={vi.fn()}
        onRegisterFood={onRegisterFood}
        missingProtein={20}
        remainingCalories={400}
      />
    );

    const newFoodBtn = screen.getByRole('button', { name: /\+ Novo Alimento/i });
    fireEvent.click(newFoodBtn);

    expect(screen.getByText(/Cadastrar Novo Alimento/i)).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/Nome do Alimento/i), { target: { value: 'Tilápia Grelhada' } });
    fireEvent.change(screen.getByLabelText(/Porção Padrão \(g\)/i), { target: { value: '150' } });
    fireEvent.change(screen.getByLabelText(/Calorias \(100g\)/i), { target: { value: '128' } });
    fireEvent.change(screen.getByLabelText(/Proteínas \(100g\)/i), { target: { value: '26' } });
    fireEvent.change(screen.getByLabelText(/Carboidratos \(100g\)/i), { target: { value: '0' } });
    fireEvent.change(screen.getByLabelText(/Gorduras \(100g\)/i), { target: { value: '2.5' } });
    fireEvent.change(screen.getByLabelText(/Fibras \(100g\)/i), { target: { value: '0' } });

    const saveBtn = screen.getByRole('button', { name: /Salvar Alimento/i });
    fireEvent.click(saveBtn);

    expect(onRegisterFood).toHaveBeenCalled();
    const saved = onRegisterFood.mock.calls[0][0];
    expect(saved.name).toBe('Tilápia Grelhada');

    // Alimento cadastrado deve estar selecionado no dropdown
    const select = screen.getByLabelText(/Alimento Selecionado/i) as HTMLSelectElement;
    expect(select.value).toBe(saved.id);

    // Clicar em Lançar adiciona o novo alimento à refeição
    const launchBtn = screen.getByRole('button', { name: /Lançar/i });
    fireEvent.click(launchBtn);

    expect(onAddFood).toHaveBeenCalled();
    const foodLaunched = onAddFood.mock.calls[0][1];
    expect(foodLaunched.name).toBe('Tilápia Grelhada');
    expect(foodLaunched.protein).toBeGreaterThan(0);
  });

  it('deve abrir modal de scanner de código de barras/QR code ao clicar no botão de scanner', () => {
    render(
      <MealBuilder
        meals={mockMeals}
        onAddFood={vi.fn()}
        onRemoveFood={vi.fn()}
        onCopyMeal={vi.fn()}
        onAutoCompleteProtein={vi.fn()}
        missingProtein={20}
        remainingCalories={400}
      />
    );

    const scanBtn = screen.getByRole('button', { name: /Escanear Código/i });
    expect(scanBtn).toBeInTheDocument();
    fireEvent.click(scanBtn);

    expect(screen.getByText(/Leitor de Código de Barras \/ QR Code/i)).toBeInTheDocument();
  });

  it('deve processar código escaneado consultando o banco e selecionando alimento', async () => {
    render(
      <MealBuilder
        meals={mockMeals}
        availableFoods={[
          {
            id: 'prod_com_barcode',
            name: 'Queijo Cottage Proteico',
            servingDescription: '100g',
            servingSizeGrams: 100,
            caloriesPer100g: 72,
            proteinPer100g: 12,
            carbsPer100g: 3,
            fatPer100g: 0.5,
            fiberPer100g: 0,
            isCustom: true,
          },
        ]}
        onAddFood={vi.fn()}
        onRemoveFood={vi.fn()}
        onCopyMeal={vi.fn()}
        onAutoCompleteProtein={vi.fn()}
        missingProtein={20}
        remainingCalories={400}
      />
    );

    const scanBtn = screen.getByRole('button', { name: /Escanear Código/i });
    fireEvent.click(scanBtn);

    // Usa o fallback de digitação/validação do scanner
    const barcodeInput = screen.getByPlaceholderText(/Digite ou cole o código/i);
    fireEvent.change(barcodeInput, { target: { value: 'prod_com_barcode' } });

    const validateBtn = screen.getByRole('button', { name: /Validar Código/i });
    fireEvent.click(validateBtn);

    expect(await screen.findByText(/Alimento encontrado no banco local/i)).toBeInTheDocument();
  });
});


