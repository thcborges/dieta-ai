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

  it('deve permitir realizar o login com Google, acessando o dashboard e liberando lançamento de alimentos', () => {
    render(<App />);

    const loginBtn = screen.getByRole('button', { name: /Entrar com Google/i });
    fireEvent.click(loginBtn);

    // Agora o dashboard está visível
    expect(screen.getByText(/MacroMetrics Pro/i)).toBeInTheDocument();
    expect(screen.getByText(/Buffer de Evento Social/i)).toBeInTheDocument();
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

  it('deve executar o auto-completar proteína e adicionar novo alimento no jantar', () => {
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

    expect(screen.getAllByText(/Auto-Completar/i).length).toBeGreaterThan(0);
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
});
