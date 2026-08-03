/**
 * Cliente API para o gate de validação de CPF do Edital PPI
 */

export interface EditalPrefill {
  fullName: string;
  email: string | null;
  phone: string | null;
  profession: string | null;
  organization: string | null;
  cep: string | null;
  logradouro: string | null;
  numero: string | null;
  bairro: string | null;
  cidade: string | null;
  estado: string | null;
}

export interface EditalValidationSuccess {
  ok: true;
  token: string;
  alreadySubmitted: boolean;
  submittedAt: string | null;
  prefill: EditalPrefill;
}

export type EditalValidationReason =
  | 'invalid_cpf'
  | 'forbidden'
  | 'rate_limited'
  | 'not_found'
  | 'server_error';

export class EditalValidationError extends Error {
  status: number;
  reason: EditalValidationReason;
  retryAfterSeconds?: number;

  constructor(status: number, reason: EditalValidationReason, message: string, retryAfterSeconds?: number) {
    super(message);
    this.status = status;
    this.reason = reason;
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

export async function validateCpfForEdital(cpf: string, website: string = ''): Promise<EditalValidationSuccess> {
  const response = await fetch('/api/editais/validar-cpf', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ cpf, website }),
  });

  if (response.status === 404) {
    throw new EditalValidationError(404, 'not_found', 'CPF não encontrado');
  }

  if (response.status === 429) {
    const retryAfter = Number.parseInt(response.headers.get('Retry-After') || '0', 10);
    throw new EditalValidationError(
      429,
      'rate_limited',
      'Muitas tentativas. Tente novamente em alguns minutos.',
      retryAfter
    );
  }

  if (response.status === 403) {
    throw new EditalValidationError(403, 'forbidden', 'Origem não autorizada');
  }

  if (response.status === 400) {
    throw new EditalValidationError(400, 'invalid_cpf', 'CPF inválido');
  }

  if (!response.ok) {
    throw new EditalValidationError(response.status, 'server_error', 'Erro interno do servidor');
  }

  return response.json();
}
