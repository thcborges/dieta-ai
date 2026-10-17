import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { FoodRegistrationModal } from '../src/components/FoodRegistrationModal.js';

describe('FoodRegistrationModal (Cadastro Rápido de Alimentos M3)', () => {
  it('não deve renderizar quando isOpen for falso', () => {
    render(
      <FoodRegistrationModal
        isOpen={false}
        onClose={vi.fn()}
        onSave={vi.fn()}
      />
    );
    expect(screen.queryByText(/Cadastrar Novo Alimento/i)).not.toBeInTheDocument();
  });

  it('deve renderizar formulário quando isOpen for verdadeiro', () => {
    render(
      <FoodRegistrationModal
        isOpen={true}
        onClose={vi.fn()}
        onSave={vi.fn()}
      />
    );

    expect(screen.getByText(/Cadastrar Novo Alimento/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Nome do Alimento/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Porção Padrão \(g\)/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Calorias \(100g\)/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Proteínas \(100g\)/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Carboidratos \(100g\)/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Gorduras \(100g\)/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Fibras \(100g\)/i)).toBeInTheDocument();
  });

  it('deve validar nome obrigatório', () => {
    const onSave = vi.fn();
    render(
      <FoodRegistrationModal
        isOpen={true}
        onClose={vi.fn()}
        onSave={onSave}
      />
    );

    const form = screen.getByRole('button', { name: /Salvar Alimento/i }).closest('form')!;
    fireEvent.submit(form);

    expect(onSave).not.toHaveBeenCalled();
    expect(screen.getByText(/O nome do alimento é obrigatório/i)).toBeInTheDocument();
  });

  it('deve preencher os campos e salvar o alimento customizado com sucesso', () => {
    const onSave = vi.fn();
    const onClose = vi.fn();

    render(
      <FoodRegistrationModal
        isOpen={true}
        onClose={onClose}
        onSave={onSave}
      />
    );

    fireEvent.change(screen.getByLabelText(/Nome do Alimento/i), { target: { value: 'Pat针对 Moído' } });
    fireEvent.change(screen.getByLabelText(/Porção Padrão \(g\)/i), { target: { value: '100' } });
    fireEvent.change(screen.getByLabelText(/Calorias \(100g\)/i), { target: { value: '219' } });
    fireEvent.change(screen.getByLabelText(/Proteínas \(100g\)/i), { target: { value: '35.9' } });
    fireEvent.change(screen.getByLabelText(/Carboidratos \(100g\)/i), { target: { value: '0' } });
    fireEvent.change(screen.getByLabelText(/Gorduras \(100g\)/i), { target: { value: '7.3' } });
    fireEvent.change(screen.getByLabelText(/Fibras \(100g\)/i), { target: { value: '0' } });

    const submitBtn = screen.getByRole('button', { name: /Salvar Alimento/i });
    fireEvent.click(submitBtn);

    expect(onSave).toHaveBeenCalled();
    const saved = onSave.mock.calls[0][0];
    expect(saved.name).toBe('Pat针对 Moído');
    expect(saved.proteinPer100g).toBe(35.9);
    expect(saved.isCustom).toBe(true);
    expect(onClose).toHaveBeenCalled();
  });

  describe('Comportamento dos Inputs Numéricos e Cálculo Automático de Calorias', () => {
    it('deve posicionar o total de calorias como o último campo de macronutrientes', () => {
      render(
        <FoodRegistrationModal
          isOpen={true}
          onClose={vi.fn()}
          onSave={vi.fn()}
        />
      );

      const allInputs = screen.getAllByRole('spinbutton');
      // Inputs: Porção Padrão, Proteínas, Carboidratos, Gorduras, Fibras, Calorias
      const lastInput = allInputs[allInputs.length - 1] as HTMLInputElement;
      expect(lastInput).toHaveAttribute('id', 'food-calories');
    });

    it('deve permitir limpar campos de macronutrientes sem reinserir 0 ou resultar em 060', () => {
      render(
        <FoodRegistrationModal
          isOpen={true}
          onClose={vi.fn()}
          onSave={vi.fn()}
        />
      );

      const proteinInput = screen.getByLabelText(/Proteínas \(100g\)/i) as HTMLInputElement;
      // Ao limpar o campo
      fireEvent.change(proteinInput, { target: { value: '' } });
      expect(proteinInput.value).toBe('');

      // Ao digitar 60 no campo limpo
      fireEvent.change(proteinInput, { target: { value: '60' } });
      expect(proteinInput.value).toBe('60');
      expect(proteinInput.value).not.toBe('060');
    });

    it('deve calcular o total de calorias automaticamente ao preencher proteínas, carboidratos ou gorduras', () => {
      render(
        <FoodRegistrationModal
          isOpen={true}
          onClose={vi.fn()}
          onSave={vi.fn()}
        />
      );

      const proteinInput = screen.getByLabelText(/Proteínas \(100g\)/i);
      const carbsInput = screen.getByLabelText(/Carboidratos \(100g\)/i);
      const fatInput = screen.getByLabelText(/Gorduras \(100g\)/i);
      const caloriesInput = screen.getByLabelText(/Calorias \(100g\)/i) as HTMLInputElement;

      // 30g proteína (30 * 4 = 120 kcal)
      fireEvent.change(proteinInput, { target: { value: '30' } });
      expect(caloriesInput.value).toBe('120');

      // 10g carboidratos (120 + 10 * 4 = 160 kcal)
      fireEvent.change(carbsInput, { target: { value: '10' } });
      expect(caloriesInput.value).toBe('160');

      // 5g gorduras (160 + 5 * 9 = 205 kcal)
      fireEvent.change(fatInput, { target: { value: '5' } });
      expect(caloriesInput.value).toBe('205');
    });

    it('deve aceitar campos em branco como valor zero ao salvar alimento', () => {
      const onSave = vi.fn();
      render(
        <FoodRegistrationModal
          isOpen={true}
          onClose={vi.fn()}
          onSave={onSave}
        />
      );

      // Preenche apenas nome e proteína, deixando carboidratos, gorduras e fibras em branco
      fireEvent.change(screen.getByLabelText(/Nome do Alimento/i), { target: { value: 'Isolado de Soja' } });
      fireEvent.change(screen.getByLabelText(/Proteínas \(100g\)/i), { target: { value: '80' } });
      fireEvent.change(screen.getByLabelText(/Carboidratos \(100g\)/i), { target: { value: '' } });
      fireEvent.change(screen.getByLabelText(/Gorduras \(100g\)/i), { target: { value: '' } });
      fireEvent.change(screen.getByLabelText(/Fibras \(100g\)/i), { target: { value: '' } });

      const submitBtn = screen.getByRole('button', { name: /Salvar Alimento/i });
      fireEvent.click(submitBtn);

      expect(onSave).toHaveBeenCalled();
      const saved = onSave.mock.calls[0][0];
      expect(saved.name).toBe('Isolado de Soja');
      expect(saved.proteinPer100g).toBe(80);
      expect(saved.carbsPer100g).toBe(0);
      expect(saved.fatPer100g).toBe(0);
      expect(saved.fiberPer100g).toBe(0);
      expect(saved.caloriesPer100g).toBe(320); // 80 * 4 = 320 kcal
    });
  });
});

