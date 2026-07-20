import { NextRequest, NextResponse } from 'next/server';
import { queryOne, transaction } from '@/lib/db';
import { applyNoStore, enforceRateLimit, isTrustedOrigin } from '@/lib/security';
import { verifyEditalToken } from '@/lib/edital-auth';
import { getSignedFileUrl } from '@/lib/s3';

type DocumentOwnerRow = {
  id: number;
  submission_id: number;
  s3_key: string;
  requirement_code: string;
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

async function loadDocument(documentId: number) {
  return queryOne<DocumentOwnerRow>(
    `
      SELECT
        d.id,
        d.submission_id,
        d.s3_key,
        d.requirement_code,
        s.registration_id,
        s.status
      FROM edital_submission_documents d
      INNER JOIN edital_submissions s ON s.id = d.submission_id
      WHERE d.id = $1
      LIMIT 1
    `,
    [documentId]
  );
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!isTrustedOrigin(request)) {
      return jsonResponse({ error: 'Origem não autorizada' }, { status: 403 });
    }

    const rateLimit = enforceRateLimit(request, 'edital-proposta-documento', 30, 10 * 60 * 1000, 'get');
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

    const { id } = await params;
    const documentId = Number.parseInt(id, 10);
    if (!Number.isFinite(documentId)) {
      return jsonResponse({ error: 'Documento inválido' }, { status: 400 });
    }

    const document = await loadDocument(documentId);
    if (!document || document.registration_id !== registrationId) {
      return jsonResponse({ error: 'Documento não encontrado' }, { status: 404 });
    }

    const url = await getSignedFileUrl(document.s3_key, 900);

    return jsonResponse({
      ok: true,
      url,
    });
  } catch (error) {
    console.error('[edital-proposta-documento] Erro ao gerar URL assinada:', error);
    return jsonResponse({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!isTrustedOrigin(request)) {
      return jsonResponse({ error: 'Origem não autorizada' }, { status: 403 });
    }

    const rateLimit = enforceRateLimit(request, 'edital-proposta-documento', 30, 10 * 60 * 1000, 'delete');
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

    const { id } = await params;
    const documentId = Number.parseInt(id, 10);
    if (!Number.isFinite(documentId)) {
      return jsonResponse({ error: 'Documento inválido' }, { status: 400 });
    }

    const result = await transaction(async (client) => {
      const document = await client.query(
        `
          SELECT
            d.id,
            d.submission_id,
            s.registration_id,
            s.status
          FROM edital_submission_documents d
          INNER JOIN edital_submissions s ON s.id = d.submission_id
          WHERE d.id = $1
          FOR UPDATE
        `,
        [documentId]
      ) as { rows: Array<{ id: number; submission_id: number; registration_id: number; status: 'DRAFT' | 'SUBMITTED' }> };

      const row = document.rows[0];
      if (!row || row.registration_id !== registrationId || row.status === 'SUBMITTED') {
        return { found: false as const };
      }

      await client.query(
        `
          DELETE FROM edital_submission_documents
          WHERE id = $1
          AND submission_id = $2
        `,
        [documentId, row.submission_id]
      );

      return { found: true as const };
    });

    if (!result.found) {
      return jsonResponse({ error: 'Documento não encontrado' }, { status: 404 });
    }

    return jsonResponse({ ok: true });
  } catch (error) {
    console.error('[edital-proposta-documento] Erro ao remover documento:', error);
    return jsonResponse({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
