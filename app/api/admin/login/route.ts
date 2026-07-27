/**
 * POST /api/admin/login
 * Autentica o time interno no painel admin contra a tabela `users`
 * compartilhada entre plataformas Innovatis (lib/platforms-db.ts) — só
 * usuários com a tag "edital-admin" em `platforms` entram.
 */

import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { applyNoStore, enforceRateLimit, isTrustedOrigin } from '@/lib/security';
import { createAdminSessionToken, ADMIN_SESSION_COOKIE_NAME } from '@/lib/admin-auth';
import { findPlatformUserByUsername } from '@/lib/platforms-db';

const REQUIRED_PLATFORM_TAG = 'edital-admin';

function jsonResponse(body: unknown, init?: ResponseInit) {
  return applyNoStore(NextResponse.json(body, init));
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

    let body: { username?: unknown; password?: unknown };
    try {
      body = await request.json();
    } catch {
      return jsonResponse({ error: 'Requisição inválida' }, { status: 400 });
    }

    const username = typeof body.username === 'string' ? body.username.trim() : '';
    const password = typeof body.password === 'string' ? body.password : '';

    if (!username || !password) {
      return jsonResponse({ error: 'Credenciais inválidas ou sem acesso a este painel' }, { status: 401 });
    }

    const genericError = () =>
      jsonResponse({ error: 'Credenciais inválidas ou sem acesso a este painel' }, { status: 401 });

    const user = await findPlatformUserByUsername(username);
    if (!user || !(user.platforms || []).includes(REQUIRED_PLATFORM_TAG)) {
      return genericError();
    }

    const passwordMatches = await bcrypt.compare(password, user.hash);
    if (!passwordMatches) {
      return genericError();
    }

    const token = createAdminSessionToken({
      userId: user.id,
      username: user.username || username,
      name: user.name,
    });
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
