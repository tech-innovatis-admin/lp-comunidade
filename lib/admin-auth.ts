/**
 * Token assinado (HMAC-SHA256) para a sessão do painel admin, carregando a
 * identidade de quem logou (id/username/name da tabela `users` compartilhada
 * — ver lib/platforms-db.ts). Antes, este token não carregava identidade e
 * validava só uma senha única (ADMIN_PASSWORD); esse esquema foi removido.
 */

import * as crypto from 'crypto';

export const ADMIN_SESSION_COOKIE_NAME = 'admin_session';

export interface AdminSessionIdentity {
  userId: number;
  username: string;
  name: string;
}

interface AdminTokenPayload extends AdminSessionIdentity {
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

export function createAdminSessionToken(identity: AdminSessionIdentity): string {
  const now = Math.floor(Date.now() / 1000);
  const payload: AdminTokenPayload = {
    ...identity,
    iat: now,
    exp: now + TOKEN_TTL_SECONDS,
  };

  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = sign(encodedPayload);
  return `${encodedPayload}.${signature}`;
}

export function verifyAdminSessionToken(token: string | undefined | null): AdminSessionIdentity | null {
  if (!token || typeof token !== 'string') {
    return null;
  }

  const parts = token.split('.');
  if (parts.length !== 2) {
    return null;
  }

  const [encodedPayload, signature] = parts;
  const expectedSignature = sign(encodedPayload);

  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);

  if (signatureBuffer.length !== expectedBuffer.length) {
    return null;
  }

  if (!crypto.timingSafeEqual(signatureBuffer, expectedBuffer)) {
    return null;
  }

  let payload: AdminTokenPayload;
  try {
    payload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf-8'));
  } catch {
    return null;
  }

  if (
    typeof payload.exp !== 'number' ||
    typeof payload.userId !== 'number' ||
    typeof payload.name !== 'string'
  ) {
    return null;
  }

  const now = Math.floor(Date.now() / 1000);
  if (payload.exp < now) {
    return null;
  }

  return { userId: payload.userId, username: payload.username, name: payload.name };
}
