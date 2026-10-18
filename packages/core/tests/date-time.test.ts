import { describe, it, expect } from 'vitest';
import {
  getLocalDateString,
  getUtcIsoString,
  getRollingDays,
  parseLocalDate,
  formatUtcToUserLocal,
} from '../src/date-time.js';

describe('Utilitários de Data e Fuso Horário (UTC no Sistema vs Fuso Local do Usuário)', () => {
  it('deve extrair a data local YYYY-MM-DD considerando o fuso do usuário e não UTC', () => {
    // Cria uma data com horário local às 22h30 (que em fusos negativos como UTC-3 já é o dia seguinte em UTC)
    const localEvening = new Date(2026, 9, 16, 22, 30, 0); // 16 de Outubro de 2026 às 22:30 local
    const dateStr = getLocalDateString(localEvening);
    expect(dateStr).toBe('2026-10-16');

    // Cria uma data logo após meia-noite (00h05)
    const localMidnight = new Date(2026, 9, 17, 0, 5, 0); // 17 de Outubro de 2026 às 00:05 local
    const nextDayStr = getLocalDateString(localMidnight);
    expect(nextDayStr).toBe('2026-10-17');
  });

  it('deve retornar a data de hoje local por padrão se nenhum argumento for fornecido', () => {
    const now = new Date();
    const expected = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    expect(getLocalDateString()).toBe(expected);
  });

  it('deve gerar string ISO em UTC para persistência interna do sistema', () => {
    const d = new Date(2026, 9, 16, 12, 0, 0);
    const utcStr = getUtcIsoString(d);
    expect(utcStr).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    expect(utcStr.endsWith('Z')).toBe(true);
  });

  it('deve calcular janela móvel de dias consecutivos terminando exatamente na data selecionada sem desvios de fuso', () => {
    const days = getRollingDays('2026-10-16', 7);
    expect(days).toEqual([
      '2026-10-10',
      '2026-10-11',
      '2026-10-12',
      '2026-10-13',
      '2026-10-14',
      '2026-10-15',
      '2026-10-16',
    ]);
    expect(days[days.length - 1]).toBe('2026-10-16');
  });

  it('deve lidar corretamente com virada de mês e ano bissexto na janela móvel', () => {
    // Ano bissexto 2024: 01 de Março precedido por 29 de Fevereiro
    const leapDays = getRollingDays('2024-03-02', 4);
    expect(leapDays).toEqual(['2024-02-28', '2024-02-29', '2024-03-01', '2024-03-02']);

    // Virada de ano: 02 de Janeiro
    const newYearDays = getRollingDays('2026-01-02', 3);
    expect(newYearDays).toEqual(['2025-12-31', '2026-01-01', '2026-01-02']);
  });

  it('deve realizar parse de YYYY-MM-DD para objeto Date local à meia-noite', () => {
    const parsed = parseLocalDate('2026-10-16');
    expect(parsed.getFullYear()).toBe(2026);
    expect(parsed.getMonth()).toBe(9); // 0-indexed outubro
    expect(parsed.getDate()).toBe(16);
    expect(parsed.getHours()).toBe(0);
    expect(parsed.getMinutes()).toBe(0);
  });

  it('deve formatar carimbo UTC para exibição amigável no fuso do usuário', () => {
    const utcIso = '2026-10-17T03:00:00.000Z';
    const formatted = formatUtcToUserLocal(utcIso, { dateStyle: 'short' });
    expect(formatted).toBeTruthy();
    expect(typeof formatted).toBe('string');
  });
});
