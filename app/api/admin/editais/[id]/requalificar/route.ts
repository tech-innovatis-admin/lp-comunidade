/**
 * POST /api/admin/editais/:id/requalificar
 * Reverte a desqualificação de uma proposta do Edital PPI (limpa os campos
 * de desqualificação). Não recupera o motivo anterior.
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

    const rateLimit = enforceRateLimit(request, 'admin-editais-requalificar', 30, 10 * 60 * 1000);
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

    await query(
      `UPDATE edital_submissions
       SET disqualified_at = NULL,
           disqualified_reason = NULL,
           disqualified_by = NULL
       WHERE id = $1`,
      [submissionId]
    );

    return jsonResponse({ ok: true });
  } catch (error) {
    console.error('[admin-editais-requalificar] Erro ao reverter desqualificação:', error);
    return jsonResponse({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
