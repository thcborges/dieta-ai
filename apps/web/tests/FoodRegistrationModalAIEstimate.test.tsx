import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { FoodRegistrationModal } from '../src/components/FoodRegistrationModal.js';

describe('FoodRegistrationModal - Estimativa Nutricional via IA (Gemini)', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('deve renderizar botão para estimar macros com IA', () => {
    render(
      <FoodRegistrationModal
        isOpen={true}
        onClose={vi.fn()}
        onSave={vi.fn()}
      />
    );

    const aiButton = screen.getByRole('button', { name: /Estimar com IA/i });
    expect(aiButton).toBeInTheDocument();
  });

  it('deve alertar se o usuário tentar estimar sem digitar o nome do alimento', () => {
    render(
      <FoodRegistrationModal
        isOpen={true}
        onClose={vi.fn()}
        onSave={vi.fn()}
      />
    );

    const aiButton = screen.getByRole('button', { name: /Estimar com IA/i });
    fireEvent.click(aiButton);

    expect(
      screen.getByText(/Informe o nome do alimento antes de solicitar a estimativa por IA/i)
    ).toBeInTheDocument();
  });

  it('deve chamar a API de estimativa e preencher automaticamente os campos de macronutrientes e porção', async () => {
    const mockEstimateResponse = {
      foodName: 'Salmão Grelhado',
      servingSizeGrams: 120,
      caloriesPer100g: 206,
      proteinPer100g: 22.1,
      carbsPer100g: 0,
      fatPer100g: 12.3,
      fiberPer100g: 0,
      confidence: 'high',
      sourceNote: 'Tabela TACO/USDA',
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockEstimateResponse,
    }) as any;

    const onSave = vi.fn();

    render(
      <FoodRegistrationModal
        isOpen={true}
        onClose={vi.fn()}
        onSave={onSave}
      />
    );

    const nameInput = screen.getByLabelText(/Nome do Alimento/i);
    fireEvent.change(nameInput, { target: { value: 'Salmão Grelhado' } });

    const aiButton = screen.getByRole('button', { name: /Estimar com IA/i });
    fireEvent.click(aiButton);

    // Deve exibir estado de carregamento
    expect(screen.getByText(/Estimando macros com IA/i)).toBeInTheDocument();

    await waitFor(() => {
      const proteinInput = screen.getByLabelText(/Proteínas \(100g\)/i) as HTMLInputElement;
      expect(proteinInput.value).toBe('22.1');
    });

    const carbsInput = screen.getByLabelText(/Carboidratos \(100g\)/i) as HTMLInputElement;
    const fatInput = screen.getByLabelText(/Gorduras \(100g\)/i) as HTMLInputElement;
    const caloriesInput = screen.getByLabelText(/Calorias \(100g\)/i) as HTMLInputElement;
    const servingInput = screen.getByLabelText(/Porção Padrão \(g\)/i) as HTMLInputElement;

    expect(carbsInput.value).toBe('0');
    expect(fatInput.value).toBe('12.3');
    expect(caloriesInput.value).toBe('206');
    expect(servingInput.value).toBe('120');

    // Usuário pode salvar o alimento com as estimativas preenchidas
    const saveBtn = screen.getByRole('button', { name: /Salvar Alimento/i });
    fireEvent.click(saveBtn);

    expect(onSave).toHaveBeenCalledTimes(1);
    const savedFood = onSave.mock.calls[0][0];
    expect(savedFood.name).toBe('Salmão Grelhado');
    expect(savedFood.proteinPer100g).toBe(22.1);
    expect(savedFood.caloriesPer100g).toBe(206);
    expect(savedFood.servingSizeGrams).toBe(120);
  });
});
