import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne, transaction } from '@/lib/db';
import { applyNoStore, containsDangerousInput, enforceRateLimit, isTrustedOrigin } from '@/lib/security';
import { verifyEditalToken } from '@/lib/edital-auth';

type DraftStep = 'equipe' | 'instituicao' | 'proposta';

type DraftBody = {
  step?: unknown;
  data?: unknown;
};

type SubmissionDocumentRow = {
  id: number;
  requirement_code: string;
  original_filename: string | null;
  mime_type: string;
  size_bytes: number;
  uploaded_at: Date;
};

type SubmissionRow = {
  id: number;
  registration_id: number;
  status: 'DRAFT' | 'SUBMITTED';
  team_description: string | null;
  institution_name: string | null;
  institution_cnpj: string | null;
  lab_name: string | null;
  lab_area: string | null;
  lab_served_public: string | null;
  budget_items: unknown;
  technical_justification: string | null;
  expected_results: string | null;
  created_at: Date;
  updated_at: Date;
  submitted_at: Date | null;
};

const MAX_TEXT_LENGTH = 5000;
const MAX_BUDGET_ITEMS = 20;
const VALID_STEPS = new Set<DraftStep>(['equipe', 'instituicao', 'proposta']);

function jsonResponse(body: unknown, init?: ResponseInit) {
  return applyNoStore(NextResponse.json(body, init));
}

function getTokenRegistrationId(request: NextRequest): number | null {
  const token = request.headers.get('x-edital-token');
  if (!token) {
    return null;
  }

  return verifyEditalToken(token);
}

