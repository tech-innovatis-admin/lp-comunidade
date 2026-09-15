const SAO_PAULO_TIME_ZONE = 'America/Sao_Paulo'

/**
 * Formata data/hora no fuso de São Paulo (pt-BR).
 * Evita discrepância SSR (UTC no servidor) vs horário local do avaliador.
 */
export function formatDateTimeSaoPaulo(value: string | Date | null | undefined): string {
  if (value == null || value === '') {
    return '—'
  }

  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) {
    return '—'
  }

  return date.toLocaleString('pt-BR', { timeZone: SAO_PAULO_TIME_ZONE })
}
