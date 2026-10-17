/**
 * Utilitários de Data e Fuso Horário - MacroMetrics Pro
 *
 * Diretriz Central:
 * - Dentro do sistema (banco, Firestore, APIs, logs, telemetria), datas e horários devem estar em UTC (ISO 8601).
 * - Para o usuário (interface, diário, seleção de hoje, virada de dia), devem respeitar o fuso local do usuário.
 * - A data na interface só deve mudar quando for 00h (meia-noite) no fuso local do usuário.
 */

/**
 * Retorna a data no fuso local do usuário no formato YYYY-MM-DD.
 * Garante que a data só mude após 00:00:00 no fuso do cliente (evita que fusos negativos virem o dia antes da hora por causa de UTC).
 *
 * @param date Data de referência (padrão: agora)
 * @returns String formatada YYYY-MM-DD no fuso local
 */
export function getLocalDateString(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Retorna a representação ISO 8601 canônica em UTC (terminada em 'Z') para armazenamento e tráfego interno no sistema.
 *
 * @param date Data de referência (padrão: agora)
 * @returns String ISO 8601 em UTC
 */
export function getUtcIsoString(date: Date = new Date()): string {
  return date.toISOString();
}

/**
 * Faz o parse de uma string YYYY-MM-DD para um objeto Date local fixado à meia-noite (00:00:00.000).
 * Evita o comportamento do construtor Date(string) que interpreta YYYY-MM-DD como UTC meia-noite e causa desvio de dia em fusos negativos.
 *
 * @param dateStr String YYYY-MM-DD
 * @returns Objeto Date local
 */
export function parseLocalDate(dateStr: string): Date {
  const [yearStr, monthStr, dayStr] = dateStr.split('-');
  const year = Number(yearStr);
  const month = Number(monthStr) - 1;
  const day = Number(dayStr);
  return new Date(year, month, day, 0, 0, 0, 0);
}

/**
 * Calcula a janela móvel de dias consecutivos (em YYYY-MM-DD) terminando na data especificada.
 * Operações aritméticas de data são executadas no fuso local, garantindo integridade em viradas de mês e anos bissextos.
 *
 * @param endDateStr Data final no formato YYYY-MM-DD
 * @param count Quantidade de dias da janela (padrão: 7)
 * @returns Array com strings YYYY-MM-DD em ordem cronológica
 */
export function getRollingDays(endDateStr: string, count: number = 7): string[] {
  const [yearStr, monthStr, dayStr] = endDateStr.split('-');
  const year = Number(yearStr);
  const month = Number(monthStr) - 1;
  const day = Number(dayStr);

  const days: string[] = [];
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(year, month, day - i, 0, 0, 0, 0);
    days.push(getLocalDateString(d));
  }
  return days;
}

/**
 * Converte um carimbo de data/hora UTC (string ISO) para exibição formatada no fuso horário do usuário.
 *
 * @param utcIsoString String ISO UTC
 * @param options Opções de Intl.DateTimeFormat
 * @returns String formatada para o fuso local
 */
export function formatUtcToUserLocal(
  utcIsoString: string,
  options?: Intl.DateTimeFormatOptions
): string {
  const date = new Date(utcIsoString);
  return date.toLocaleDateString(undefined, options);
}