function normalizeTextInput(value: unknown, fieldName: string): string | null {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value !== 'string') {
    throw new Error(`Campo inválido: ${fieldName}`);
  }

  if (containsDangerousInput(value)) {
    throw new Error(`Conteúdo inválido detectado em ${fieldName}`);
  }

  if (value.length > MAX_TEXT_LENGTH) {
    throw new Error(`Campo ${fieldName} excede o limite permitido`);
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeBudgetItems(value: unknown): Array<{
  descricao: string;
  valor_estimado: number;
  justificativa: string;
}> | null {
  if (value === null || value === undefined) {
    return null;
  }

  if (!Array.isArray(value)) {
    throw new Error('budget_items inválido');
  }

  if (value.length > MAX_BUDGET_ITEMS) {
    throw new Error('budget_items excede o limite permitido');
  }

  return value.map((item, index) => {
    if (!item || typeof item !== 'object') {
      throw new Error(`budget_items[${index}] inválido`);
    }

    const entry = item as Record<string, unknown>;
    const descricao = normalizeTextInput(entry.descricao, `budget_items[${index}].descricao`) ?? '';
    const justificativa = normalizeTextInput(entry.justificativa, `budget_items[${index}].justificativa`) ?? '';
    const valorEstimado = entry.valor_estimado;

    if (descricao.length === 0 || descricao.length > 200) {
      throw new Error(`budget_items[${index}].descricao inválida`);
    }

    if (justificativa.length === 0 || justificativa.length > 500) {
      throw new Error(`budget_items[${index}].justificativa inválida`);
    }

    if (typeof valorEstimado !== 'number' || !Number.isFinite(valorEstimado) || valorEstimado <= 0) {
      throw new Error(`budget_items[${index}].valor_estimado inválido`);
    }

    return {
      descricao,
      valor_estimado: valorEstimado,
      justificativa,
    };
  });
}

function toIsoDate(value: Date | string | null): string | null {
  if (!value) {
    return null;
  }

  return new Date(value).toISOString();
}

async function loadSubmission(registrationId: number) {
  const submission = await queryOne<SubmissionRow>(
    `
      SELECT
        id,
        registration_id,
        status,
        team_description,
        institution_name,
        institution_cnpj,
        lab_name,
        lab_area,
        lab_served_public,
        budget_items,
        technical_justification,
        expected_results,
        created_at,
        updated_at,
        submitted_at
      FROM edital_submissions
      WHERE registration_id = $1
      LIMIT 1
    `,
    [registrationId]
  );

  if (!submission) {
    return null;
  }

  const documents = await query<SubmissionDocumentRow>(
    `
      SELECT
        id,
        requirement_code,
        original_filename,
        mime_type,
        size_bytes,
        uploaded_at
      FROM edital_submission_documents
      WHERE submission_id = $1
      ORDER BY uploaded_at ASC, id ASC
    `,
    [submission.id]
  );

  return {
    ...submission,
    documents,
  };
}

export async function GET(request: NextRequest) {
  try {
    if (!isTrustedOrigin(request)) {
      return jsonResponse({ error: 'Origem não autorizada' }, { status: 403 });
    }

    const rateLimit = enforceRateLimit(request, 'edital-proposta-rascunho', 30, 10 * 60 * 1000, 'get');
    if (!rateLimit.allowed) {
      return jsonResponse(
        { error: 'Muitas tentativas. Tente novamente em alguns minutos.' },
        {
          status: 429,
          headers: {
            'Retry-After': rateLimit.retryAfterSeconds.toString(),
          },
        }
      );
    }

    const registrationId = getTokenRegistrationId(request);
    if (!registrationId) {
      return jsonResponse({ error: 'token_expired' }, { status: 401 });
    }

    const submission = await loadSubmission(registrationId);

    return jsonResponse({
      ok: true,
      submission: submission
        ? {
            id: submission.id,
            registrationId: submission.registration_id,
            status: submission.status,
            teamDescription: submission.team_description,
            institutionName: submission.institution_name,
            institutionCnpj: submission.institution_cnpj,
            labName: submission.lab_name,
            labArea: submission.lab_area,
            labServedPublic: submission.lab_served_public,
            budgetItems: Array.isArray(submission.budget_items) ? submission.budget_items : submission.budget_items ?? null,
            technicalJustification: submission.technical_justification,
            expectedResults: submission.expected_results,
            createdAt: toIsoDate(submission.created_at),
            updatedAt: toIsoDate(submission.updated_at),
            submittedAt: toIsoDate(submission.submitted_at),
            documents: submission.documents.map((document) => ({
              id: document.id,
              requirementCode: document.requirement_code,
              originalFilename: document.original_filename,
              mimeType: document.mime_type,
              sizeBytes: document.size_bytes,
              uploadedAt: toIsoDate(document.uploaded_at),
            })),
          }
        : null,
    });
  } catch (error) {
    console.error('[edital-proposta-rascunho] Erro ao recuperar rascunho:', error);
    return jsonResponse({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!isTrustedOrigin(request)) {
      return jsonResponse({ error: 'Origem não autorizada' }, { status: 403 });
    }

    const rateLimit = enforceRateLimit(request, 'edital-proposta-rascunho', 30, 10 * 60 * 1000, 'post');
    if (!rateLimit.allowed) {
      return jsonResponse(
        { error: 'Muitas tentativas. Tente novamente em alguns minutos.' },
        {
          status: 429,
          headers: {
            'Retry-After': rateLimit.retryAfterSeconds.toString(),
          },
        }
      );
    }

    const registrationId = getTokenRegistrationId(request);
    if (!registrationId) {
      return jsonResponse({ error: 'token_expired' }, { status: 401 });
    }

    let body: DraftBody;
    try {
      body = await request.json();
    } catch {
      return jsonResponse({ error: 'Payload inválido' }, { status: 400 });
    }

    const step = typeof body.step === 'string' && VALID_STEPS.has(body.step as DraftStep) ? (body.step as DraftStep) : null;
    if (!step) {
      return jsonResponse({ error: 'Etapa inválida' }, { status: 400 });
    }

    const data = body.data && typeof body.data === 'object' ? (body.data as Record<string, unknown>) : {};

    const result = await transaction(async (client) => {
      const existing = await client.query(
        `
          SELECT id, status
          FROM edital_submissions
          WHERE registration_id = $1
          FOR UPDATE
        `,
        [registrationId]
      ) as { rows: Array<Pick<SubmissionRow, 'id' | 'status'>> };

      const current = existing.rows[0];
      if (current?.status === 'SUBMITTED') {
        return { conflict: true as const };
      }

      if (step === 'equipe') {
        const teamDescription = normalizeTextInput(data.team_description, 'team_description');

        await client.query(
          `
            INSERT INTO edital_submissions (registration_id, team_description)
            VALUES ($1, $2)
            ON CONFLICT (registration_id) DO UPDATE
            SET team_description = EXCLUDED.team_description,
                updated_at = NOW()
          `,
          [registrationId, teamDescription]
        );
      } else if (step === 'instituicao') {
        const institutionName = normalizeTextInput(data.institution_name, 'institution_name');
        const institutionCnpj = normalizeTextInput(data.institution_cnpj, 'institution_cnpj');
        const labName = normalizeTextInput(data.lab_name, 'lab_name');
        const labArea = normalizeTextInput(data.lab_area, 'lab_area');
        const labServedPublic = normalizeTextInput(data.lab_served_public, 'lab_served_public');

        await client.query(
          `
            INSERT INTO edital_submissions (
              registration_id, institution_name, institution_cnpj, lab_name, lab_area, lab_served_public
            )
            VALUES ($1, $2, $3, $4, $5, $6)
            ON CONFLICT (registration_id) DO UPDATE
            SET institution_name = EXCLUDED.institution_name,
                institution_cnpj = EXCLUDED.institution_cnpj,
                lab_name = EXCLUDED.lab_name,
                lab_area = EXCLUDED.lab_area,
                lab_served_public = EXCLUDED.lab_served_public,
                updated_at = NOW()
          `,
          [registrationId, institutionName, institutionCnpj, labName, labArea, labServedPublic]
        );
      } else if (step === 'proposta') {
        const budgetItems = normalizeBudgetItems(data.budget_items);
        const technicalJustification = normalizeTextInput(data.technical_justification, 'technical_justification');
        const expectedResults = normalizeTextInput(data.expected_results, 'expected_results');

        await client.query(
          `
            INSERT INTO edital_submissions (
              registration_id, budget_items, technical_justification, expected_results
            )
            VALUES ($1, $2, $3, $4)
            ON CONFLICT (registration_id) DO UPDATE
            SET budget_items = EXCLUDED.budget_items,
                technical_justification = EXCLUDED.technical_justification,
                expected_results = EXCLUDED.expected_results,
                updated_at = NOW()
          `,
          [registrationId, budgetItems ? JSON.stringify(budgetItems) : null, technicalJustification, expectedResults]
        );
      }

      const submission = await client.query(
        `
          SELECT id, updated_at
          FROM edital_submissions
          WHERE registration_id = $1
          LIMIT 1
        `,
        [registrationId]
      ) as { rows: Array<{ id: number; updated_at: Date }> };

      return {
        conflict: false as const,
        submissionId: submission.rows[0]?.id ?? null,
        updatedAt: submission.rows[0]?.updated_at ?? null,
      };
    });

    if (result.conflict) {
      return jsonResponse({ error: 'already_submitted' }, { status: 409 });
    }

    return jsonResponse({
      ok: true,
      submissionId: result.submissionId,
      updatedAt: toIsoDate(result.updatedAt),
    });
  } catch (error) {
    console.error('[edital-proposta-rascunho] Erro ao salvar rascunho:', error);
    if (error instanceof Error && error.message.startsWith('Campo ')) {
      return jsonResponse({ error: error.message }, { status: 400 });
    }
    if (error instanceof Error && error.message.includes('budget_items')) {
      return jsonResponse({ error: error.message }, { status: 400 });
    }
    return jsonResponse({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
