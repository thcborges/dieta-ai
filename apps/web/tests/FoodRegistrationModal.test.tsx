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
});
