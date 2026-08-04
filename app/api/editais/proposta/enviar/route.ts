import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne, transaction } from '@/lib/db';
import { applyNoStore, enforceRateLimit, isTrustedOrigin } from '@/lib/security';
import { verifyEditalToken } from '@/lib/edital-auth';
import { generateParticipationTermPdf } from '@/lib/edital-pdf';
import { generateLabPhotosPdf } from '@/lib/edital-photos-pdf';
import { deleteFile, getFileBytes, uploadFile } from '@/lib/s3';
import { calculateFileHash } from '@/lib/utils';
import { appendEditalSubmissionToSheet } from '@/lib/google-sheets';
import { getPublicBaseUrl } from '@/lib/public-url';
import {
  EDITAL_AUTO_GENERATED_DOCUMENT_CODE,
  EDITAL_MIN_PHOTO_COUNT,
  EDITAL_PHOTO_DOCUMENT_CODE,
  EDITAL_PHOTOS_PDF_DOCUMENT_CODE,
  getSubmissionRequiredDocumentCodes,
} from '@/lib/edital-requirements';
import { allocateEditalProtocolNumber } from '@/lib/edital-protocol';

type RequiredField =
  | 'institution_name'
  | 'institution_cnpj'
  | 'lab_name'
  | 'lab_area'
  | 'lab_academic_unit'
  | 'lab_structure_description'
  | 'main_improvement_objective'
  | 'technical_justification'
  | 'expected_results';

const REQUIRED_FIELDS: RequiredField[] = [
  'institution_name',
  'institution_cnpj',
  'lab_name',
  'lab_area',
  'lab_academic_unit',
  'lab_structure_description',
  'main_improvement_objective',
  'technical_justification',
  'expected_results',
];

type MissingItem =
  | { type: 'document'; requirementCode: string }
  | { type: 'photo'; required: number; found: number }
  | { type: 'field'; field: string };

type SubmissionRow = {
  id: number;
  registration_id: number;
  status: 'DRAFT' | 'SUBMITTED';
  team_description: string | null;
  institution_name: string | null;
  institution_cnpj: string | null;
  lab_name: string | null;
  lab_area: string | null;
  lab_academic_unit: string | null;
  lab_structure_description: string | null;
  main_improvement_objective: string | null;
  technical_justification: string | null;
  expected_results: string | null;
};

type RegistrationRow = {
  full_name: string;
  email: string;
  cpf: string;
  created_at: Date;
};

