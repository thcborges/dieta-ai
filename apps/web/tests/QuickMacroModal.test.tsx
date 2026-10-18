import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QuickMacroModal } from '../src/components/QuickMacroModal.js';

describe('QuickMacroModal (Lançamento Rápido de Macros Totais da Refeição)', () => {
  it('não deve renderizar quando isOpen for false', () => {
    render(
      <QuickMacroModal
        isOpen={false}
        windowKey="lunch"
        onClose={vi.fn()}
        onSave={vi.fn()}
      />
    );

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('deve renderizar os campos do formulário quando isOpen for true', () => {
    render(
      <QuickMacroModal
        isOpen={true}
        windowKey="lunch"
        onClose={vi.fn()}
        onSave={vi.fn()}
      />
    );

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText(/Lançamento Rápido de Macros/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Descrição \/ Nome da Refeição/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Calorias \(kcal\)/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Proteínas \(g\)/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Carboidratos \(g\)/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Gorduras \(g\)/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Fibras \(g\)/i)).toBeInTheDocument();
  });

  it('deve permitir preencher os macros diretamente e salvar na refeição', () => {
    const onSave = vi.fn();
    const onClose = vi.fn();

    render(
      <QuickMacroModal
        isOpen={true}
        windowKey="lunch"
        onClose={onClose}
        onSave={onSave}
      />
    );

    fireEvent.change(screen.getByLabelText(/Descrição \/ Nome da Refeição/i), {
      target: { value: 'Prato Executivo Gemini' },
    });
    fireEvent.change(screen.getByLabelText(/Calorias \(kcal\)/i), {
      target: { value: '550' },
    });
    fireEvent.change(screen.getByLabelText(/Proteínas \(g\)/i), {
      target: { value: '45' },
    });
    fireEvent.change(screen.getByLabelText(/Carboidratos \(g\)/i), {
      target: { value: '50' },
    });
    fireEvent.change(screen.getByLabelText(/Gorduras \(g\)/i), {
      target: { value: '18' },
    });
    fireEvent.change(screen.getByLabelText(/Fibras \(g\)/i), {
      target: { value: '6' },
    });

    const submitBtn = screen.getByRole('button', { name: /Lançar na Refeição/i });
    fireEvent.click(submitBtn);

    expect(onSave).toHaveBeenCalledTimes(1);
    const savedItem = onSave.mock.calls[0][0];
    expect(savedItem.name).toBe('Prato Executivo Gemini');
    expect(savedItem.calories).toBe(550);
    expect(savedItem.protein).toBe(45);
    expect(savedItem.carbs).toBe(50);
    expect(savedItem.fat).toBe(18);
    expect(savedItem.fiber).toBe(6);
    expect(onClose).toHaveBeenCalled();
  });

  it('deve usar o nome padrão "Lançamento Rápido" se a descrição for deixada em branco', () => {
    const onSave = vi.fn();

    render(
      <QuickMacroModal
        isOpen={true}
        windowKey="dinner_event"
        onClose={vi.fn()}
        onSave={onSave}
      />
    );

    fireEvent.change(screen.getByLabelText(/Calorias \(kcal\)/i), {
      target: { value: '400' },
    });
    fireEvent.change(screen.getByLabelText(/Proteínas \(g\)/i), {
      target: { value: '35' },
    });

    const submitBtn = screen.getByRole('button', { name: /Lançar na Refeição/i });
    fireEvent.click(submitBtn);

    expect(onSave).toHaveBeenCalledTimes(1);
    const savedItem = onSave.mock.calls[0][0];
    expect(savedItem.name).toBe('Lançamento Rápido');
    expect(savedItem.calories).toBe(400);
    expect(savedItem.protein).toBe(35);
  });

  it('deve calcular automaticamente as calorias pelos macros se o campo de calorias estiver vazio', () => {
    const onSave = vi.fn();

    render(
      <QuickMacroModal
        isOpen={true}
        windowKey="lunch"
        onClose={vi.fn()}
        onSave={onSave}
      />
    );

    // Proteína 30g (120 kcal) + Carbs 40g (160 kcal) + Gordura 10g (90 kcal) = 370 kcal
    fireEvent.change(screen.getByLabelText(/Proteínas \(g\)/i), {
      target: { value: '30' },
    });
    fireEvent.change(screen.getByLabelText(/Carboidratos \(g\)/i), {
      target: { value: '40' },
    });
    fireEvent.change(screen.getByLabelText(/Gorduras \(g\)/i), {
      target: { value: '10' },
    });

    const submitBtn = screen.getByRole('button', { name: /Lançar na Refeição/i });
    fireEvent.click(submitBtn);

    expect(onSave).toHaveBeenCalledTimes(1);
    const savedItem = onSave.mock.calls[0][0];
    expect(savedItem.calories).toBe(370);
  });

  it('deve permitir calcular calorias explicitamente via botão de sugestão', () => {
    render(
      <QuickMacroModal
        isOpen={true}
        windowKey="breakfast"
        onClose={vi.fn()}
        onSave={vi.fn()}
      />
    );

    fireEvent.change(screen.getByLabelText(/Proteínas \(g\)/i), {
      target: { value: '25' },
    });
    fireEvent.change(screen.getByLabelText(/Carboidratos \(g\)/i), {
      target: { value: '20' },
    });
    fireEvent.change(screen.getByLabelText(/Gorduras \(g\)/i), {
      target: { value: '5' },
    });

    const calcBtn = screen.getByRole('button', { name: /Calcular Calorias pelos Macros/i });
    expect(calcBtn).toBeInTheDocument();
    fireEvent.click(calcBtn);

    const caloriesInput = screen.getByLabelText(/Calorias \(kcal\)/i) as HTMLInputElement;
    // 25*4 + 20*4 + 5*9 = 100 + 80 + 45 = 225
    expect(caloriesInput.value).toBe('225');
  });

  it('deve chamar onClose ao clicar em Cancelar', () => {
    const onClose = vi.fn();

    render(
      <QuickMacroModal
        isOpen={true}
        windowKey="lunch"
        onClose={onClose}
        onSave={vi.fn()}
      />
    );

    const cancelBtn = screen.getByRole('button', { name: /Cancelar/i });
    fireEvent.click(cancelBtn);

    expect(onClose).toHaveBeenCalled();
  });

  it('não deve salvar se calorias e todos os macros forem zero ou vazios', () => {
    const onSave = vi.fn();

    render(
      <QuickMacroModal
        isOpen={true}
        windowKey="lunch"
        onClose={vi.fn()}
        onSave={onSave}
      />
    );

    const submitBtn = screen.getByRole('button', { name: /Lançar na Refeição/i });
    fireEvent.click(submitBtn);

    expect(onSave).not.toHaveBeenCalled();
    expect(screen.getByText(/Informe ao menos as calorias ou um macronutriente válido/i)).toBeInTheDocument();
  });
});
