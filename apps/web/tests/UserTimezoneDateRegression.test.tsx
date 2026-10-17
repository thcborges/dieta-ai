import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import App from '../src/App.js';

describe('Regressão de Fuso Horário do Usuário (Data Local vs UTC no Sistema)', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('deve manter a data do diário no dia local às 22h30 (mesmo quando UTC já for o dia seguinte)', () => {
    // Simula horário local às 22:30 em 16 de Outubro de 2026
    const localEvening = new Date(2026, 9, 16, 22, 30, 0);
    vi.useFakeTimers();
    vi.setSystemTime(localEvening);

    localStorage.setItem(
      'macrometrics_auth_user',
      JSON.stringify({
        id: 'usr_timezone_user',
        email: 'tz@example.com',
        name: 'Usuário Fuso Local',
      })
    );

    render(<App />);

    const datePicker = screen.getByLabelText(/Data do Diário/i) as HTMLInputElement;

    // A data exibida para o usuário DEVE ser a data local (2026-10-16) e NÃO o dia seguinte em UTC!
    expect(datePicker.value).toBe('2026-10-16');
  });

  it('a data na interface só deve mudar quando atingir 00:00 no fuso do usuário', () => {
    // Inicializa às 23:59:58 do dia 16/10
    const almostMidnight = new Date(2026, 9, 16, 23, 59, 58);
    vi.useFakeTimers();
    vi.setSystemTime(almostMidnight);

    localStorage.setItem(
      'macrometrics_auth_user',
      JSON.stringify({
        id: 'usr_timezone_user',
        email: 'tz@example.com',
        name: 'Usuário Fuso Local',
      })
    );

    render(<App />);

    const datePicker = screen.getByLabelText(/Data do Diário/i) as HTMLInputElement;
    expect(datePicker.value).toBe('2026-10-16');

    // Avança 5 segundos no relógio (passa da meia-noite 00:00:03)
    act(() => {
      vi.advanceTimersByTime(5000);
    });

    // Agora que passou da meia-noite local, a interface atualiza para o novo dia
    expect(datePicker.value).toBe('2026-10-17');
  });
});
