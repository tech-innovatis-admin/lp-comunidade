import { onlyDigits } from '@/lib/br-documents';
import {
  EMPTY_WIZARD_DATA,
  type EditalBudgetItem,
  type EditalDraftStep,
  type EditalMissingItem,
  type EditalSubmissionDocumentDto,
  type EditalSubmissionDto,
  type EditalWizardData,
} from '@/lib/edital-client-types';

export { EMPTY_WIZARD_DATA } from '@/lib/edital-client-types';
export type {
  EditalBudgetItem,
  EditalDraftStep,
  EditalMissingItem,
  EditalSubmissionDocumentDto as EditalSubmissionDocument,
  EditalSubmissionDto as EditalSubmission,
  EditalWizardData,
} from '@/lib/edital-client-types';

export function submissionToWizardData(submission: EditalSubmissionDto): EditalWizardData {
  return {
    teamDescription: submission.teamDescription ?? '',
    institutionName: submission.institutionName ?? '',
    institutionCnpj: onlyDigits(submission.institutionCnpj ?? ''),
    labName: submission.labName ?? '',
    labArea: submission.labArea ?? '',
    labAcademicUnit: submission.labAcademicUnit ?? '',
    labStructureDescription: submission.labStructureDescription ?? '',
    mainImprovementObjective: submission.mainImprovementObjective ?? '',
    labServedPublic: submission.labServedPublic ?? '',
    budgetItems: submission.budgetItems ?? [],
    technicalJustification: submission.technicalJustification ?? '',
    expectedResults: submission.expectedResults ?? '',
  };
}

export type EditalApiErrorReason =
  | 'token_expired'
  | 'already_submitted'
  | 'incomplete'
  | 'rate_limited'
  | 'forbidden'
  | 'not_found'
  | 'validation_error'
  | 'server_error';

export class EditalApiError extends Error {
  status: number;
  reason: EditalApiErrorReason;
  missing?: EditalMissingItem[];
  retryAfterSeconds?: number;

  constructor(
    status: number,
    reason: EditalApiErrorReason,
    message: string,
    extra?: { missing?: EditalMissingItem[]; retryAfterSeconds?: number }
  ) {
    super(message);
    this.status = status;
    this.reason = reason;
    this.missing = extra?.missing;
    this.retryAfterSeconds = extra?.retryAfterSeconds;
  }
}

async function throwEditalApiError(response: Response): Promise<never> {
  const body = await response.json().catch(() => ({ error: 'server_error' }));
  const errorCode: string = typeof body?.error === 'string' ? body.error : 'server_error';

  if (response.status === 401 && errorCode === 'token_expired') {
    throw new EditalApiError(401, 'token_expired', 'Sessão expirada');
  }
  if (response.status === 409 && errorCode === 'already_submitted') {
    throw new EditalApiError(409, 'already_submitted', 'Proposta já enviada');
  }
  if (response.status === 400 && errorCode === 'incomplete') {
    throw new EditalApiError(400, 'incomplete', 'Envio incompleto', { missing: body.missing || [] });
  }
  if (response.status === 429) {
    const retryAfter = Number.parseInt(response.headers.get('Retry-After') || '0', 10);
    throw new EditalApiError(
      429,
      'rate_limited',
      'Muitas tentativas. Tente novamente em alguns minutos.',
      { retryAfterSeconds: retryAfter }
    );
  }
  if (response.status === 403) {
    throw new EditalApiError(403, 'forbidden', 'Origem não autorizada');
  }
  if (response.status === 404) {
    throw new EditalApiError(404, 'not_found', errorCode);
  }
  if (response.status === 400) {
    throw new EditalApiError(400, 'validation_error', errorCode);
  }

  throw new EditalApiError(response.status, 'server_error', 'Erro interno do servidor');
}

export async function fetchEditalDraft(token: string): Promise<EditalSubmissionDto | null> {
  const response = await fetch('/api/editais/proposta/rascunho', {
    method: 'GET',
    headers: { 'X-Edital-Token': token },
  });

  if (!response.ok) {
    await throwEditalApiError(response);
  }

  const body = await response.json();
  return body.submission;
}

export async function saveEditalDraftStep(
  token: string,
  step: EditalDraftStep,
  data: Record<string, unknown>
): Promise<{ submissionId: number; updatedAt: string }> {
  const response = await fetch('/api/editais/proposta/rascunho', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Edital-Token': token },
    body: JSON.stringify({ step, data }),
  });

  if (!response.ok) {
    await throwEditalApiError(response);
  }

  const body = await response.json();
  return { submissionId: body.submissionId, updatedAt: body.updatedAt };
}

export async function uploadEditalDocument(
  token: string,
  requirementCode: string,
  file: File
): Promise<{ documentId: number; requirementCode: string; filename: string; mimeType?: string; uploadedAt?: string }> {
  const formData = new FormData();
  formData.append('requirementCode', requirementCode);
  formData.append('file', file);

  const response = await fetch('/api/editais/proposta/documento', {
    method: 'POST',
    headers: { 'X-Edital-Token': token },
    body: formData,
  });

  if (!response.ok) {
    await throwEditalApiError(response);
  }

  return response.json();
}

export async function getEditalDocumentUrl(token: string, documentId: number): Promise<string> {
  const response = await fetch(`/api/editais/proposta/documento/${documentId}`, {
    method: 'GET',
    headers: { 'X-Edital-Token': token },
  });

  if (!response.ok) {
    await throwEditalApiError(response);
  }

  const body = await response.json();
  return body.url;
}

export async function deleteEditalDocument(token: string, documentId: number): Promise<void> {
  const response = await fetch(`/api/editais/proposta/documento/${documentId}`, {
    method: 'DELETE',
    headers: { 'X-Edital-Token': token },
  });

  if (!response.ok) {
    await throwEditalApiError(response);
  }
}

export async function submitEditalProposal(token: string): Promise<{ submittedAt: string }> {
  const response = await fetch('/api/editais/proposta/enviar', {
    method: 'POST',
    headers: { 'X-Edital-Token': token },
  });

  if (!response.ok) {
    await throwEditalApiError(response);
  }

  const body = await response.json();
  return { submittedAt: body.submittedAt };
}
