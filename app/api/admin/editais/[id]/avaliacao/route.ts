/**
 * POST /api/admin/editais/:id/avaliacao
 * Registra (ou atualiza) a avaliação interna de uma proposta do Edital PPI:
 * uma nota por critério (item 10.2 do edital) e a nota final calculada no
 * servidor. Quem avaliou vem da sessão logada, não do corpo da requisição.
 */

import { NextRequest, NextResponse } from 'next/server';
import { applyNoStore, enforceRateLimit, isTrustedOrigin } from '@/lib/security';
import { query, queryOne } from '@/lib/db';
import { verifyAdminSessionToken, ADMIN_SESSION_COOKIE_NAME } from '@/lib/admin-auth';
import { validateEvaluationScores } from '@/lib/edital-evaluation';

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

    const rateLimit = enforceRateLimit(request, 'admin-editais-avaliacao', 30, 10 * 60 * 1000);
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

    let body: { scores?: unknown };
    try {
      body = await request.json();
    } catch {
      return jsonResponse({ error: 'Requisição inválida' }, { status: 400 });
    }

    if (!body.scores || typeof body.scores !== 'object') {
      return jsonResponse({ error: 'Notas ausentes' }, { status: 400 });
    }

    const result = validateEvaluationScores(body.scores as Record<string, unknown>);
    if (!result.valid) {
      return jsonResponse({ error: result.error }, { status: 400 });
    }

    await query(
      `UPDATE edital_submissions
       SET evaluation_scores = $1,
           evaluation_total_score = $2,
           evaluated_by = $3,
           evaluated_at = NOW()
       WHERE id = $4`,
      [JSON.stringify(body.scores), result.total, session.name, submissionId]
    );

    return jsonResponse({ ok: true, total: result.total });
  } catch (error) {
    console.error('[admin-editais-avaliacao] Erro ao salvar avaliação:', error);
    return jsonResponse({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
