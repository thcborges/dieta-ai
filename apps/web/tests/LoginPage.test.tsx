import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { LoginPage } from '../src/components/LoginPage.js';

describe('LoginPage (Página Principal de Login com Google Auth)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('deve renderizar a página principal de login com branding Material Design 3', () => {
    const onLogin = vi.fn();
    render(<LoginPage onLogin={onLogin} />);

    expect(screen.getByRole('heading', { name: /MacroMetrics Pro/i })).toBeInTheDocument();
    expect(screen.getByText(/Engenharia Reversa de Macronutrientes/i)).toBeInTheDocument();
    expect(screen.getByText(/Faça login com sua Conta Google para acessar o diário/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Entrar com Google/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/Conta Google \(E-mail\)/i)).toBeInTheDocument();
  });

  it('deve chamar onLogin ao clicar no botão de Entrar com Google chamando API de autenticação', async () => {
    const onLogin = vi.fn();
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          sessionId: 'sess_123',
          blindIndex: 'blind_idx_abc',
          user: {
            email: 'thcborges@example.com',
            name: 'Líder Técnico',
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    );

    render(<LoginPage onLogin={onLogin} />);

    const loginButton = screen.getByRole('button', { name: /Entrar com Google/i });
    fireEvent.click(loginButton);

    await waitFor(() => {
      expect(onLogin).toHaveBeenCalledTimes(1);
    });

    expect(onLogin).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'blind_idx_abc',
        email: 'thcborges@example.com',
        name: 'Líder Técnico',
      })
    );

    expect(fetchSpy).toHaveBeenCalledWith(
      '/api/v1/auth/google',
      expect.objectContaining({
        method: 'POST',
      })
    );
  });

  it('deve permitir trocar de conta Google digitando outro e-mail e autenticar com a nova conta', async () => {
    const onLogin = vi.fn();
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          sessionId: 'sess_456',
          blindIndex: 'blind_idx_outro',
          user: {
            email: 'outro.usuario@gmail.com',
            name: 'Outro Usuário',
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    );

    render(<LoginPage onLogin={onLogin} />);

    const emailInput = screen.getByLabelText(/Conta Google \(E-mail\)/i);
    fireEvent.change(emailInput, { target: { value: 'outro.usuario@gmail.com' } });

    const loginButton = screen.getByRole('button', { name: /Entrar com Google/i });
    fireEvent.click(loginButton);

    await waitFor(() => {
      expect(onLogin).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'blind_idx_outro',
          email: 'outro.usuario@gmail.com',
        })
      );
    });

    fetchSpy.mockRestore();
  });

  it('deve validar e exibir erro ao tentar submeter e-mail inválido', async () => {
    const onLogin = vi.fn();
    render(<LoginPage onLogin={onLogin} />);

    const emailInput = screen.getByLabelText(/Conta Google \(E-mail\)/i);
    fireEvent.change(emailInput, { target: { value: 'email-sem-arroba' } });

    const loginButton = screen.getByRole('button', { name: /Entrar com Google/i });
    fireEvent.click(loginButton);

    expect(
      screen.getByText(/Por favor, informe uma conta Google com endereço de e-mail válido/i)
    ).toBeInTheDocument();
    expect(onLogin).not.toHaveBeenCalled();
  });

  it('deve realizar fallback offline-first quando a API estiver inacessível', async () => {
    const onLogin = vi.fn();
    vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new Error('Network error'));

    render(<LoginPage onLogin={onLogin} />);

    const loginButton = screen.getByRole('button', { name: /Entrar com Google/i });
    fireEvent.click(loginButton);

    await waitFor(() => {
      expect(onLogin).toHaveBeenCalledTimes(1);
    });

    expect(onLogin).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'thcborges@example.com',
        id: expect.stringContaining('usr_'),
      })
    );
  });

  it('deve exibir informações sobre conformidade e segurança LGPD', () => {
    render(<LoginPage onLogin={vi.fn()} />);

    expect(screen.getByText(/Conformidade Estrita LGPD/i)).toBeInTheDocument();
    expect(screen.getByText(/Blind Indexing/i)).toBeInTheDocument();
  });
});
