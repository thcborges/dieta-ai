import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { LoginPage } from '../src/components/LoginPage.js';

describe('LoginPage (Página Principal de Login com Google Auth)', () => {
  it('deve renderizar a página principal de login com branding Material Design 3', () => {
    const onLogin = vi.fn();
    render(<LoginPage onLogin={onLogin} />);

    expect(screen.getByRole('heading', { name: /MacroMetrics Pro/i })).toBeInTheDocument();
    expect(screen.getByText(/Engenharia Reversa de Macronutrientes/i)).toBeInTheDocument();
    expect(screen.getByText(/Faça login com sua Conta Google para acessar o diário/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Entrar com Google/i })).toBeInTheDocument();
  });

  it('deve chamar onLogin ao clicar no botão de Entrar com Google', () => {
    const onLogin = vi.fn();
    render(<LoginPage onLogin={onLogin} />);

    const loginButton = screen.getByRole('button', { name: /Entrar com Google/i });
    fireEvent.click(loginButton);

    expect(onLogin).toHaveBeenCalledTimes(1);
    expect(onLogin).toHaveBeenCalledWith(
      expect.objectContaining({
        email: expect.stringContaining('@'),
        name: expect.any(String),
      })
    );
  });

  it('deve exibir informações sobre conformidade e segurança LGPD', () => {
    render(<LoginPage onLogin={vi.fn()} />);

    expect(screen.getByText(/Conformidade Estrita LGPD/i)).toBeInTheDocument();
    expect(screen.getByText(/Blind Indexing/i)).toBeInTheDocument();
  });
});
