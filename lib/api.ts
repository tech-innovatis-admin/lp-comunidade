/**
 * Cliente API para comunicação com o backend
 */

export interface TermsResponse {
  id: number;
  version: string;
  title: string;
  content_html: string;
  content_hash: string;
  created_at: string;
}

export interface RegistrationResponse {
  status: 'ok';
  inviteUrl?: string;
}

/**
 * Busca os termos ativos
 */
export async function fetchActiveTerms(): Promise<TermsResponse> {
  const response = await fetch('/api/terms/active');
  
  if (!response.ok) {
    throw new Error('Erro ao buscar termos de uso');
  }
  
  return response.json();
}

/**
 * Envia inscrição
 */
export async function submitRegistration(
  formData: FormData
): Promise<RegistrationResponse> {
  const response = await fetch('/api/inscricoes', {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Erro desconhecido' }));
    const errorWithStatus = new Error(error.message || error.error || 'Erro ao enviar inscrição');
    (errorWithStatus as any).status = response.status;
    (errorWithStatus as any).message = error.message || error.error || 'Erro ao enviar inscrição';
    throw errorWithStatus;
  }

  return response.json();
}

