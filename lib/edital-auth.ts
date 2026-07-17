/**
 * Token assinado (HMAC-SHA256) para a sessão do gate de validação do Edital PPI.
 * Sem dependência nova: usa crypto nativo do Node, no mesmo estilo de lib/utils.ts.
 */

import * as crypto from 'crypto';

export interface EditalTokenPayload {
  registrationId: number;
  iat: number;
  exp: number;
}

const TOKEN_TTL_SECONDS = 60 * 60; // 1h
const DEV_FALLBACK_SECRET = 'dev-only-insecure-edital-secret-do-not-use-in-production';

function getSecret(): string {
  const secret = process.env.EDITAL_TOKEN_SECRET;

  if (secret) {
    return secret;
  }

  if (process.env.NODE_ENV === 'production') {
    throw new Error('EDITAL_TOKEN_SECRET não configurado em produção');
  }

  console.warn(
    '[edital-auth] EDITAL_TOKEN_SECRET ausente — usando segredo inseguro de desenvolvimento. ' +
    'Configure EDITAL_TOKEN_SECRET antes de ir para produção.'
  );
  return DEV_FALLBACK_SECRET;
}

function sign(encodedPayload: string): string {
  return crypto.createHmac('sha256', getSecret()).update(encodedPayload).digest('base64url');
}

export function createEditalToken(registrationId: number): string {
  const now = Math.floor(Date.now() / 1000);
  const payload: EditalTokenPayload = {
    registrationId,
    iat: now,
    exp: now + TOKEN_TTL_SECONDS,
  };

  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = sign(encodedPayload);
  return `${encodedPayload}.${signature}`;
}

export function verifyEditalToken(token: string): number | null {
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

  let payload: EditalTokenPayload;
  try {
    payload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf-8'));
  } catch {
    return null;
  }

  if (typeof payload.registrationId !== 'number' || typeof payload.exp !== 'number') {
    return null;
  }

  const now = Math.floor(Date.now() / 1000);
  if (payload.exp < now) {
    return null;
  }

  return payload.registrationId;
}
