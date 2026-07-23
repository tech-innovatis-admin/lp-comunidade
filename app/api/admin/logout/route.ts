/**
 * POST /api/admin/logout
 * Limpa a sessão do painel admin.
 */

import { NextRequest, NextResponse } from 'next/server';
import { applyNoStore, isTrustedOrigin } from '@/lib/security';
import { ADMIN_SESSION_COOKIE_NAME } from '@/lib/admin-auth';

export async function POST(request: NextRequest) {
  if (!isTrustedOrigin(request)) {
    return applyNoStore(NextResponse.json({ error: 'Origem não autorizada' }, { status: 403 }));
  }

  const response = applyNoStore(NextResponse.json({ ok: true }));
  response.cookies.delete(ADMIN_SESSION_COOKIE_NAME);
  return response;
}
