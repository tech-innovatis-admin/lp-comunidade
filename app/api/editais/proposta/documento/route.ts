import { randomUUID } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db';
import { calculateFileHash } from '@/lib/utils';
import { applyNoStore, enforceRateLimit, hasValidFileSignature, isTrustedOrigin } from '@/lib/security';
import { verifyEditalToken } from '@/lib/edital-auth';
import {
  EDITAL_MAX_DOCUMENT_BYTES,
  EDITAL_MAX_PHOTO_BYTES,
  EDITAL_MAX_PHOTO_COUNT,
  EDITAL_PHOTO_DOCUMENT_CODE,
  EditalDocumentRequirementCode,
  isEditalDocumentRequirementCode,
  isPhotoDocumentCode,
} from '@/lib/edital-requirements';
import { uploadFileToKey } from '@/lib/s3';

type SubmissionRow = {
  id: number;
  registration_id: number;
  status: 'DRAFT' | 'SUBMITTED';
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

function sanitizeFilename(fileName: string): string {
  return fileName.replace(/[^\w.\-() ]/g, '_').slice(0, 255);
}

async function getOrCreateSubmissionId(registrationId: number): Promise<number> {
  const existing = await queryOne<SubmissionRow>(
    `
      SELECT id, registration_id, status
      FROM edital_submissions
      WHERE registration_id = $1
      LIMIT 1
    `,
    [registrationId]
  );

  if (existing) {
    if (existing.status === 'SUBMITTED') {
      throw new Error('already_submitted');
    }

    return existing.id;
  }

  await query(
    `
      INSERT INTO edital_submissions (registration_id)
      VALUES ($1)
      ON CONFLICT (registration_id) DO NOTHING
    `,
    [registrationId]
  );

  const created = await queryOne<SubmissionRow>(
    `
      SELECT id, registration_id, status
      FROM edital_submissions
      WHERE registration_id = $1
      LIMIT 1
    `,
    [registrationId]
  );

  if (!created) {
    throw new Error('Não foi possível localizar ou criar a submissão');
  }

  return created.id;
}

async function getSubmissionPhotoCount(submissionId: number): Promise<number> {
  const row = await queryOne<{ count: string }>(
    `
      SELECT COUNT(*)::text AS count
      FROM edital_submission_documents
      WHERE submission_id = $1
      AND requirement_code = $2
    `,
    [submissionId, EDITAL_PHOTO_DOCUMENT_CODE]
  );

  return Number.parseInt(row?.count || '0', 10);
}

function validateDocumentFile(requirementCode: EditalDocumentRequirementCode, file: File, buffer: Buffer) {
  if (isPhotoDocumentCode(requirementCode)) {
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type.toLowerCase())) {
      throw new Error('Formato de foto inválido');
    }

    if (buffer.length > EDITAL_MAX_PHOTO_BYTES) {
      throw new Error('Foto acima do limite permitido');
    }

    if (!hasValidFileSignature(buffer, file.type)) {
      throw new Error('Assinatura da foto inválida');
    }

    return;
  }

  if (file.type.toLowerCase() !== 'application/pdf') {
    throw new Error('Documento deve ser PDF');
  }

  if (buffer.length > EDITAL_MAX_DOCUMENT_BYTES) {
    throw new Error('PDF acima do limite permitido');
  }

  if (!hasValidFileSignature(buffer, file.type)) {
    throw new Error('Assinatura do PDF inválida');
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!isTrustedOrigin(request)) {
      return jsonResponse({ error: 'Origem não autorizada' }, { status: 403 });
    }

    const rateLimit = enforceRateLimit(request, 'edital-proposta-documento', 30, 10 * 60 * 1000, 'post');
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

    const contentType = request.headers.get('content-type') || '';
    if (!contentType.toLowerCase().startsWith('multipart/form-data')) {
      return jsonResponse({ error: 'Tipo de requisição inválido' }, { status: 415 });
    }

    const formData = await request.formData();
    const requirementCode = formData.get('requirementCode')?.toString() || '';
    const file = formData.get('file') as File | null;

    if (!file) {
      return jsonResponse({ error: 'Arquivo obrigatório' }, { status: 400 });
    }

    if (!isEditalDocumentRequirementCode(requirementCode)) {
      return jsonResponse({ error: 'requirementCode inválido' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    validateDocumentFile(requirementCode, file, buffer);

    const submissionId = await getOrCreateSubmissionId(registrationId);

    if (isPhotoDocumentCode(requirementCode)) {
      const photoCount = await getSubmissionPhotoCount(submissionId);
      if (photoCount >= EDITAL_MAX_PHOTO_COUNT) {
        return jsonResponse({ error: 'Limite máximo de fotos atingido' }, { status: 400 });
      }
    }

    const sanitizedFilename = sanitizeFilename(file.name || 'documento');
    const fileHash = calculateFileHash(buffer);
    const s3Key = `edital-submissions/${submissionId}/${randomUUID()}-${requirementCode}`;

    const upload = await uploadFileToKey(buffer, s3Key, file.type || 'application/octet-stream');

    const documentId = isPhotoDocumentCode(requirementCode)
      ? await queryOne<{ id: number }>(
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
            submissionId,
            requirementCode,
            upload.filePath,
            fileHash,
            file.type || 'application/octet-stream',
            buffer.length,
            sanitizedFilename,
          ]
        )
      : await queryOne<{ id: number }>(
          `
            WITH deleted AS (
              DELETE FROM edital_submission_documents
              WHERE submission_id = $1
              AND requirement_code = $2
            )
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
            submissionId,
            requirementCode,
            upload.filePath,
            fileHash,
            file.type || 'application/octet-stream',
            buffer.length,
            sanitizedFilename,
          ]
        );

    if (!documentId) {
      return jsonResponse({ error: 'Não foi possível registrar o documento' }, { status: 500 });
    }

    return jsonResponse({
      ok: true,
      documentId: documentId.id,
      requirementCode,
      filename: sanitizedFilename,
    });
  } catch (error) {
    console.error('[edital-proposta-documento] Erro ao enviar documento:', error);
    if (error instanceof Error && error.message === 'already_submitted') {
      return jsonResponse({ error: 'already_submitted' }, { status: 409 });
    }
    if (error instanceof Error) {
      return jsonResponse({ error: error.message }, { status: 400 });
    }
    return jsonResponse({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
