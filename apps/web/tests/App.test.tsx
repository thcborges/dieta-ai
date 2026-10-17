import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import App from '../src/App.js';

describe('MacroMetrics Pro App (Fluxo de Autenticação, Controle de Macros & Lançamentos)', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('deve exibir a Página Principal de Login quando o usuário não estiver logado e bloquear lançamento de alimentos', () => {
    render(<App />);

    // Deve exibir página principal de login
    expect(screen.getByText(/Faça login com sua Conta Google para acessar o diário/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Entrar com Google/i })).toBeInTheDocument();

    // Lançamento de alimentos NÃO deve estar acessível sem login
    expect(screen.queryByText(/Lançamento Rápido de Alimentos/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Auto-Completar Proteína/i)).not.toBeInTheDocument();
  });

  it('deve permitir realizar o login com Google, acessando o dashboard e liberando lançamento de alimentos', async () => {
    render(<App />);

    const loginBtn = screen.getByRole('button', { name: /Entrar com Google/i });
    fireEvent.click(loginBtn);

    // Agora o dashboard está visível
    expect(await screen.findByText(/Buffer de Evento Social/i)).toBeInTheDocument();
    expect(screen.getByText(/MacroMetrics Pro/i)).toBeInTheDocument();
    expect(screen.getByText(/Auto-Completar Proteína/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Controlar Macros/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Sair/i })).toBeInTheDocument();
  });

  it('deve permitir ao usuário controlar seus macros e meta de fibras por idade no modal', () => {
    // Inicializa com usuário logado no storage
    localStorage.setItem(
      'macrometrics_auth_user',
      JSON.stringify({
        id: 'usr_thcborges',
        email: 'thcborges@example.com',
        name: 'Líder Técnico',
      })
    );

    render(<App />);

    const macrosBtn = screen.getByRole('button', { name: /Controlar Macros/i });
    fireEvent.click(macrosBtn);

    // Modal de controle de macros
    expect(screen.getByText(/Controle de Macronutrientes/i)).toBeInTheDocument();
    expect(screen.getByDisplayValue('38')).toBeInTheDocument(); // meta de fibras calculada para 40 anos

    const fiberInput = screen.getByLabelText(/Meta de Fibras/i);
    fireEvent.change(fiberInput, { target: { value: '42' } });

    const saveBtn = screen.getByRole('button', { name: /Salvar Metas/i });
    fireEvent.click(saveBtn);

    expect(screen.queryByText(/Controle de Macronutrientes/i)).not.toBeInTheDocument();
  });

  it('deve permitir abrir e fechar o modal de LGPD / Conta quando logado', () => {
    localStorage.setItem(
      'macrometrics_auth_user',
      JSON.stringify({
        id: 'usr_thcborges',
        email: 'thcborges@example.com',
        name: 'Líder Técnico',
      })
    );

    render(<App />);

    const accountBtn = screen.getByRole('button', { name: /Conta & LGPD/i });
    fireEvent.click(accountBtn);

    expect(screen.getByText(/Gerenciamento de Conta & LGPD/i)).toBeInTheDocument();

    const closeBtn = screen.getByRole('button', { name: /Fechar/i });
    fireEvent.click(closeBtn);

    expect(screen.queryByText(/Gerenciamento de Conta & LGPD/i)).not.toBeInTheDocument();
  });

  it('deve selecionar um evento de pizza, atualizar totais e permitir remover reserva', () => {
    localStorage.setItem(
      'macrometrics_auth_user',
      JSON.stringify({
        id: 'usr_thcborges',
        email: 'thcborges@example.com',
        name: 'Líder Técnico',
      })
    );

    render(<App />);

    const pizzaButton = screen.getByRole('button', { name: /Noite da Pizza/i });
    fireEvent.click(pizzaButton);

    expect(screen.getAllByText(/Densidade Proteica Exigida/i).length).toBeGreaterThan(0);

    const removeBufferBtn = screen.getByRole('button', { name: /Remover Reserva/i });
    fireEvent.click(removeBufferBtn);

    expect(screen.queryByText(/Densidade Proteica Exigida/i)).not.toBeInTheDocument();
  });

  it('deve executar o auto-completar proteína via modal e adicionar novo alimento no jantar', () => {
    localStorage.setItem(
      'macrometrics_auth_user',
      JSON.stringify({
        id: 'usr_thcborges',
        email: 'thcborges@example.com',
        name: 'Líder Técnico',
      })
    );

    render(<App />);

    const autoBtn = screen.getByRole('button', { name: /Auto-Completar Proteína/i });
    fireEvent.click(autoBtn);

    // Modal abre e exibe quanto falta para atingir a meta
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText(/Simule e distribua as gramas de cada fonte proteica/i)).toBeInTheDocument();

    // Informa gramas de Sassami
    const sassamiInput = screen.getByLabelText(/Gramas de Filé de Sassami Desfiado/i);
    fireEvent.change(sassamiInput, { target: { value: '120' } });

    // Clica em Lançar no Diário
    const confirmBtn = screen.getByRole('button', { name: /Lançar no Diário/i });
    fireEvent.click(confirmBtn);

    // Alimento adicionado no jantar do diário
    expect(screen.getAllByText(/Filé de Sassami Desfiado \(Auto-Completar\)/i).length).toBeGreaterThan(0);
  });

  it('deve permitir deslogar (logout) e retornar à página principal de login bloqueando novas inserções', () => {
    localStorage.setItem(
      'macrometrics_auth_user',
      JSON.stringify({
        id: 'usr_thcborges',
        email: 'thcborges@example.com',
        name: 'Líder Técnico',
      })
    );

    render(<App />);

    const logoutBtn = screen.getByRole('button', { name: /Sair/i });
    fireEvent.click(logoutBtn);

    // Retorna para a página principal de login
    expect(screen.getByRole('button', { name: /Entrar com Google/i })).toBeInTheDocument();
    expect(screen.queryByText(/Lançamento Rápido de Alimentos/i)).not.toBeInTheDocument();
  });

  it('deve permitir cadastrar novo alimento na interface gráfica e lançá-lo no diário de refeições', () => {
    localStorage.setItem(
      'macrometrics_auth_user',
      JSON.stringify({
        id: 'usr_thcborges',
        email: 'thcborges@example.com',
        name: 'Líder Técnico',
      })
    );

    render(<App />);

    // Clica no botão para abrir o modal de cadastro de novo alimento
    const newFoodBtn = screen.getByRole('button', { name: /\+ Novo Alimento/i });
    fireEvent.click(newFoodBtn);

    expect(screen.getByText(/Cadastrar Novo Alimento/i)).toBeInTheDocument();

    // Preenche o formulário M3
    fireEvent.change(screen.getByLabelText(/Nome do Alimento/i), {
      target: { value: 'Atum Ralado em Água' },
    });
    fireEvent.change(screen.getByLabelText(/Porção Padrão \(g\)/i), {
      target: { value: '120' },
    });
    fireEvent.change(screen.getByLabelText(/Calorias \(100g\)/i), {
      target: { value: '110' },
    });
    fireEvent.change(screen.getByLabelText(/Proteínas \(100g\)/i), {
      target: { value: '26' },
    });
    fireEvent.change(screen.getByLabelText(/Carboidratos \(100g\)/i), {
      target: { value: '0' },
    });
    fireEvent.change(screen.getByLabelText(/Gorduras \(100g\)/i), {
      target: { value: '0.5' },
    });
    fireEvent.change(screen.getByLabelText(/Fibras \(100g\)/i), {
      target: { value: '0' },
    });

    const saveBtn = screen.getByRole('button', { name: /Salvar Alimento/i });
    fireEvent.click(saveBtn);

    // Modal fechou
    expect(screen.queryByText(/Cadastrar Novo Alimento/i)).not.toBeInTheDocument();

    // Alimento cadastrado foi selecionado no select
    const select = screen.getByLabelText(/Alimento Selecionado/i) as HTMLSelectElement;
    expect(select.value).toContain('custom_');

    // Lança o alimento na janela de refeição ativa (Almoço)
    const launchBtn = screen.getByRole('button', { name: /Lançar/i });
    fireEvent.click(launchBtn);

    // Deve estar visível na lista de alimentos consumidos
    expect(screen.getAllByText(/Atum Ralado em Água/i).length).toBeGreaterThanOrEqual(1);
  });

  it('deve sincronizar com Firestore via GET e persistir via PUT /api/v1/diaries/:date', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(async (url, init) => {
      const urlStr = url.toString();
      const method = init?.method?.toUpperCase() || 'GET';
      if (urlStr.includes('/api/v1/diaries') && method === 'GET') {
        return {
          ok: true,
          json: async () => ({
            date: '2026-10-16',
            meals: {
              breakfast: [],
              lunch: [
                {
                  id: 'persisted_lunch_1',
                  foodId: 'sassami',
                  name: 'Sassami Persistido Firestore',
                  grams: 180,
                  calories: 297,
                  protein: 55.8,
                  carbs: 0,
                  fat: 6.48,
                  fiber: 0,
                },
              ],
              afternoon_snack: [],
              dinner_event: [],
            },
            totals: { calories: 297, protein: 55.8, carbs: 0, fat: 6.48, fiber: 0 },
          }),
        } as Response;
      }
      return {
        ok: true,
        json: async () => ({ success: true }),
      } as Response;
    });

    localStorage.setItem(
      'macrometrics_auth_user',
      JSON.stringify({
        id: 'usr_thcborges_firestore',
        email: 'thcborges@example.com',
        name: 'Líder Técnico',
      })
    );

    render(<App />);

    // Verifica que o seletor de data está presente
    const dateInput = screen.getByLabelText(/Data do Diário/i);
    expect(dateInput).toBeInTheDocument();

    // Aguarda sincronização do Firestore
    const persistedFood = await screen.findByText(/Sassami Persistido Firestore/i);
    expect(persistedFood).toBeInTheDocument();

    // Dispara adição de outro alimento para verificar persistência PUT
    const launchBtn = screen.getByRole('button', { name: /Lançar/i });
    fireEvent.click(launchBtn);

    // Verifica que PUT foi disparado
    expect(
      fetchSpy.mock.calls.some(
        call =>
          call[0].toString().includes('/api/v1/diaries') &&
          call[1]?.method === 'PUT' &&
          (call[1]?.headers as Record<string, string>)?.['x-user-id'] === 'usr_thcborges_firestore'
      )
    ).toBe(true);

    fetchSpy.mockRestore();
  });

  it('deve disparar rotas de exclusão de conta e expurgo admin no modal de LGPD', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    } as Response);

    localStorage.setItem(
      'macrometrics_auth_user',
      JSON.stringify({
        id: 'usr_thcborges',
        email: 'thcborges@example.com',
        name: 'Líder Técnico',
      })
    );

    render(<App />);

    const accountBtn = screen.getByRole('button', { name: /Conta & LGPD/i });
    fireEvent.click(accountBtn);

    const deleteReqBtn = screen.getByRole('button', { name: /Solicitar Exclusão da Conta/i });
    fireEvent.click(deleteReqBtn);

    expect(
      fetchSpy.mock.calls.some(call =>
        call[0].toString().includes('/api/v1/users/usr_thcborges/deletion-request')
      )
    ).toBe(true);

    // Admin purge
    const adminInput = screen.getByPlaceholderText(/Google Subject ID ou User ID/i);
    fireEvent.change(adminInput, { target: { value: 'usr_target_to_purge' } });

    const purgeBtn = screen.getByRole('button', { name: /Exclusão Imediata e Irreversível/i });
    fireEvent.click(purgeBtn);

    expect(
      fetchSpy.mock.calls.some(
        call =>
          call[0].toString().includes('/api/v1/admin/users/usr_target_to_purge') &&
          call[1]?.method === 'DELETE'
      )
    ).toBe(true);

    fetchSpy.mockRestore();
  });
});

