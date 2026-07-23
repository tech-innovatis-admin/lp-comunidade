/**
 * Token assinado (HMAC-SHA256) para a sessão do painel admin.
 * Placeholder de autenticação por senha única compartilhada — quando a
 * integração com o hub de plataformas (banco de usuários + tag "edital")
 * estiver pronta, a troca deve viver majoritariamente neste arquivo e no
 * fluxo de login em app/api/admin/login/route.ts. Porém, verifyAdminSessionToken()
 * hoje é síncrona e não carrega identidade — uma verificação real por usuário
 * provavelmente precisará virar async, o que exigiria adicionar `await` em
 * todos os chamadores (app/admin/editais/page.tsx, app/admin/editais/[id]/page.tsx
 * e as duas rotas /link).
 */

import * as crypto from 'crypto';

export const ADMIN_SESSION_COOKIE_NAME = 'admin_session';

interface AdminTokenPayload {
  iat: number;
  exp: number;
}

const TOKEN_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 dias
const DEV_FALLBACK_SECRET = 'dev-only-insecure-admin-secret-do-not-use-in-production';

function getSecret(): string {
  const secret = process.env.ADMIN_TOKEN_SECRET;

  if (secret) {
    return secret;
  }

  if (process.env.NODE_ENV === 'production') {
    throw new Error('ADMIN_TOKEN_SECRET não configurado em produção');
  }

  console.warn(
    '[admin-auth] ADMIN_TOKEN_SECRET ausente — usando segredo inseguro de desenvolvimento. ' +
    'Configure ADMIN_TOKEN_SECRET antes de ir para produção.'
  );
  return DEV_FALLBACK_SECRET;
}

function sign(encodedPayload: string): string {
  return crypto.createHmac('sha256', getSecret()).update(encodedPayload).digest('base64url');
}

export function createAdminSessionToken(): string {
  const now = Math.floor(Date.now() / 1000);
  const payload: AdminTokenPayload = {
    iat: now,
    exp: now + TOKEN_TTL_SECONDS,
  };

  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = sign(encodedPayload);
  return `${encodedPayload}.${signature}`;
}

export function verifyAdminSessionToken(token: string | undefined | null): boolean {
  if (!token || typeof token !== 'string') {
    return false;
  }

  const parts = token.split('.');
  if (parts.length !== 2) {
    return false;
  }

  const [encodedPayload, signature] = parts;
  const expectedSignature = sign(encodedPayload);

  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);

  if (signatureBuffer.length !== expectedBuffer.length) {
    return false;
  }

  if (!crypto.timingSafeEqual(signatureBuffer, expectedBuffer)) {
    return false;
  }

  let payload: AdminTokenPayload;
  try {
    payload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf-8'));
  } catch {
    return false;
  }

  if (typeof payload.exp !== 'number') {
    return false;
  }

  const now = Math.floor(Date.now() / 1000);
  return payload.exp >= now;
}
