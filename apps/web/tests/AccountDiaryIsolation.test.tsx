import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import App from '../src/App.js';

describe('Isolamento de Diário de Refeições por Conta de Usuário (Regressão Bug)', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('deve vincular o diário estritamente à conta e impedir que o usuário B veja refeições do usuário A', async () => {
    // 1. Simula login do Usuário A
    localStorage.setItem(
      'macrometrics_auth_user',
      JSON.stringify({
        id: 'usr_user_A',
        email: 'userA@example.com',
        name: 'Usuário A',
      })
    );

    const { unmount } = render(<App />);

    // 2. Diário do Usuário A deve iniciar vazio (sem alimentos pré-cadastrados vazados)
    expect(screen.getAllByText(/Nenhum alimento lançado nesta janela/i)).toHaveLength(4);
    expect(screen.queryByTitle(/Remover Item/i)).not.toBeInTheDocument();
    expect(screen.queryByText('Ovo de Galinha Inteiro', { selector: 'div.font-medium' })).not.toBeInTheDocument();
    expect(screen.queryByText('Filé de Sassami Desfiado Cozido', { selector: 'div.font-medium' })).not.toBeInTheDocument();

    // 3. Usuário A adiciona Feijão Preto ao Almoço via chip de atalho
    const feijaoChip = screen.getByRole('button', { name: /\+ Feijão/i });
    fireEvent.click(feijaoChip);

    // Feijão deve estar visível no diário do Usuário A
    expect(screen.getByText('Feijão Preto Cozido', { selector: 'div.font-medium' })).toBeInTheDocument();
    expect(screen.getAllByTitle(/Remover Item/i)).toHaveLength(1);

    // 4. Usuário A faz logout
    const logoutBtn = screen.getByRole('button', { name: /Sair/i });
    fireEvent.click(logoutBtn);

    // Deve voltar para a tela de login e o diário não deve estar na tela
    expect(screen.getByRole('button', { name: /Entrar com Google/i })).toBeInTheDocument();
    expect(screen.queryByText('Feijão Preto Cozido', { selector: 'div.font-medium' })).not.toBeInTheDocument();

    unmount();

    // 5. Usuário B faz login com outra conta
    localStorage.setItem(
      'macrometrics_auth_user',
      JSON.stringify({
        id: 'usr_user_B',
        email: 'userB@example.com',
        name: 'Usuário B',
      })
    );

    const { unmount: unmountB } = render(<App />);

    // REGRESSÃO CRÍTICA: Usuário B NÃO PODE ver os alimentos cadastrados pelo Usuário A!
    expect(screen.queryByText('Feijão Preto Cozido', { selector: 'div.font-medium' })).not.toBeInTheDocument();
    expect(screen.queryByTitle(/Remover Item/i)).not.toBeInTheDocument();
    expect(screen.getAllByText(/Nenhum alimento lançado nesta janela/i)).toHaveLength(4);

    // 6. Usuário B adiciona Ovos ao Café da Manhã via chip
    const ovosChip = screen.getAllByRole('button', { name: /\+ Ovo\b/i })[0]!;
    fireEvent.click(ovosChip);

    expect(screen.getByText(/Ovo de Galinha Inteiro Cozido\/Mexido/i, { selector: 'div.font-medium' })).toBeInTheDocument();
    expect(screen.queryByText('Feijão Preto Cozido', { selector: 'div.font-medium' })).not.toBeInTheDocument();

    // 7. Usuário B faz logout
    const logoutBtnB = screen.getByRole('button', { name: /Sair/i });
    fireEvent.click(logoutBtnB);

    unmountB();

    // 8. Usuário A faz login novamente
    localStorage.setItem(
      'macrometrics_auth_user',
      JSON.stringify({
        id: 'usr_user_A',
        email: 'userA@example.com',
        name: 'Usuário A',
      })
    );

    render(<App />);

    // Usuário A deve ver apenas seus próprios alimentos (Feijão) e NÃO os do Usuário B (Ovos)
    expect(screen.getByText('Feijão Preto Cozido', { selector: 'div.font-medium' })).toBeInTheDocument();
    expect(screen.queryByText(/Ovo de Galinha Inteiro Cozido\/Mexido/i, { selector: 'div.font-medium' })).not.toBeInTheDocument();
  });

  it('deve sincronizar com a API /api/v1/diary isolada por conta do usuário', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(async (url, init) => {
      const urlStr = url.toString();
      if (urlStr.includes('/api/v1/diary')) {
        const headers = (init?.headers as Record<string, string>) || {};
        const userId = headers['x-user-id'];

        if (init?.method === 'PUT') {
          return new Response(JSON.stringify({ success: true }), { status: 200 });
        }

        if (userId === 'usr_user_online') {
          return new Response(
            JSON.stringify({
              meals: {
                breakfast: [],
                lunch: [
                  {
                    id: 'online_1',
                    foodId: 'sassami',
                    name: 'Filé de Sassami Desfiado Cozido',
                    grams: 150,
                    calories: 247.5,
                    protein: 46.5,
                    carbs: 0,
                    fat: 5.4,
                    fiber: 0,
                  },
                ],
                afternoon_snack: [],
                dinner_event: [],
              },
            }),
            { status: 200 }
          );
        }
      }

      return new Response(JSON.stringify({}), { status: 200 });
    });

    localStorage.setItem(
      'macrometrics_auth_user',
      JSON.stringify({
        id: 'usr_user_online',
        email: 'online@example.com',
        name: 'Usuário Online',
      })
    );

    render(<App />);

    // Aguarda sincronização do diário do usuário online vindo da API
    await waitFor(() => {
      expect(screen.getByText('Filé de Sassami Desfiado Cozido', { selector: 'div.font-medium' })).toBeInTheDocument();
    });

    fetchSpy.mockRestore();
  });
});
