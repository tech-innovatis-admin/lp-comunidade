import { NextRequest, NextResponse } from 'next/server';
import { queryOne, transaction } from '@/lib/db';
import { applyNoStore, enforceRateLimit, isTrustedOrigin } from '@/lib/security';
import { verifyEditalToken } from '@/lib/edital-auth';
import { parseDraftRequest, toStableErrorDto } from '@/lib/edital-dto-validation';
import { toSubmissionDto } from '@/lib/edital-dtos';
import { query } from '@/lib/db';
import { parseDatabaseId } from '@/lib/database-id';

type SubmissionDocumentRow = {
  id: number | string;
  requirement_code: string;
  original_filename: string | null;
  mime_type: string;
  size_bytes: number | string;
  uploaded_at: Date | string;
};

type SubmissionRow = {
  id: number | string;
  registration_id: number | string;
  status: 'DRAFT' | 'SUBMITTED';
  team_description: string | null;
  institution_name: string | null;
  institution_cnpj: string | null;
  lab_name: string | null;
  lab_area: string | null;
  lab_served_public: string | null;
  lab_academic_unit: string | null;
  lab_structure_description: string | null;
  main_improvement_objective: string | null;
  budget_items: unknown;
  technical_justification: string | null;
  expected_results: string | null;
  created_at: Date | string;
  updated_at: Date | string;
  submitted_at: Date | string | null;
  documents?: SubmissionDocumentRow[];
};

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

function toIsoDate(value: Date | string | null | undefined): string | null {
  if (!value) return null;
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
        lab_academic_unit,
        lab_structure_description,
        main_improvement_objective,
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

  const submissionId = parseDatabaseId(submission.id);
  const submissionRegistrationId = parseDatabaseId(submission.registration_id);
  if (submissionId === null || submissionRegistrationId === null) {
    throw new Error('invalid_database_id');
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
    [submissionId]
  );

  return {
    ...submission,
    id: submissionId,
    registration_id: submissionRegistrationId,
    documents: documents.map((document) => {
      const documentId = parseDatabaseId(document.id);
      if (documentId === null) {
        throw new Error('invalid_database_id');
      }

      return {
        ...document,
        id: documentId,
      };
    }),
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
      submission: submission ? toSubmissionDto(submission) : null,
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

    let bodyRaw: unknown;
    try {
      bodyRaw = await request.json();
    } catch {
      return jsonResponse({ error: 'Payload inválido' }, { status: 400 });
    }

    const parsed = parseDraftRequest(bodyRaw);
    if (!parsed.ok) {
      return jsonResponse(parsed.error, { status: 400 });
    }

    const { step, data } = parsed.value;

    const result = await transaction(async (client) => {
      const existing = await client.query(
        `
          SELECT id, status
          FROM edital_submissions
          WHERE registration_id = $1
          FOR UPDATE
        `,
        [registrationId]
      ) as { rows: Array<{ id: number | string; status: 'DRAFT' | 'SUBMITTED' }> };

      const current = existing.rows[0];
      if (current?.status === 'SUBMITTED') {
        return { conflict: true as const };
      }

      if (step === 'equipe') {
        await client.query(
          `
            INSERT INTO edital_submissions (registration_id, team_description)
            VALUES ($1, $2)
            ON CONFLICT (registration_id) DO UPDATE
            SET team_description = EXCLUDED.team_description,
                updated_at = NOW()
          `,
          [registrationId, data.team_description]
        );
      } else if (step === 'instituicao') {
        await client.query(
          `
            INSERT INTO edital_submissions (
              registration_id, institution_name, institution_cnpj, lab_name, lab_area, lab_served_public, lab_academic_unit
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            ON CONFLICT (registration_id) DO UPDATE
            SET institution_name = EXCLUDED.institution_name,
                institution_cnpj = EXCLUDED.institution_cnpj,
                lab_name = EXCLUDED.lab_name,
                lab_area = EXCLUDED.lab_area,
                lab_served_public = EXCLUDED.lab_served_public,
                lab_academic_unit = EXCLUDED.lab_academic_unit,
                updated_at = NOW()
          `,
          [registrationId, data.institution_name, data.institution_cnpj, data.lab_name, data.lab_area, data.lab_served_public, data.lab_academic_unit]
        );
      } else if (step === 'fotos') {
        await client.query(
          `
            INSERT INTO edital_submissions (registration_id, lab_structure_description)
            VALUES ($1, $2)
            ON CONFLICT (registration_id) DO UPDATE
            SET lab_structure_description = EXCLUDED.lab_structure_description,
                updated_at = NOW()
          `,
          [registrationId, data.lab_structure_description]
        );
      } else if (step === 'proposta') {
        await client.query(
          `
            INSERT INTO edital_submissions (
              registration_id, budget_items, technical_justification, expected_results, main_improvement_objective
            )
            VALUES ($1, $2, $3, $4, $5)
            ON CONFLICT (registration_id) DO UPDATE
            SET budget_items = EXCLUDED.budget_items,
                technical_justification = EXCLUDED.technical_justification,
                expected_results = EXCLUDED.expected_results,
                main_improvement_objective = EXCLUDED.main_improvement_objective,
                updated_at = NOW()
          `,
          [registrationId, data.budget_items ? JSON.stringify(data.budget_items) : null, data.technical_justification, data.expected_results, data.main_improvement_objective]
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
      ) as { rows: Array<{ id: number | string; updated_at: Date }> };

      const row = submission.rows[0];
      const submissionId = row ? parseDatabaseId(row.id) : null;
      if (submissionId === null) {
        throw new Error('invalid_database_id');
      }

      return {
        conflict: false as const,
        submissionId,
        updatedAt: row.updated_at,
      };
    });

    if (result.conflict) {
      return jsonResponse({ error: 'already_submitted' }, { status: 409 });
    }

    return jsonResponse({
      ok: true,
      submissionId: result.submissionId,
      updatedAt: result.updatedAt ? new Date(result.updatedAt).toISOString() : null,
    });
  } catch (error) {
    console.error('[edital-proposta-rascunho] Erro ao salvar rascunho:', error);
    return jsonResponse(toStableErrorDto(error, { fallbackMessage: 'Erro interno do servidor' }), { status: 500 });
  }
}
