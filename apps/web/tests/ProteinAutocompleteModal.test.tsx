import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { ProteinAutocompleteModal } from '../src/components/ProteinAutocompleteModal.js';

describe('ProteinAutocompleteModal (Auto-Completar Proteína Interativo)', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    missingProtein: 48,
    remainingCalories: 300,
    activeWindow: 'dinner_event' as const,
    onConfirm: vi.fn(),
  };

  it('não deve renderizar nada quando isOpen for false', () => {
    const { container } = render(<ProteinAutocompleteModal {...defaultProps} isOpen={false} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('deve renderizar a lista de fontes de proteína e os valores iniciais', () => {
    render(<ProteinAutocompleteModal {...defaultProps} />);

    expect(screen.getByText(/Auto-Completar Proteína/i)).toBeInTheDocument();
    expect(screen.getByText(/Filé de Sassami Desfiado/i)).toBeInTheDocument();
    expect(screen.getByText(/Whey Protein Concentrado \(Growth\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Claras de Ovo Pasteurizadas/i)).toBeInTheDocument();

    // Deve exibir o quanto falta inicialmente (48g)
    expect(screen.getByText(/Faltam 48(\.0)?g/i)).toBeInTheDocument();
  });

  it('deve atualizar em tempo real quanto falta para atingir o necessário ao digitar gramas', () => {
    render(<ProteinAutocompleteModal {...defaultProps} />);

    // Sassami tem 31g P por 100g
    const sassamiInput = screen.getByLabelText(/Gramas de Filé de Sassami Desfiado/i);
    fireEvent.change(sassamiInput, { target: { value: '100' } });

    // Faltavam 48g, adicionou 31g -> faltam 17g
    expect(screen.getByText(/Faltam 17(\.0)?g/i)).toBeInTheDocument();
    expect(screen.getAllByText(/31(\.0)?g/i).length).toBeGreaterThan(0);
  });

  it('deve permitir combinar múltiplas fontes e indicar quando a meta foi atingida ou superada', () => {
    render(<ProteinAutocompleteModal {...defaultProps} />);

    // 100g Sassami = 31g P
    const sassamiInput = screen.getByLabelText(/Gramas de Filé de Sassami Desfiado/i);
    fireEvent.change(sassamiInput, { target: { value: '100' } });

    // 30g Whey = 24g P -> Total = 55g P (supera em 7g)
    const wheyInput = screen.getByLabelText(/Gramas de Whey Protein Concentrado \(Growth\)/i);
    fireEvent.change(wheyInput, { target: { value: '30' } });

    expect(screen.getByText(/Meta superada em \+7(\.0)?g/i)).toBeInTheDocument();
  });

  it('deve alertar quando as calorias das proteínas escolhidas ultrapassarem as calorias restantes', () => {
    // Restam apenas 100 kcal
    render(<ProteinAutocompleteModal {...defaultProps} remainingCalories={100} />);

    const sassamiInput = screen.getByLabelText(/Gramas de Filé de Sassami Desfiado/i);
    fireEvent.change(sassamiInput, { target: { value: '200' } }); // 330 kcal

    expect(screen.getByText(/ultrapassará o orçamento calórico/i)).toBeInTheDocument();
  });

  it('deve ter botão de atalho para completar o restante exato com um clique', () => {
    render(<ProteinAutocompleteModal {...defaultProps} missingProtein={31} />);

    // Clica no botão de completar restante para Sassami (31g P necessária -> 100g)
    const completeBtns = screen.getAllByRole('button', { name: /Completar restante/i });
    expect(completeBtns.length).toBeGreaterThan(0);
    fireEvent.click(completeBtns[0]!);

    const sassamiInput = screen.getByLabelText(/Gramas de Filé de Sassami Desfiado/i) as HTMLInputElement;
    expect(Number(sassamiInput.value)).toBe(100);
    expect(screen.getByText(/Meta atingida com perfeição/i)).toBeInTheDocument();
  });

  it('deve confirmar a seleção e chamar onConfirm com os alimentos e a janela escolhida', () => {
    const onConfirm = vi.fn();
    render(<ProteinAutocompleteModal {...defaultProps} onConfirm={onConfirm} />);

    const sassamiInput = screen.getByLabelText(/Gramas de Filé de Sassami Desfiado/i);
    fireEvent.change(sassamiInput, { target: { value: '150' } });

    const confirmBtn = screen.getByRole('button', { name: /Lançar no Diário/i });
    expect(confirmBtn).not.toBeDisabled();
    fireEvent.click(confirmBtn);

    expect(onConfirm).toHaveBeenCalled();
    const [items, targetWindow] = onConfirm.mock.calls[0];
    expect(targetWindow).toBe('dinner_event');
    expect(items.length).toBe(1);
    expect(items[0].name).toContain('Filé de Sassami Desfiado');
    expect(items[0].grams).toBe(150);
  });

  it('deve fechar o modal ao clicar no botão fechar ou cancelar', () => {
    const onClose = vi.fn();
    render(<ProteinAutocompleteModal {...defaultProps} onClose={onClose} />);

    const cancelBtn = screen.getByRole('button', { name: /Cancelar/i });
    fireEvent.click(cancelBtn);
    expect(onClose).toHaveBeenCalled();
  });
});
