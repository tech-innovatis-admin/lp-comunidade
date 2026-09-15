/** Abertura das inscricoes do Edital (America/Sao_Paulo). Override: NEXT_PUBLIC_EDITAL_REGISTRATION_OPENS_AT */
export const DEFAULT_EDITAL_REGISTRATION_OPENS_AT = '2026-09-17T00:00:00-03:00'

export function resolveEditalRegistrationOpensAt(
  raw: string | undefined = process.env.NEXT_PUBLIC_EDITAL_REGISTRATION_OPENS_AT
): number {
  const parsed = Date.parse(raw ?? DEFAULT_EDITAL_REGISTRATION_OPENS_AT)
  return Number.isFinite(parsed) ? parsed : Date.parse(DEFAULT_EDITAL_REGISTRATION_OPENS_AT)
}

export function isEditalRegistrationOpen(now: Date | number = Date.now()): boolean {
  const current = typeof now === 'number' ? now : now.getTime()
  return current >= resolveEditalRegistrationOpensAt()
}
