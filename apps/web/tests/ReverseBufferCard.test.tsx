import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ReverseBufferCard } from '../src/components/ReverseBufferCard.js';
import type { MacroBudget } from '@dieta-ai/core';

describe('ReverseBufferCard (Módulo 2: Simulador de Buffer Reverso)', () => {
  const dailyTarget: MacroBudget = {
    calories: 2400,
    proteinGrams: 220,
    carbGrams: 200,
    fatGrams: 80,
  };

  it('deve permitir selecionar o preset de Noite da Pizza e calcular orçamento restante', () => {
    const onEventChange = vi.fn();

    render(
      <ReverseBufferCard
        dailyTarget={dailyTarget}
        activeEvent={null}
        onSelectEvent={onEventChange}
      />
    );

    expect(screen.getByText(/Buffer de Evento Social/i)).toBeInTheDocument();
    const pizzaButton = screen.getByRole('button', { name: /Noite da Pizza/i });
    expect(pizzaButton).toBeInTheDocument();

    fireEvent.click(pizzaButton);
    expect(onEventChange).toHaveBeenCalled();
  });

  it('deve exibir indicador de Densidade Proteica Exigida quando houver evento alocado', () => {
    const onSelectEvent = vi.fn();
    const event = {
      name: 'Noite da Pizza (3-4 Fatias)',
      calories: 1100,
      proteinGrams: 38,
      carbGrams: 120,
      fatGrams: 52,
    };

    render(
      <ReverseBufferCard
        dailyTarget={dailyTarget}
        activeEvent={event}
        onSelectEvent={onSelectEvent}
      />
    );

    // Orçamento limpo restante: 2400 - 1100 = 1300 kcal, 220 - 38 = 182g proteína
    // Densidade exigida = (182 / 1300) * 100 = 14.0 g/100 kcal
    expect(screen.getByText(/Densidade Proteica Exigida/i)).toBeInTheDocument();
    expect(screen.getAllByText(/14.0/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Orçamento Limpo Restante/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/1300/i).length).toBeGreaterThan(0);
  });
});
