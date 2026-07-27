/**
 * POST /api/admin/editais/:id/desqualificar
 * Desqualifica manualmente uma proposta do Edital PPI, com motivo
 * obrigatório. Reversível via POST .../requalificar. Quem desqualificou vem
 * da sessão logada.
 */

import { NextRequest, NextResponse } from 'next/server';
import { applyNoStore, enforceRateLimit, isTrustedOrigin } from '@/lib/security';
import { query, queryOne } from '@/lib/db';
import { verifyAdminSessionToken, ADMIN_SESSION_COOKIE_NAME } from '@/lib/admin-auth';

function jsonResponse(body: unknown, init?: ResponseInit) {
  return applyNoStore(NextResponse.json(body, init));
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!isTrustedOrigin(request)) {
      return jsonResponse({ error: 'Origem não autorizada' }, { status: 403 });
    }

    const token = request.cookies.get(ADMIN_SESSION_COOKIE_NAME)?.value;
    const session = verifyAdminSessionToken(token);
    if (!session) {
      return jsonResponse({ error: 'Não autorizado' }, { status: 401 });
    }

    const rateLimit = enforceRateLimit(request, 'admin-editais-desqualificar', 30, 10 * 60 * 1000);
    if (!rateLimit.allowed) {
      return jsonResponse(
        { error: 'Muitas tentativas. Tente novamente em alguns minutos.' },
        { status: 429, headers: { 'Retry-After': rateLimit.retryAfterSeconds.toString() } }
      );
    }

    const { id } = await params;
    const submissionId = Number.parseInt(id, 10);
    if (!Number.isFinite(submissionId)) {
      return jsonResponse({ error: 'Proposta inválida' }, { status: 400 });
    }

    const existing = await queryOne<{ id: number }>(
      `SELECT id FROM edital_submissions WHERE id = $1 LIMIT 1`,
      [submissionId]
    );
    if (!existing) {
      return jsonResponse({ error: 'Proposta não encontrada' }, { status: 404 });
    }

    let body: { reason?: unknown };
    try {
      body = await request.json();
    } catch {
      return jsonResponse({ error: 'Requisição inválida' }, { status: 400 });
    }

    const reason = typeof body.reason === 'string' ? body.reason.trim() : '';
    if (!reason) {
      return jsonResponse({ error: 'Informe o motivo da desqualificação' }, { status: 400 });
    }

    await query(
      `UPDATE edital_submissions
       SET disqualified_at = NOW(),
           disqualified_reason = $1,
           disqualified_by = $2
       WHERE id = $3`,
      [reason, session.name, submissionId]
    );

    return jsonResponse({ ok: true });
  } catch (error) {
    console.error('[admin-editais-desqualificar] Erro ao desqualificar:', error);
    return jsonResponse({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
