/**
 * POST /api/admin/login
 * Autentica o time interno no painel admin via senha única compartilhada
 * (placeholder — ver lib/admin-auth.ts para o plano de substituição).
 */

import { NextRequest, NextResponse } from 'next/server';
import * as crypto from 'crypto';
import { applyNoStore, enforceRateLimit, isTrustedOrigin } from '@/lib/security';
import { createAdminSessionToken, ADMIN_SESSION_COOKIE_NAME } from '@/lib/admin-auth';

function jsonResponse(body: unknown, init?: ResponseInit) {
  return applyNoStore(NextResponse.json(body, init));
}

function passwordMatches(candidate: string, expected: string): boolean {
  const candidateBuffer = Buffer.from(candidate);
  const expectedBuffer = Buffer.from(expected);

  if (candidateBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(candidateBuffer, expectedBuffer);
}

export async function POST(request: NextRequest) {
  try {
    if (!isTrustedOrigin(request)) {
      return jsonResponse({ error: 'Origem não autorizada' }, { status: 403 });
    }

    const rateLimit = enforceRateLimit(request, 'admin-login', 5, 15 * 60 * 1000);
    if (!rateLimit.allowed) {
      return jsonResponse(
        { error: 'Muitas tentativas. Tente novamente em alguns minutos.' },
        {
          status: 429,
          headers: { 'Retry-After': rateLimit.retryAfterSeconds.toString() },
        }
      );
    }

    let body: { password?: unknown };
    try {
      body = await request.json();
    } catch {
      return jsonResponse({ error: 'Requisição inválida' }, { status: 400 });
    }

    const password = typeof body.password === 'string' ? body.password : '';
    const expectedPassword = process.env.ADMIN_PASSWORD;

    if (!expectedPassword) {
      console.error('[admin-login] ADMIN_PASSWORD não configurada');
      return jsonResponse({ error: 'Erro interno do servidor' }, { status: 500 });
    }

    if (!password || !passwordMatches(password, expectedPassword)) {
      return jsonResponse({ error: 'Senha incorreta' }, { status: 401 });
    }

    const token = createAdminSessionToken();
    const response = jsonResponse({ ok: true });

    response.cookies.set(ADMIN_SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('[admin-login] Erro ao autenticar:', error);
    return jsonResponse({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
