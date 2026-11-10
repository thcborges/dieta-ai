import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import App from '../src/App.js';

describe('BDD: Date Navigation and History Discovery Suite', () => {
  const mockUser = {
    id: 'usr_nav_test',
    email: 'nav@example.com',
    name: 'Nav Test User',
    sessionToken: 'test-session-token',
  };

  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();

    localStorage.setItem('macrometrics_auth_user', JSON.stringify(mockUser));

    // Mock global fetch
    global.fetch = vi.fn((input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : input.toString();

      if (url.includes('/api/v1/diaries/dates')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ dates: ['2026-11-08', '2026-11-01'], count: 2 }),
        } as Response);
      }

      if (url.includes('/api/v1/diaries/history')) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              history: [
                { date: '2026-11-02', calories: 2000, proteinGrams: 160 },
                { date: '2026-11-03', calories: 2100, proteinGrams: 170 },
                { date: '2026-11-04', calories: 1950, proteinGrams: 155 },
                { date: '2026-11-05', calories: 2050, proteinGrams: 165 },
                { date: '2026-11-06', calories: 2200, proteinGrams: 180 },
                { date: '2026-11-07', calories: 1900, proteinGrams: 150 },
                { date: '2026-11-08', calories: 2300, proteinGrams: 190 },
              ],
              days: 7,
              endDate: '2026-11-08',
            }),
        } as Response);
      }

      if (url.includes('/api/v1/diaries/2026-11-08')) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              date: '2026-11-08',
              meals: {
                breakfast: [],
                lunch: [
                  {
                    id: 'lunch_item_1',
                    foodId: 'sassami',
                    name: 'Sassami Grelhado',
                    grams: 200,
                    calories: 220,
                    protein: 46,
                    carbs: 0,
                    fat: 4,
                    fiber: 0,
                  },
                ],
                afternoon_snack: [],
                dinner_event: [],
              },
              totals: { calories: 220, protein: 46, carbs: 0, fat: 4, fiber: 0 },
            }),
        } as Response);
      }

      if (url.includes('/api/v1/diaries/')) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              date: '2026-11-10',
              meals: { breakfast: [], lunch: [], afternoon_snack: [], dinner_event: [] },
              totals: { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 },
            }),
        } as Response);
      }

      if (url.includes('/api/v1/users/me/goals')) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              calories: 2200,
              proteinGrams: 180,
              carbGrams: 200,
              fatGrams: 70,
              fiberGrams: 35,
              weightKg: 95,
              dailyDeficitKcal: 500,
            }),
        } as Response);
      }

      if (url.includes('/api/v1/foods')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ foods: [] }),
        } as Response);
      }

      if (url.includes('/api/v1/recipes')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ recipes: [] }),
        } as Response);
      }

      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({}),
      } as Response);
    });
  });

  it('deve exibir botões de navegação rápida de data: Dia Anterior, Hoje e Próximo Dia', async () => {
    render(<App />);

    const prevBtn = await screen.findByRole('button', { name: /Dia Anterior/i });
    const todayBtn = await screen.findByRole('button', { name: /Hoje/i });
    const nextBtn = await screen.findByRole('button', { name: /Próximo Dia/i });

    expect(prevBtn).toBeInTheDocument();
    expect(todayBtn).toBeInTheDocument();
    expect(nextBtn).toBeInTheDocument();
  });

  it('deve decrementar e incrementar o dia ao clicar nos botões de navegação', async () => {
    render(<App />);

    const datePicker = (await screen.findByLabelText(/Data do Diário/i)) as HTMLInputElement;
    const initialDate = datePicker.value;

    const prevBtn = screen.getByRole('button', { name: /Dia Anterior/i });
    fireEvent.click(prevBtn);

    // O valor do input deve ter mudado para a data anterior
    expect(datePicker.value).not.toBe(initialDate);

    const todayBtn = screen.getByRole('button', { name: /Hoje/i });
    fireEvent.click(todayBtn);
    expect(datePicker.value).toBe(initialDate);

    const nextBtn = screen.getByRole('button', { name: /Próximo Dia/i });
    fireEvent.click(nextBtn);
    expect(datePicker.value).not.toBe(initialDate);
  });

  it('deve buscar datas com registros e permitir saltar para o último dia gravado', async () => {
    render(<App />);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/diaries/dates'),
        expect.anything()
      );
    });

    // Deve exibir atalho ou badge informando a data mais recente com dados (ex.: 08/11/2026)
    const quickJumpBtn = await screen.findByRole('button', { name: /08\/11/i });
    expect(quickJumpBtn).toBeInTheDocument();

    fireEvent.click(quickJumpBtn);

    const datePicker = screen.getByLabelText(/Data do Diário/i) as HTMLInputElement;
    expect(datePicker.value).toBe('2026-11-08');

    // Deve carregar o alimento salvo de 08/11/2026
    await waitFor(() => {
      expect(screen.getByText('Sassami Grelhado', { selector: 'div.font-medium' })).toBeInTheDocument();
    });
  });
});