type PhotoDocumentRow = {
  id: number;
  s3_key: string;
  thumbnail_s3_key: string | null;
  mime_type: string;
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

function computeMissingItems(
  submission: SubmissionRow | null,
  documentCodes: string[]
): MissingItem[] {
  const missing: MissingItem[] = [];

  for (const field of REQUIRED_FIELDS) {
    const value = submission ? submission[field] : null;
    if (!value || value.trim().length === 0) {
      missing.push({ type: 'field', field });
    }
  }

  const presentCodes = new Set(documentCodes);
  for (const code of getSubmissionRequiredDocumentCodes()) {
    if (!presentCodes.has(code)) {
      missing.push({ type: 'document', requirementCode: code });
    }
  }

  const photoCount = documentCodes.filter((code) => code === EDITAL_PHOTO_DOCUMENT_CODE).length;
  if (photoCount < EDITAL_MIN_PHOTO_COUNT) {
    missing.push({ type: 'photo', required: EDITAL_MIN_PHOTO_COUNT, found: photoCount });
  }

  return missing;
}

async function loadSubmission(registrationId: number): Promise<SubmissionRow | null> {
  return queryOne<SubmissionRow>(
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
        lab_academic_unit,
        lab_structure_description,
        main_improvement_objective,
        technical_justification,
        expected_results
      FROM edital_submissions
      WHERE registration_id = $1
      LIMIT 1
    `,
    [registrationId]
  );
}

async function loadDocumentCodes(submissionId: number): Promise<string[]> {
  const rows = await query<{ requirement_code: string }>(
    `
      SELECT requirement_code
      FROM edital_submission_documents
      WHERE submission_id = $1
    `,
    [submissionId]
  );

  return rows.map((row) => row.requirement_code);
}

export async function POST(request: NextRequest) {
  try {
    if (!isTrustedOrigin(request)) {
      return jsonResponse({ error: 'Origem não autorizada' }, { status: 403 });
    }

    const rateLimit = enforceRateLimit(request, 'edital-proposta-enviar', 30, 10 * 60 * 1000, 'post');
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

    // Checagem inicial de completude (fora de transação, apenas leitura).
    // A checagem definitiva ocorre novamente dentro da transação de gravação,
    // logo antes de marcar a submissão como SUBMITTED, para evitar condições de corrida.
    const preSubmission = await loadSubmission(registrationId);

    if (preSubmission?.status === 'SUBMITTED') {
      return jsonResponse({ error: 'already_submitted' }, { status: 409 });
    }

    const preDocumentCodes = preSubmission ? await loadDocumentCodes(preSubmission.id) : [];
    const preMissing = computeMissingItems(preSubmission, preDocumentCodes);

    if (preMissing.length > 0) {
      return jsonResponse({ error: 'incomplete', missing: preMissing }, { status: 400 });
    }

    const registration = await queryOne<RegistrationRow>(
      `
        SELECT full_name, email, cpf, created_at
        FROM registrations
        WHERE id = $1
        LIMIT 1
      `,
      [registrationId]
    );

    if (!registration || !preSubmission) {
      return jsonResponse({ error: 'Cadastro não encontrado' }, { status: 404 });
    }

    // Fotos individuais → PDF único (8.1.8), fora da transação (I/O S3), como o termo.
    const photoDocs = await query<PhotoDocumentRow>(
      `
        SELECT id, s3_key, thumbnail_s3_key, mime_type
        FROM edital_submission_documents
        WHERE submission_id = $1
          AND requirement_code = $2
        ORDER BY uploaded_at ASC, id ASC
      `,
      [preSubmission.id, EDITAL_PHOTO_DOCUMENT_CODE]
    );

    if (photoDocs.length < EDITAL_MIN_PHOTO_COUNT) {
      return jsonResponse(
        {
          error: 'incomplete',
          missing: [
            {
              type: 'photo',
              required: EDITAL_MIN_PHOTO_COUNT,
              found: photoDocs.length,
            },
          ],
        },
        { status: 400 }
      );
    }

    const photoBuffers = await Promise.all(
      photoDocs.map(async (doc) => ({
        bytes: await getFileBytes(doc.s3_key),
        mimeType: doc.mime_type,
      }))
    );

    const photosPdfBuffer = await generateLabPhotosPdf(photoBuffers);
    const photosPdfHash = calculateFileHash(photosPdfBuffer);
    const photosPdfUpload = await uploadFile(
      photosPdfBuffer,
      `fotos-laboratorio-${preSubmission.id}.pdf`,
      'application/pdf',
      `edital-submissions/${preSubmission.id}`
    );

    // Gera o Termo de Comprovação de Participação (PDF) e envia para o S3.
    const pdfBuffer = await generateParticipationTermPdf({
      fullName: registration.full_name,
      cpf: registration.cpf,
      registrationDate: registration.created_at,
      submissionId: preSubmission.id,
    });

    const pdfHash = calculateFileHash(pdfBuffer);

    const upload = await uploadFile(
      pdfBuffer,
      `termo-participacao-${preSubmission.id}.pdf`,
      'application/pdf',
      `edital-submissions/${preSubmission.id}`
    );

    const result = await transaction(async (client) => {
      const submissionRows = (await client.query(
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
            lab_academic_unit,
            lab_structure_description,
            main_improvement_objective,
            technical_justification,
            expected_results
          FROM edital_submissions
          WHERE registration_id = $1
          FOR UPDATE
        `,
        [registrationId]
      )) as { rows: SubmissionRow[] };

      const submission = submissionRows.rows[0];

      if (!submission) {
        return { status: 'incomplete' as const, missing: computeMissingItems(null, []) };
      }

      if (submission.status === 'SUBMITTED') {
        return { status: 'already_submitted' as const };
      }

      const documentRows = (await client.query(
        `
          SELECT id, requirement_code
          FROM edital_submission_documents
          WHERE submission_id = $1
        `,
        [submission.id]
      )) as { rows: Array<{ id: number; requirement_code: string }> };

      const documentCodes = documentRows.rows.map((row) => row.requirement_code);
      const missing = computeMissingItems(submission, documentCodes);

      if (missing.length > 0) {
        return { status: 'incomplete' as const, missing };
      }

      const photosPdfRows = (await client.query(
        `
          INSERT INTO edital_submission_documents (
            submission_id,
            requirement_code,
            s3_key,
            file_hash,
            mime_type,
            size_bytes,
            original_filename
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          RETURNING id
        `,
        [
          submission.id,
          EDITAL_PHOTOS_PDF_DOCUMENT_CODE,
          photosPdfUpload.filePath,
          photosPdfHash,
          'application/pdf',
          photosPdfBuffer.length,
          `fotos-laboratorio-${submission.id}.pdf`,
        ]
      )) as { rows: Array<{ id: number }> };

      await client.query(
        `
          DELETE FROM edital_submission_documents
          WHERE submission_id = $1
            AND requirement_code = $2
        `,
        [submission.id, EDITAL_PHOTO_DOCUMENT_CODE]
      );

      const termDocumentRows = (await client.query(
        `
          INSERT INTO edital_submission_documents (
            submission_id,
            requirement_code,
            s3_key,
            file_hash,
            mime_type,
            size_bytes,
            original_filename
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          RETURNING id
        `,
        [
          submission.id,
          EDITAL_AUTO_GENERATED_DOCUMENT_CODE,
          upload.filePath,
          pdfHash,
          'application/pdf',
          pdfBuffer.length,
          `termo-participacao-${submission.id}.pdf`,
        ]
      )) as { rows: Array<{ id: number }> };

      const protocolNumber = await allocateEditalProtocolNumber(client);

      const updateRows = (await client.query(
        `
          UPDATE edital_submissions
          SET status = 'SUBMITTED',
              submitted_at = NOW(),
              updated_at = NOW(),
              protocol_number = $2
          WHERE id = $1
          RETURNING submitted_at, protocol_number
        `,
        [submission.id, protocolNumber]
      )) as { rows: Array<{ submitted_at: Date; protocol_number: string }> };

      const remainingDocs = documentRows.rows.filter(
        (row) => row.requirement_code !== EDITAL_PHOTO_DOCUMENT_CODE
      );

      return {
        status: 'ok' as const,
        submission,
        submittedAt: updateRows.rows[0].submitted_at,
        protocolNumber: updateRows.rows[0].protocol_number,
        documents: [
          ...remainingDocs,
          { id: photosPdfRows.rows[0].id, requirement_code: EDITAL_PHOTOS_PDF_DOCUMENT_CODE },
          { id: termDocumentRows.rows[0].id, requirement_code: EDITAL_AUTO_GENERATED_DOCUMENT_CODE },
        ],
        photoS3KeysToDelete: photoDocs.flatMap((doc) =>
          [doc.s3_key, doc.thumbnail_s3_key].filter((key): key is string => Boolean(key))
        ),
      };
    });

    if (result.status === 'already_submitted') {
      return jsonResponse({ error: 'already_submitted' }, { status: 409 });
    }

    if (result.status === 'incomplete') {
      return jsonResponse({ error: 'incomplete', missing: result.missing }, { status: 400 });
    }

    const submittedAtIso = result.submittedAt.toISOString();

    // Best-effort: remove fotos individuais (e thumbs) do S3 após o commit.
    for (const key of result.photoS3KeysToDelete) {
      deleteFile(key).catch((error) => {
        console.error(`[edital-proposta-enviar] Falha ao apagar foto S3 ${key}:`, error);
      });
    }

    // Links permanentes (via rotas de redirecionamento, nunca expiram do ponto de
    // vista de quem os usa) para a planilha de acompanhamento do time interno.
    const baseUrl = getPublicBaseUrl(request);
    const documentLinks: Record<string, string> = {};
    const photoLinks: string[] = [];

    for (const doc of result.documents) {
      const link = `${baseUrl}/api/editais/documento/${doc.id}/link`;
      documentLinks[doc.requirement_code] = link;
      if (doc.requirement_code === EDITAL_PHOTOS_PDF_DOCUMENT_CODE) {
        photoLinks.push(link);
      }
    }

    const sheetPayload = {
      id: result.submission.id,
      protocolNumber: result.protocolNumber,
      registrationId: result.submission.registration_id,
      status: 'SUBMITTED' as const,
      fullName: registration.full_name,
      cpf: registration.cpf,
      institutionName: result.submission.institution_name,
      institutionCnpj: result.submission.institution_cnpj,
      labName: result.submission.lab_name,
      labArea: result.submission.lab_area,
      labAcademicUnit: result.submission.lab_academic_unit,
      labStructureDescription: result.submission.lab_structure_description,
      mainImprovementObjective: result.submission.main_improvement_objective,
      teamDescription: result.submission.team_description,
      technicalJustification: result.submission.technical_justification,
      expectedResults: result.submission.expected_results,
      submittedAt: submittedAtIso,
      documentLinks,
      photoLinks,
      communityCertificateUrl: `${baseUrl}/api/editais/certificado/${result.submission.registration_id}/link`,
    };

    // Integrações best-effort, disparadas após o commit da transação.
    // Não podem falhar a resposta ao usuário (mesmo padrão de app/api/inscricoes/route.ts).
    appendEditalSubmissionToSheet(sheetPayload).catch((error) => {
      console.error('Erro na exportação assíncrona para Sheets:', error);
    });

    const webhookUrl = process.env.WEBHOOK_N8N_EDITAL_URL;
    if (webhookUrl) {
      (async () => {
        await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...sheetPayload,
            email: registration.email,
            adminReviewUrl: `${baseUrl}/admin/editais/${result.submission.id}`,
            source: 'edital-proposta',
          }),
        });
      })().catch((error) => {
        console.error('Erro no webhook N8N Edital (não afeta a submissão):', error);
      });
    } else {
      console.warn('WEBHOOK_N8N_EDITAL_URL não configurada. Ignorando envio ao N8N.');
    }

    return jsonResponse({
      ok: true,
      submittedAt: submittedAtIso,
      protocolNumber: result.protocolNumber,
    });
  } catch (error) {
    console.error('[edital-proposta-enviar] Erro ao enviar proposta:', error);
    return jsonResponse({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
