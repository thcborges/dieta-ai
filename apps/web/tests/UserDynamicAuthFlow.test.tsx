import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { LoginPage } from '../src/components/LoginPage.js';
import App from '../src/App.js';

describe('BDD: Dynamic User Authentication & UI Flow (No Default User)', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('não deve possuir nenhum e-mail ou usuário padrão pré-preenchido na tela de login', () => {
    render(<LoginPage onLogin={vi.fn()} />);

    const emailInput = screen.getByLabelText(/Conta Google \(E-mail\)/i) as HTMLInputElement;
    expect(emailInput.value).toBe('');
    expect(emailInput.placeholder).toMatch(/gmail\.com|email/i);
  });

  it('deve rejeitar submissão com e-mail em branco e exigir que o usuário informe sua conta', async () => {
    const onLogin = vi.fn();
    render(<LoginPage onLogin={onLogin} />);

    const loginButton = screen.getByRole('button', { name: /Entrar com Google/i });
    fireEvent.click(loginButton);

    expect(
      screen.getByText(/Por favor, informe uma conta Google com endereço de e-mail válido/i)
    ).toBeInTheDocument();
    expect(onLogin).not.toHaveBeenCalled();
  });

  it('deve autenticar com o e-mail fornecido pelo usuário (ex: thcborges@gmail.com) e repassar o blindUserId', async () => {
    const onLogin = vi.fn();
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          sessionId: 'sess_real_123',
          blindIndex: '2fe41087c35ed7bce5a7f63d289cdebad62dbb7e37958a0c878f9637170e8b42',
          user: {
            id: 'usr_thcborges_gmail_com',
            blindUserId: '2fe41087c35ed7bce5a7f63d289cdebad62dbb7e37958a0c878f9637170e8b42',
            email: 'thcborges@gmail.com',
            name: 'Thiago Borges',
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    );

    render(<LoginPage onLogin={onLogin} />);

    const emailInput = screen.getByLabelText(/Conta Google \(E-mail\)/i);
    fireEvent.change(emailInput, { target: { value: 'thcborges@gmail.com' } });

    const loginButton = screen.getByRole('button', { name: /Entrar com Google/i });
    fireEvent.click(loginButton);

    await waitFor(() => {
      expect(onLogin).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'usr_thcborges_gmail_com',
          email: 'thcborges@gmail.com',
          blindUserId: '2fe41087c35ed7bce5a7f63d289cdebad62dbb7e37958a0c878f9637170e8b42',
        })
      );
    });
  });

  it('deve exibir o e-mail do usuário autenticado no cabeçalho do App e permitir logout imediato', async () => {
    const mockUser = {
      id: 'usr_thcborges_gmail_com',
      email: 'thcborges@gmail.com',
      name: 'Thiago Borges',
      blindUserId: '2fe41087c35ed7bce5a7f63d289cdebad62dbb7e37958a0c878f9637170e8b42',
      sessionToken: 'test-token',
    };
    localStorage.setItem('macrometrics_auth_user', JSON.stringify(mockUser));

    vi.spyOn(globalThis, 'fetch').mockImplementation((input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : input.toString();
      if (url.includes('/api/v1/diaries/dates')) {
        return Promise.resolve(new Response(JSON.stringify({ dates: ['2026-11-10'], count: 1 })));
      }
      if (url.includes('/api/v1/diaries/history')) {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              history: [{ date: '2026-11-10', calories: 1193, proteinGrams: 110.9 }],
              days: 7,
              endDate: '2026-11-10',
            })
          )
        );
      }
      if (url.includes('/api/v1/diaries/')) {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              date: '2026-11-10',
              meals: { breakfast: [], lunch: [], afternoon_snack: [], dinner_event: [] },
              totals: { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 },
            })
          )
        );
      }
      if (url.includes('/api/v1/users/me/goals')) {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              calories: 2400,
              proteinGrams: 220,
              carbGrams: 180,
              fatGrams: 75,
              fiberGrams: 38,
            })
          )
        );
      }
      return Promise.resolve(new Response(JSON.stringify({})));
    });

    render(<App />);

    // Verifica que o e-mail do usuário autenticado está visível no cabeçalho
    expect(screen.getByText('thcborges@gmail.com')).toBeInTheDocument();

    // Clica em Sair
    const logoutBtn = screen.getByRole('button', { name: /Sair/i });
    fireEvent.click(logoutBtn);

    // Deve voltar para a tela de login sem nenhum e-mail pré-preenchido
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /MacroMetrics Pro/i })).toBeInTheDocument();
    });

    const emailInput = screen.getByLabelText(/Conta Google \(E-mail\)/i) as HTMLInputElement;
    expect(emailInput.value).toBe('');
  });
});
