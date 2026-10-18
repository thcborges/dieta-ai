import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import App from '../src/App.js';

describe('Regressão de Isolamento por Data do Diário Alimentar', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('deve manter o diário vazio ao trocar para uma data sem refeições e NÃO copiar refeições do dia anterior', async () => {
    localStorage.setItem(
      'macrometrics_auth_user',
      JSON.stringify({
        id: 'usr_date_isolation',
        email: 'isolation@example.com',
        name: 'Usuário Teste Isolamento',
      })
    );

    render(<App />);

    // 1. Confirma que o seletor de data está presente
    const datePicker = screen.getByLabelText(/Data do Diário/i) as HTMLInputElement;
    const initialDate = datePicker.value;
    expect(initialDate).toBeTruthy();

    // 2. Adiciona Feijão Preto ao Almoço no dia inicial
    const feijaoBtn = screen.getByRole('button', { name: /\+ Feijão/i });
    fireEvent.click(feijaoBtn);

    expect(screen.getByText('Feijão Preto Cozido', { selector: 'div.font-medium' })).toBeInTheDocument();

    // 3. Troca a data para o dia seguinte (que não possui refeições)
    const nextDate = '2026-10-25';
    fireEvent.change(datePicker, { target: { value: nextDate } });

    // 4. REGRESSÃO CRÍTICA: As refeições do dia anterior NÃO podem aparecer no novo dia!
    expect(screen.queryByText('Feijão Preto Cozido', { selector: 'div.font-medium' })).not.toBeInTheDocument();
    expect(screen.getAllByText(/Nenhum alimento lançado nesta janela/i)).toHaveLength(4);

    // 5. O storage do novo dia NÃO deve conter os alimentos do dia anterior
    const nextDaySaved = localStorage.getItem(`macrometrics_meals_usr_date_isolation_${nextDate}`);
    if (nextDaySaved) {
      const parsed = JSON.parse(nextDaySaved);
      const hasAnyItem = Object.values(parsed).some((arr: unknown) => Array.isArray(arr) && arr.length > 0);
      expect(hasAnyItem).toBe(false);
    }

    // 6. Ao retornar para o dia inicial, as refeições lançadas originalmente continuam presentes
    fireEvent.change(datePicker, { target: { value: initialDate } });
    expect(screen.getByText('Feijão Preto Cozido', { selector: 'div.font-medium' })).toBeInTheDocument();
  });

  it('deve carregar as refeições corretas de cada dia quando alternando entre datas com refeições distintas', async () => {
    localStorage.setItem(
      'macrometrics_auth_user',
      JSON.stringify({
        id: 'usr_date_switching',
        email: 'switching@example.com',
        name: 'Usuário Switching',
      })
    );

    render(<App />);

    const datePicker = screen.getByLabelText(/Data do Diário/i) as HTMLInputElement;
    const date1 = '2026-10-20';
    const date2 = '2026-10-21';

    // Seleciona data 1 e adiciona Feijão ao Almoço
    fireEvent.change(datePicker, { target: { value: date1 } });
    const feijaoBtn = screen.getByRole('button', { name: /\+ Feijão/i });
    fireEvent.click(feijaoBtn);
    expect(screen.getByText('Feijão Preto Cozido', { selector: 'div.font-medium' })).toBeInTheDocument();

    // Troca para data 2 (deve estar vazio) e adiciona Ovo ao Café
    fireEvent.change(datePicker, { target: { value: date2 } });
    expect(screen.queryByText('Feijão Preto Cozido', { selector: 'div.font-medium' })).not.toBeInTheDocument();

    const ovoBtn = screen.getAllByRole('button', { name: /\+ Ovo\b/i })[0]!;
    fireEvent.click(ovoBtn);
    expect(screen.getByText(/Ovo de Galinha Inteiro Cozido\/Mexido/i, { selector: 'div.font-medium' })).toBeInTheDocument();
    expect(screen.queryByText('Feijão Preto Cozido', { selector: 'div.font-medium' })).not.toBeInTheDocument();

    // Volta para data 1: deve ter Feijão, mas NÃO Ovo
    fireEvent.change(datePicker, { target: { value: date1 } });
    expect(screen.getByText('Feijão Preto Cozido', { selector: 'div.font-medium' })).toBeInTheDocument();
    expect(screen.queryByText(/Ovo de Galinha Inteiro Cozido\/Mexido/i, { selector: 'div.font-medium' })).not.toBeInTheDocument();

    // Volta para data 2: deve ter Ovo, mas NÃO Feijão
    fireEvent.change(datePicker, { target: { value: date2 } });
    expect(screen.getByText(/Ovo de Galinha Inteiro Cozido\/Mexido/i, { selector: 'div.font-medium' })).toBeInTheDocument();
    expect(screen.queryByText('Feijão Preto Cozido', { selector: 'div.font-medium' })).not.toBeInTheDocument();
  });

  it('não deve disparar PUT na API com as refeições do dia anterior para a nova data selecionada', async () => {
    const putBodies: Array<{ url: string; body: unknown }> = [];
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(async (url, init) => {
      const urlStr = url.toString();
      if (init?.method === 'PUT') {
        putBodies.push({
          url: urlStr,
          body: init.body ? JSON.parse(init.body as string) : null,
        });
        return new Response(JSON.stringify({ success: true }), { status: 200 });
      }
      return new Response(JSON.stringify({ ok: true, meals: {} }), { status: 200 });
    });

    localStorage.setItem(
      'macrometrics_auth_user',
      JSON.stringify({
        id: 'usr_no_pollute',
        email: 'nopollute@example.com',
        name: 'Usuário Sem Poluição',
      })
    );

    render(<App />);

    const datePicker = screen.getByLabelText(/Data do Diário/i) as HTMLInputElement;
    const initialDate = '2026-10-18';
    fireEvent.change(datePicker, { target: { value: initialDate } });

    // Adiciona Feijão no dia inicial
    const feijaoBtn = screen.getByRole('button', { name: /\+ Feijão/i });
    fireEvent.click(feijaoBtn);

    // Limpa registros de PUT até o momento
    putBodies.length = 0;

    // Muda a data para outro dia
    const targetDate = '2026-10-19';
    fireEvent.change(datePicker, { target: { value: targetDate } });

    // Aguarda possíveis microtasks/efeitos
    await waitFor(() => {
      // Nenhum PUT para a nova data pode conter refeições do almoço
      const putForTarget = putBodies.filter(p => p.url.includes(`/api/v1/diaries/${targetDate}`));
      for (const req of putForTarget) {
        const meals = (req.body as any)?.meals;
        if (meals) {
          const hasLunch = meals.lunch && meals.lunch.length > 0;
          expect(hasLunch).toBe(false);
        }
      }
    });

    fetchSpy.mockRestore();
  });
});
