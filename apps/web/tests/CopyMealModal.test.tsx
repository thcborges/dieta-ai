import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CopyMealModal } from '../src/components/CopyMealModal.js';
import { type MealMap } from '../src/components/MealBuilder.js';

describe('CopyMealModal (Cópia de Refeições entre Dias e Janelas com Edição de Itens)', () => {
  const mockCurrentMeals: MealMap = {
    breakfast: [
      { id: 'item_1', foodId: 'ovos_inteiros', name: 'Ovos Inteiros', grams: 100, calories: 143, protein: 13, carbs: 1, fat: 10, fiber: 0 },
      { id: 'item_2', foodId: 'pao_integral', name: 'Pão Integral', grams: 50, calories: 120, protein: 5, carbs: 22, fat: 1.5, fiber: 3 },
    ],
    lunch: [
      { id: 'item_3', foodId: 'sassami', name: 'Filé de Sassami', grams: 150, calories: 247, protein: 46.5, carbs: 0, fat: 5.4, fiber: 0 },
      { id: 'item_4', foodId: 'arroz_branco', name: 'Arroz Branco', grams: 100, calories: 130, protein: 2.5, carbs: 28, fat: 0.3, fiber: 0.4 },
    ],
    afternoon_snack: [],
    dinner_event: [],
  };

  const mockYesterdayMeals: MealMap = {
    breakfast: [],
    lunch: [
      { id: 'yest_1', foodId: 'sassami', name: 'Filé de Sassami Ontem', grams: 200, calories: 330, protein: 62, carbs: 0, fat: 7.2, fiber: 0 },
      { id: 'yest_2', foodId: 'feijao_preto', name: 'Feijão Preto Ontem', grams: 100, calories: 91, protein: 6, carbs: 14, fat: 0.5, fiber: 8.5 },
    ],
    afternoon_snack: [],
    dinner_event: [],
  };

  it('não deve renderizar quando isOpen for false', () => {
    render(
      <CopyMealModal
        isOpen={false}
        initialSourceWindow="breakfast"
        currentDate="2026-10-17"
        meals={mockCurrentMeals}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
      />
    );

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('deve renderizar o diálogo com seletores de data, origem, destino e resumo dos itens', () => {
    render(
      <CopyMealModal
        isOpen={true}
        initialSourceWindow="breakfast"
        currentDate="2026-10-17"
        meals={mockCurrentMeals}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
      />
    );

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText(/Copiar Refeição/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Data de Origem/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Refeição de Origem/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Refeição de Destino/i)).toBeInTheDocument();

    // Deve exibir itens do café da manhã
    expect(screen.getByText('Ovos Inteiros')).toBeInTheDocument();
    expect(screen.getByText('Pão Integral')).toBeInTheDocument();
  });

  it('deve permitir ajustar a porção (gramas) de um item e recalcular macros proporcionalmente', () => {
    render(
      <CopyMealModal
        isOpen={true}
        initialSourceWindow="breakfast"
        currentDate="2026-10-17"
        meals={mockCurrentMeals}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
      />
    );

    const eggsGramsInput = screen.getByLabelText(/Porção de Ovos Inteiros/i);
    // Dobra a porção de 100g para 200g
    fireEvent.change(eggsGramsInput, { target: { value: '200' } });

    // Calorias devem ter dobrado (143 * 2 = 286 kcal)
    expect(screen.getByText(/286 kcal/i)).toBeInTheDocument();
    // Proteína deve ter dobrado (13 * 2 = 26g)
    expect(screen.getByText(/26(\.0)?g P/i)).toBeInTheDocument();
  });

  it('deve permitir remover um item da lista de cópia e atualizar totais', () => {
    render(
      <CopyMealModal
        isOpen={true}
        initialSourceWindow="breakfast"
        currentDate="2026-10-17"
        meals={mockCurrentMeals}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
      />
    );

    expect(screen.getByText('Pão Integral')).toBeInTheDocument();

    const removeBreadBtn = screen.getByLabelText(/Remover Pão Integral da cópia/i);
    fireEvent.click(removeBreadBtn);

    // Pão Integral não deve mais constar
    expect(screen.queryByText('Pão Integral')).not.toBeInTheDocument();
    // Ovos Inteiros ainda deve constar
    expect(screen.getByText('Ovos Inteiros')).toBeInTheDocument();
  });

  it('deve permitir selecionar outro dia (ex: ontem) e carregar os alimentos daquele dia', async () => {
    const onLoadMealsForDate = vi.fn().mockResolvedValue(mockYesterdayMeals);

    render(
      <CopyMealModal
        isOpen={true}
        initialSourceWindow="lunch"
        currentDate="2026-10-17"
        meals={mockCurrentMeals}
        onLoadMealsForDate={onLoadMealsForDate}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
      />
    );

    // Clica no botão rápido "Ontem"
    const yesterdayBtn = screen.getByRole('button', { name: /Ontem/i });
    fireEvent.click(yesterdayBtn);

    await waitFor(() => {
      expect(onLoadMealsForDate).toHaveBeenCalledWith('2026-10-16');
    });

    // Deve exibir os itens do almoço de ontem
    expect(await screen.findByText('Filé de Sassami Ontem')).toBeInTheDocument();
    expect(screen.getByText('Feijão Preto Ontem')).toBeInTheDocument();
  });

  it('deve exibir mensagem e desabilitar botão quando a refeição selecionada estiver vazia', () => {
    render(
      <CopyMealModal
        isOpen={true}
        initialSourceWindow="afternoon_snack" // Lanche da tarde está vazio
        currentDate="2026-10-17"
        meals={mockCurrentMeals}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
      />
    );

    expect(
      screen.getByText(/Nenhum alimento registrado nesta refeição para a data selecionada/i)
    ).toBeInTheDocument();

    const confirmBtn = screen.getByRole('button', { name: /Confirmar Cópia/i });
    expect(confirmBtn).toBeDisabled();
  });

  it('deve chamar onConfirm com o destino e os itens customizados ao clicar em Confirmar Cópia', () => {
    const onConfirm = vi.fn();
    const onClose = vi.fn();

    render(
      <CopyMealModal
        isOpen={true}
        initialSourceWindow="breakfast"
        currentDate="2026-10-17"
        meals={mockCurrentMeals}
        onClose={onClose}
        onConfirm={onConfirm}
      />
    );

    // Altera o destino para "Jantar / Evento"
    const targetSelect = screen.getByLabelText(/Refeição de Destino/i);
    fireEvent.change(targetSelect, { target: { value: 'dinner_event' } });

    // Remove o pão integral
    const removeBreadBtn = screen.getByLabelText(/Remover Pão Integral da cópia/i);
    fireEvent.click(removeBreadBtn);

    // Ajusta ovos para 150g
    const eggsGramsInput = screen.getByLabelText(/Porção de Ovos Inteiros/i);
    fireEvent.change(eggsGramsInput, { target: { value: '150' } });

    const confirmBtn = screen.getByRole('button', { name: /Confirmar Cópia/i });
    fireEvent.click(confirmBtn);

    expect(onConfirm).toHaveBeenCalledTimes(1);
    const [targetWindow, copiedItems] = onConfirm.mock.calls[0];
    expect(targetWindow).toBe('dinner_event');
    expect(copiedItems).toHaveLength(1);
    expect(copiedItems[0].name).toBe('Ovos Inteiros');
    expect(copiedItems[0].grams).toBe(150);
    // 143 * 1.5 = 214.5 -> ~215 kcal
    expect(copiedItems[0].calories).toBe(215);
    expect(onClose).toHaveBeenCalled();
  });

  it('deve atualizar a lista de itens quando o usuário altera a refeição de origem', () => {
    render(
      <CopyMealModal
        isOpen={true}
        initialSourceWindow="breakfast"
        currentDate="2026-10-17"
        meals={mockCurrentMeals}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
      />
    );

    expect(screen.getByText('Ovos Inteiros')).toBeInTheDocument();

    const sourceSelect = screen.getByLabelText(/Refeição de Origem/i);
    fireEvent.change(sourceSelect, { target: { value: 'lunch' } });

    expect(screen.getByText('Filé de Sassami')).toBeInTheDocument();
    expect(screen.getByText('Arroz Branco')).toBeInTheDocument();
    expect(screen.queryByText('Ovos Inteiros')).not.toBeInTheDocument();
  });

  it('deve zerar macros e porção quando o input de gramas for limpo ou zerado', () => {
    render(
      <CopyMealModal
        isOpen={true}
        initialSourceWindow="breakfast"
        currentDate="2026-10-17"
        meals={mockCurrentMeals}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
      />
    );

    const eggsGramsInput = screen.getByLabelText(/Porção de Ovos Inteiros/i);
    fireEvent.change(eggsGramsInput, { target: { value: '' } });

    expect(screen.getByText(/0 kcal • 0g P • 0g C • 0g G/i)).toBeInTheDocument();
  });

  it('deve permitir carregar refeições ao digitar uma data customizada', async () => {
    const onLoadMealsForDate = vi.fn().mockResolvedValue(mockYesterdayMeals);

    render(
      <CopyMealModal
        isOpen={true}
        initialSourceWindow="lunch"
        currentDate="2026-10-17"
        meals={mockCurrentMeals}
        onLoadMealsForDate={onLoadMealsForDate}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
      />
    );

    const dateInput = screen.getByLabelText(/Data de Origem/i);
    fireEvent.change(dateInput, { target: { value: '2026-10-10' } });

    await waitFor(() => {
      expect(onLoadMealsForDate).toHaveBeenCalledWith('2026-10-10');
    });

    expect(await screen.findByText('Filé de Sassami Ontem')).toBeInTheDocument();
  });
});
