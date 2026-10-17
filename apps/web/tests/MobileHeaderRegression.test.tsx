import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from '../src/App.js';

describe('Regressão de Layout: Cabeçalho Responsivo Mobile vs Desktop (Bug Fix)', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem(
      'macrometrics_auth_user',
      JSON.stringify({
        id: 'usr_test',
        email: 'test@example.com',
        name: 'Usuário Teste',
      })
    );
  });

  it('deve conter estrutura responsiva no cabeçalho evitando sobreposição e quebra indevida no mobile', () => {
    const { container } = render(<App />);

    // 1. O título "MacroMetrics Pro" não deve permitir quebra de linha interna desconfigurada
    const titleElement = screen.getByText('MacroMetrics Pro');
    expect(titleElement).toHaveClass('whitespace-nowrap');

    // 2. O container do cabeçalho deve suportar quebra flexível no mobile para não esmagar elementos
    const headerContainer = container.querySelector('header > div');
    expect(headerContainer?.className).toContain('flex-wrap');

    // 3. O DatePicker deve possuir container responsivo para mobile evitando colisão lateral
    const datePickerWrapper = container.querySelector('#diary-date-picker')?.closest('.w-full');
    expect(datePickerWrapper).toBeInTheDocument();

    // 4. Os botões de ação devem ocultar rótulos textuais longos em telas móveis preservando acessibilidade
    const macrosText = screen.getByText('Controlar Macros');
    expect(macrosText).toHaveClass('hidden');

    const accountText = screen.getByText('Conta & LGPD');
    expect(accountText).toHaveClass('hidden');

    const logoutText = screen.getByText('Sair');
    expect(logoutText).toHaveClass('hidden');

    // 5. O subtítulo descritivo deve ser ocultado em telas muito pequenas para poupar espaço vertical
    const subtitle = screen.getByText(/Engenharia Reversa • Auditoria Matemática/i);
    expect(subtitle).toHaveClass('hidden');
  });
});
