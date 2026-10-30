import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { MealBuilder } from '../src/components/MealBuilder.js';
import { PREPOPULATED_FOODS, type FoodItem } from '@dieta-ai/core';

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

  it('deve abrir o modal de Auto-Completar Proteína quando clicado e permitir lançar alimentos no diário', () => {
    const onAutoComplete = vi.fn();
    const onAddFood = vi.fn();

    render(
      <MealBuilder
        meals={mockMeals}
        onAddFood={onAddFood}
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

    // O modal deve ser aberto exibindo o diálogo, lista de proteínas e quanto falta
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText(/Faltam 48(\.0)?g/i)).toBeInTheDocument();

    // Usuário informa quanto vai consumir de Sassami
    const sassamiInput = screen.getByLabelText(/Gramas de Filé de Sassami Desfiado/i);
    fireEvent.change(sassamiInput, { target: { value: '150' } });

    // Clica em lançar no diário
    const confirmBtn = screen.getByRole('button', { name: /Lançar no Diário/i });
    fireEvent.click(confirmBtn);

    expect(onAddFood).toHaveBeenCalled();
    const [, addedFood] = onAddFood.mock.calls[0];
    expect(addedFood.name).toContain('Filé de Sassami Desfiado');
    expect(addedFood.grams).toBe(150);
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

  it('deve exibir mensagem de erro quando busca remota retornar lista vazia de alimentos', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify({ foods: [] }), {
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
        missingProtein={20}
        remainingCalories={400}
      />
    );

    const searchInput = screen.getByPlaceholderText(/Consultar alimento ou código de barras/i);
    fireEvent.change(searchInput, { target: { value: 'Comida Inexistente' } });

    const searchBtn = screen.getByRole('button', { name: /Consultar/i });
    fireEvent.click(searchBtn);

    expect(
      await screen.findByText(/Alimento não encontrado no banco de dados nem no Open Food Facts/i)
    ).toBeInTheDocument();

    fetchSpy.mockRestore();
  });

  it('deve exibir lista de opções ao consultar "whey" e permitir selecionar Whey Black Skull para lançamento', async () => {
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

    const searchInput = screen.getByPlaceholderText(/Consultar alimento ou código de barras/i);
    fireEvent.change(searchInput, { target: { value: 'whey' } });

    const searchBtn = screen.getByRole('button', { name: /Consultar/i });
    fireEvent.click(searchBtn);

    // Deve exibir o painel com múltiplos resultados de whey
    const resultsContainer = await screen.findByTestId('search-results-list');
    expect(resultsContainer).toBeInTheDocument();
    expect(within(resultsContainer).getByText(/Whey Protein Concentrado 80% \(Growth\)/i)).toBeInTheDocument();
    expect(within(resultsContainer).getByText(/Whey Protein 100% HD \(Black Skull\)/i)).toBeInTheDocument();

    // Usuário clica para selecionar o Whey Black Skull
    const selectBlackSkullBtn = screen.getByRole('button', { name: /Selecionar Whey Protein 100% HD \(Black Skull\)/i });
    fireEvent.click(selectBlackSkullBtn);

    // Deve atualizar o seletor principal e porção recomendada
    const select = screen.getByLabelText(/Alimento Selecionado/i) as HTMLSelectElement;
    expect(select.value).toBe('whey_black_skull');

    // Lança o alimento selecionado
    const launchBtn = screen.getByRole('button', { name: /^Lançar$/i });
    fireEvent.click(launchBtn);

    expect(onAddFood).toHaveBeenCalled();
    const calledFood = onAddFood.mock.calls[0][1];
    expect(calledFood.foodId).toBe('whey_black_skull');
    expect(calledFood.name).toContain('Black Skull');
  });

  it('deve permitir buscar e escolher "whey growth" em tempo real', async () => {
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

    const searchInput = screen.getByPlaceholderText(/Consultar alimento ou código de barras/i);
    // Digita "whey growth" - busca reativa em tempo real
    fireEvent.change(searchInput, { target: { value: 'whey growth' } });

    const resultsContainer = await screen.findByTestId('search-results-list');
    expect(resultsContainer).toBeInTheDocument();
    expect(within(resultsContainer).getByText(/Whey Protein Concentrado 80% \(Growth\)/i)).toBeInTheDocument();
    expect(within(resultsContainer).getByText(/Whey Protein Isolado 90% \(Growth\)/i)).toBeInTheDocument();
    // Não deve conter Black Skull pois a busca foi específica para Growth
    expect(within(resultsContainer).queryByText(/Black Skull/i)).not.toBeInTheDocument();

    // Seleciona o isolado da Growth
    const selectIsoladoBtn = screen.getByRole('button', { name: /Selecionar Whey Protein Isolado 90% \(Growth\)/i });
    fireEvent.click(selectIsoladoBtn);

    const select = screen.getByLabelText(/Alimento Selecionado/i) as HTMLSelectElement;
    expect(select.value).toBe('whey_growth_isolado');
  });

  it('deve permitir escolher "whey blackskulll" mesmo com erro de digitação ou sem espaço', async () => {
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

    const searchInput = screen.getByPlaceholderText(/Consultar alimento ou código de barras/i);
    // Digita com repetição de letras e sem espaço: "whey blackskulll"
    fireEvent.change(searchInput, { target: { value: 'whey blackskulll' } });

    const resultsContainer = await screen.findByTestId('search-results-list');
    expect(resultsContainer).toBeInTheDocument();
    expect(within(resultsContainer).getByText(/Whey Protein 100% HD \(Black Skull\)/i)).toBeInTheDocument();

    // Lança diretamente com 1 clique
    const directLaunchBtn = screen.getByRole('button', { name: /Lançar Whey Protein 100% HD \(Black Skull\)/i });
    fireEvent.click(directLaunchBtn);

    expect(onAddFood).toHaveBeenCalled();
    const calledFood = onAddFood.mock.calls[0][1];
    expect(calledFood.foodId).toBe('whey_black_skull');
    expect(calledFood.name).toContain('Black Skull');
  });

  it('deve exibir lista de cortes ao consultar "frango" e permitir lançar diretamente Sobrecoxa Assada ou Peito Grelhado', async () => {
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

    const searchInput = screen.getByPlaceholderText(/Consultar alimento ou código de barras/i);
    fireEvent.change(searchInput, { target: { value: 'frango' } });

    const searchBtn = screen.getByRole('button', { name: /Consultar/i });
    fireEvent.click(searchBtn);

    // Deve exibir resultados contendo Peito Grelhado e Sobrecoxa Assada
    const resultsContainer = await screen.findByTestId('search-results-list');
    expect(resultsContainer).toBeInTheDocument();
    expect(within(resultsContainer).getByText(/Peito de Frango Grelhado/i)).toBeInTheDocument();
    expect(within(resultsContainer).getByText(/Sobrecoxa de Frango Assada sem Pele/i)).toBeInTheDocument();

    // Usuário usa o botão de lançamento direto do card da Sobrecoxa
    const directLaunchBtn = screen.getByRole('button', { name: /Lançar Sobrecoxa de Frango Assada sem Pele/i });
    fireEvent.click(directLaunchBtn);

    expect(onAddFood).toHaveBeenCalled();
    const calledFood = onAddFood.mock.calls[0][1];
    expect(calledFood.foodId).toBe('sobrecoxa_frango_assada');
    expect(calledFood.name).toContain('Sobrecoxa de Frango Assada');
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

  describe('Comportamento de Input Numérico de Porção (Regressão & UX Cronometer)', () => {
    it('deve permitir limpar completamente o input de porção sem forçar automaticamente o valor 1', () => {
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

      const servingInput = screen.getByLabelText(/Porção \(Gramas\)/i) as HTMLInputElement;
      expect(servingInput.value).not.toBe('');

      // Limpa todo o input
      fireEvent.change(servingInput, { target: { value: '' } });

      // O input deve ficar em branco e NÃO colocar 1 automaticamente
      expect(servingInput.value).toBe('');
    });

    it('deve deixar o campo de porção em branco imediatamente após lançar um alimento', () => {
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

      const servingInput = screen.getByLabelText(/Porção \(Gramas\)/i) as HTMLInputElement;
      fireEvent.change(servingInput, { target: { value: '150' } });
      expect(servingInput.value).toBe('150');

      const launchBtn = screen.getByRole('button', { name: /Lançar/i });
      fireEvent.click(launchBtn);

      expect(onAddFood).toHaveBeenCalled();
      // Conforme requisito: por padrão esse campo deveria ficar em branco assim que eu lançar o alimento
      expect(servingInput.value).toBe('');
    });

    it('não deve lançar alimento se a porção estiver em branco ou zerada', () => {
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

      const servingInput = screen.getByLabelText(/Porção \(Gramas\)/i) as HTMLInputElement;
      fireEvent.change(servingInput, { target: { value: '' } });

      const launchBtn = screen.getByRole('button', { name: /Lançar/i });
      fireEvent.click(launchBtn);

      expect(onAddFood).not.toHaveBeenCalled();
    });

    it('deve atualizar o alimento selecionado e a porção padrão ao alterar o select', () => {
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

      const select = screen.getByLabelText(/Alimento Selecionado/i) as HTMLSelectElement;
      fireEvent.change(select, { target: { value: 'whey_growth_30g' } });

      expect(select.value).toBe('whey_growth_30g');
      const servingInput = screen.getByLabelText(/Porção \(Gramas\)/i) as HTMLInputElement;
      expect(servingInput.value).toBe('30');
    });

    it('deve abrir o modal de cadastro ao clicar em Cadastrar agora no erro de busca', async () => {
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
      fireEvent.change(searchInput, { target: { value: 'InexistenteXYZ123' } });

      const searchBtn = screen.getByRole('button', { name: /Consultar/i });
      fireEvent.click(searchBtn);

      const registerLink = await screen.findByRole('button', { name: /Cadastrar agora/i });
      expect(registerLink).toBeInTheDocument();
      fireEvent.click(registerLink);

      expect(screen.getByText(/Cadastrar Novo Alimento/i)).toBeInTheDocument();
    });

    it('deve exibir botão de raio ao lado do botão de copiar e abrir o modal de Lançamento Rápido de Macros', () => {
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

      const quickMacroBtns = screen.getAllByTitle(/Lançamento Rápido de Macros/i);
      expect(quickMacroBtns.length).toBe(4);

      // Clica no botão de raio do almoço
      fireEvent.click(quickMacroBtns[1]!);

      // Modal de macros rápidos aberto
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText(/Lançamento Rápido de Macros/i)).toBeInTheDocument();

      fireEvent.change(screen.getByLabelText(/Descrição \/ Nome da Refeição/i), {
        target: { value: 'Prato Gemini Foto' },
      });
      fireEvent.change(screen.getByLabelText(/Calorias \(kcal\)/i), {
        target: { value: '520' },
      });
      fireEvent.change(screen.getByLabelText(/Proteínas \(g\)/i), {
        target: { value: '45' },
      });

      const submitBtn = screen.getByRole('button', { name: /Lançar na Refeição/i });
      fireEvent.click(submitBtn);

      expect(onAddFood).toHaveBeenCalledWith(
        'lunch',
        expect.objectContaining({
          name: 'Prato Gemini Foto',
          calories: 520,
          protein: 45,
        })
      );
    });

    it('deve permitir copiar refeição com controle de porção e remoção de itens via CopyMealModal', () => {
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

      // Clica em copiar café da manhã
      const copyButtons = screen.getAllByTitle(/Copiar Refeição/i);
      fireEvent.click(copyButtons[0]!);

      // Modal de cópia com resumo de itens
      const modal = screen.getByRole('dialog');
      expect(modal).toBeInTheDocument();
      expect(within(modal).getByText(/Ovos Inteiros/i)).toBeInTheDocument();

      // Ajusta porção de ovos de 100g para 150g
      const eggsInput = screen.getByLabelText(/Porção de Ovos Inteiros/i);
      fireEvent.change(eggsInput, { target: { value: '150' } });

      const confirmBtn = screen.getByRole('button', { name: /Confirmar Cópia/i });
      fireEvent.click(confirmBtn);

      expect(onCopyMeal).toHaveBeenCalledWith(
        'breakfast',
        expect.any(String),
        expect.arrayContaining([
          expect.objectContaining({
            name: 'Ovos Inteiros',
            grams: 150,
          }),
        ])
      );
    });

    it('deve abrir o modal de gerenciamento de receitas ao clicar no botão Receitas', () => {
      render(
        <MealBuilder
          meals={mockMeals}
          onAddFood={vi.fn()}
          onRemoveFood={vi.fn()}
          onCopyMeal={vi.fn()}
          onAutoCompleteProtein={vi.fn()}
          missingProtein={20}
          remainingCalories={400}
          recipes={[
            {
              id: 'recipe_bolo',
              name: 'Bolo de Cenoura Fit',
              servings: 6,
              ingredients: [{ foodId: 'sassami', gramsOrUnits: 200 }],
            },
          ]}
        />
      );

      const recipesBtn = screen.getByRole('button', { name: /Minhas Receitas/i });
      expect(recipesBtn).toBeInTheDocument();
      expect(recipesBtn).toHaveTextContent('Receitas (1)');

      fireEvent.click(recipesBtn);
      expect(screen.getByText('Bolo de Cenoura Fit')).toBeInTheDocument();
      expect(screen.getByText(/6 porções/i)).toBeInTheDocument();
    });

    it('deve exibir o botão de lançamento por porção/fração quando o alimento selecionado for uma receita', () => {
      const sampleRecipeFood: FoodItem = {
        id: 'recipe_whey_bolo',
        name: 'Bolo de Whey Cappuccino',
        caloriesPer100g: 150,
        proteinPer100g: 20,
        carbsPer100g: 10,
        fatPer100g: 2,
        fiberPer100g: 1,
        isRecipe: true,
        recipeData: {
          id: 'recipe_whey_bolo',
          name: 'Bolo de Whey Cappuccino',
          servings: 4,
          servingUnitName: 'fatia',
          ingredients: [{ foodId: 'sassami', gramsOrUnits: 100 }],
        },
      };

      render(
        <MealBuilder
          meals={mockMeals}
          availableFoods={[sampleRecipeFood, ...PREPOPULATED_FOODS]}
          onAddFood={vi.fn()}
          onRemoveFood={vi.fn()}
          onCopyMeal={vi.fn()}
          onAutoCompleteProtein={vi.fn()}
          missingProtein={20}
          remainingCalories={400}
          recipes={[sampleRecipeFood.recipeData!]}
        />
      );

      // Seleciona a receita no select
      const foodSelect = screen.getByLabelText(/Alimento Selecionado/i);
      fireEvent.change(foodSelect, { target: { value: 'recipe_whey_bolo' } });

      // O botão de lançar por fração/porção (ícone ChefHat) deve aparecer
      const fractionLogBtn = screen.getByRole('button', { name: /Lançar por Fração \/ Porção/i });
      expect(fractionLogBtn).toBeInTheDocument();

      fireEvent.click(fractionLogBtn);
      // Deve abrir o LogRecipeModal
      expect(screen.getByText(/Lançar Receita no Diário/i)).toBeInTheDocument();
      expect(screen.getAllByText(/Bolo de Whey Cappuccino/i).length).toBeGreaterThanOrEqual(1);
    });
  });
});




