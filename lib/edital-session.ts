export const EDITAL_SESSION_KEY = 'edital_session';

export interface EditalSessionPrefill {
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

export interface EditalSession {
  token: string;
  prefill: EditalSessionPrefill;
}

export function getEditalSession(): EditalSession | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const raw = sessionStorage.getItem(EDITAL_SESSION_KEY);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed.token !== 'string' || !parsed.prefill) {
      return null;
    }
    return parsed as EditalSession;
  } catch {
    return null;
  }
}

export function setEditalSession(session: EditalSession): void {
  sessionStorage.setItem(EDITAL_SESSION_KEY, JSON.stringify(session));
}

export function clearEditalSession(): void {
  sessionStorage.removeItem(EDITAL_SESSION_KEY);
}
