import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import App from '../src/App.js';
import { LoginPage, type AuthUser } from '../src/components/LoginPage.js';

describe('Frontend Regression: Recuperação de Dados do Usuário (Receitas, Diário e ID Canônico)', () => {
  const testEmail = 'thcborges@gmail.com';
  const canonicalUserId = 'usr_thcborges_gmail_com';
  const corruptedHashId = 'e8697669d27571d4cb803a6bc4d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9';

  beforeEach(() => {
    localStorage.clear();
  });

  it('LoginPage: ao realizar login com sucesso, deve repassar as credenciais e blindIndex emitidos pela API', async () => {
    let loggedUser: AuthUser | null = null;
    const onLoginMock = (u: AuthUser) => {
      loggedUser = u;
    };

    // Simula resposta da API /api/v1/auth/google
    window.fetch = async (url: RequestInfo | URL) => {
      if (String(url).includes('/api/v1/auth/google')) {
        return {
          ok: true,
          json: async () => ({
            sessionId: 'sess_123',
            sessionToken: 'hdr.payload.sig',
            blindIndex: corruptedHashId,
            user: {
              id: canonicalUserId,
              email: testEmail,
              name: 'Thiago Borges',
              isAdmin: true,
            },
          }),
        } as Response;
      }
      return { ok: true, json: async () => ({}) } as Response;
    };

    render(<LoginPage onLogin={onLoginMock} />);

    // Simula login clicando em Entrar com Google
    const loginButton = screen.getByText('Entrar com Google');
    loginButton.click();

    await waitFor(() => {
      expect(loggedUser).not.toBeNull();
    });

    expect(loggedUser!.id).toBe(canonicalUserId);
  });

  it('App: deve recuperar e migrar automaticamente receitas e diário caso o user.id tenha sido corrompido para blindIndex ou goog_*', async () => {
    // 1. Popula o localStorage com dados sob a chave canônica original
    const sampleRecipes = [
      {
        id: 'recipe_bolo_whey',
        name: 'Bolo de Caneca de Whey',
        servings: 1,
        servingUnitName: 'porção',
        ingredients: [{ foodId: 'food_whey', gramsOrUnits: 30 }],
      },
    ];
    localStorage.setItem(`macrometrics_recipes_${canonicalUserId}`, JSON.stringify(sampleRecipes));

    // 2. Simula sessão persistida que havia sido corrompida com o 64-char hash
    const corruptedUser: AuthUser = {
      id: corruptedHashId,
      email: testEmail,
      name: 'Thiago Borges',
      sessionToken: 'hdr.payload.sig',
    };
    localStorage.setItem('macrometrics_auth_user', JSON.stringify(corruptedUser));

    // 3. Renderiza App
    render(<App />);

    // 4. Deve ter curado a sessão no localStorage para o canonicalUserId
    await waitFor(() => {
      const stored = localStorage.getItem('macrometrics_auth_user');
      expect(stored).not.toBeNull();
      const parsed = JSON.parse(stored!);
      expect(parsed.id).toBe(canonicalUserId);
    });

    // 5. O botão ou badge de receitas na tela deve mostrar as receitas recuperadas
    await waitFor(() => {
      expect(screen.getByText(/Receitas \(1\)/i)).toBeDefined();
    });
  });
});
