import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PhotoMealModal } from '../src/components/PhotoMealModal.js';

describe('PhotoMealModal (Registro de Refeição por Foto com Vertex AI Gemini Flash)', () => {
  const defaultProps = {
    isOpen: true,
    windowKey: 'lunch' as const,
    onClose: vi.fn(),
    onAddFood: vi.fn(),
  };

  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('não deve renderizar quando isOpen for false', () => {
    render(<PhotoMealModal {...defaultProps} isOpen={false} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('deve renderizar a Etapa 1 com botão de envio de foto e campo de descrição opcional', () => {
    render(<PhotoMealModal {...defaultProps} />);

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText(/Foto da Refeição/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Descrição do Prato/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Analisar Foto/i })).toBeInTheDocument();
  });

  it('deve exibir mensagem de erro/alerta quando a IA não identificar alimentos na imagem', async () => {
    globalThis.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        isFoodIdentified: false,
        feedbackMessage: 'Nenhum alimento detectado na foto. Por favor, envie uma foto nítida do seu prato.',
        items: [],
      }),
    } as any);

    render(<PhotoMealModal {...defaultProps} />);

    const file = new File(['dummy-content'], 'prato.jpg', { type: 'image/jpeg' });
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;

    // Simula upload de arquivo
    fireEvent.change(input, { target: { files: [file] } });

    const analyzeBtn = screen.getByRole('button', { name: /Analisar Foto/i });
    fireEvent.click(analyzeBtn);

    await waitFor(() => {
      expect(
        screen.getByText(/Nenhum alimento detectado na foto/i)
      ).toBeInTheDocument();
    });
  });

  it('deve transicionar para Etapa 2 e listar itens identificados com porção e densidade per100g', async () => {
    globalThis.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        isFoodIdentified: true,
        feedbackMessage: 'Alimentos identificados com sucesso.',
        items: [
          {
            name: 'Filé de Frango Grelhado',
            estimatedGrams: 150,
            confidence: 'high',
            per100g: {
              calories: 160,
              protein: 32,
              carbs: 0,
              fat: 3,
              fiber: 0,
            },
          },
          {
            name: 'Arroz Branco',
            estimatedGrams: 100,
            confidence: 'high',
            per100g: {
              calories: 130,
              protein: 2.5,
              carbs: 28,
              fat: 0.3,
              fiber: 0.5,
            },
          },
        ],
      }),
    } as any);

    render(<PhotoMealModal {...defaultProps} />);

    const file = new File(['dummy-content'], 'prato.jpg', { type: 'image/jpeg' });
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;

    fireEvent.change(input, { target: { files: [file] } });
    fireEvent.click(screen.getByRole('button', { name: /Analisar Foto/i }));

    await waitFor(() => {
      expect(screen.getByText('Filé de Frango Grelhado')).toBeInTheDocument();
      expect(screen.getByText('Arroz Branco')).toBeInTheDocument();
    });

    // 150g de frango com 160kcal/100g = 240 kcal
    // 100g de arroz com 130kcal/100g = 130 kcal
    // Total = 370 kcal
    expect(screen.getByText(/370 kcal/i)).toBeInTheDocument();
  });

  it('deve selecionar todo o conteúdo do campo ao focar (onFocus select) e recalcular macros em tempo real ao editar gramatura', async () => {
    globalThis.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        isFoodIdentified: true,
        feedbackMessage: 'Sucesso',
        items: [
          {
            name: 'Patinho Moído Grelhado',
            estimatedGrams: 100,
            confidence: 'high',
            per100g: {
              calories: 200,
              protein: 30,
              carbs: 0,
              fat: 8,
              fiber: 0,
            },
          },
        ],
      }),
    } as any);

    render(<PhotoMealModal {...defaultProps} />);

    const file = new File(['dummy-content'], 'prato.jpg', { type: 'image/jpeg' });
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [file] } });
    fireEvent.click(screen.getByRole('button', { name: /Analisar Foto/i }));

    await waitFor(() => {
      expect(screen.getByText('Patinho Moído Grelhado')).toBeInTheDocument();
    });

    const portionInput = screen.getByLabelText(/Porção de Patinho Moído Grelhado/i) as HTMLInputElement;
    expect(portionInput.value).toBe('100');

    // Testa auto-select no foco
    const selectSpy = vi.spyOn(portionInput, 'select');
    fireEvent.focus(portionInput);
    expect(selectSpy).toHaveBeenCalled();

    // Altera porção para 200g (deve dobrar as calorias: de 200 para 400 kcal e proteínas de 30 para 60g)
    fireEvent.change(portionInput, { target: { value: '200' } });

    await waitFor(() => {
      expect(screen.getAllByText(/400 kcal/i).length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText(/60g P/i).length).toBeGreaterThanOrEqual(1);
    });
  });

  it('deve exibir clarificationNote quando a IA emitir alerta de incerteza no método de preparo', async () => {
    globalThis.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        isFoodIdentified: true,
        feedbackMessage: 'Alimentos com nota de esclarecimento',
        items: [
          {
            name: 'Ovo Mexido',
            estimatedGrams: 60,
            confidence: 'medium',
            clarificationNote: 'Possível uso de manteiga ou óleo no preparo. Gorduras estimadas podem variar.',
            per100g: {
              calories: 180,
              protein: 12,
              carbs: 1,
              fat: 14,
              fiber: 0,
            },
          },
        ],
      }),
    } as any);

    render(<PhotoMealModal {...defaultProps} />);

    const file = new File(['dummy-content'], 'prato.jpg', { type: 'image/jpeg' });
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [file] } });
    fireEvent.click(screen.getByRole('button', { name: /Analisar Foto/i }));

    await waitFor(() => {
      expect(screen.getByText(/Possível uso de manteiga ou óleo/i)).toBeInTheDocument();
    });
  });

  it('deve permitir remover um item antes da confirmação', async () => {
    globalThis.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        isFoodIdentified: true,
        feedbackMessage: 'Sucesso',
        items: [
          {
            name: 'Item 1 Frango',
            estimatedGrams: 100,
            confidence: 'high',
            per100g: { calories: 150, protein: 30, carbs: 0, fat: 3, fiber: 0 },
          },
          {
            name: 'Item 2 Salada',
            estimatedGrams: 80,
            confidence: 'high',
            per100g: { calories: 20, protein: 1, carbs: 4, fat: 0, fiber: 2 },
          },
        ],
      }),
    } as any);

    render(<PhotoMealModal {...defaultProps} />);

    const file = new File(['dummy-content'], 'prato.jpg', { type: 'image/jpeg' });
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [file] } });
    fireEvent.click(screen.getByRole('button', { name: /Analisar Foto/i }));

    await waitFor(() => {
      expect(screen.getByText('Item 1 Frango')).toBeInTheDocument();
      expect(screen.getByText('Item 2 Salada')).toBeInTheDocument();
    });

    const removeSaladaBtn = screen.getByLabelText(/Remover Item 2 Salada/i);
    fireEvent.click(removeSaladaBtn);

    expect(screen.queryByText('Item 2 Salada')).not.toBeInTheDocument();
    expect(screen.getByText('Item 1 Frango')).toBeInTheDocument();
  });

  it('deve lançar cada item restante individualmente na refeição ao clicar em Confirmar', async () => {
    const onAddFood = vi.fn();
    const onClose = vi.fn();

    globalThis.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        isFoodIdentified: true,
        feedbackMessage: 'Sucesso',
        items: [
          {
            name: 'Filé Mignon',
            estimatedGrams: 180,
            confidence: 'high',
            per100g: { calories: 200, protein: 30, carbs: 0, fat: 8, fiber: 0 },
          },
          {
            name: 'Batata Assada',
            estimatedGrams: 150,
            confidence: 'high',
            per100g: { calories: 90, protein: 2, carbs: 20, fat: 0.1, fiber: 2 },
          },
        ],
      }),
    } as any);

    render(<PhotoMealModal {...defaultProps} onAddFood={onAddFood} onClose={onClose} />);

    const file = new File(['dummy-content'], 'prato.jpg', { type: 'image/jpeg' });
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [file] } });
    fireEvent.click(screen.getByRole('button', { name: /Analisar Foto/i }));

    await waitFor(() => {
      expect(screen.getByText('Filé Mignon')).toBeInTheDocument();
    });

    const confirmBtn = screen.getByRole('button', { name: /Confirmar e Lançar na Refeição/i });
    fireEvent.click(confirmBtn);

    expect(onAddFood).toHaveBeenCalledTimes(2);
    expect(onAddFood).toHaveBeenCalledWith(
      'lunch',
      expect.objectContaining({
        name: 'Filé Mignon',
        grams: 180,
        calories: 360,
        protein: 54,
      })
    );
    expect(onAddFood).toHaveBeenCalledWith(
      'lunch',
      expect.objectContaining({
        name: 'Batata Assada',
        grams: 150,
        calories: 135,
        protein: 3,
      })
    );
    expect(onClose).toHaveBeenCalled();
  });
});
