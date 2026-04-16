import { NextRequest, NextResponse } from 'next/server';
import { getClientIP } from './utils';

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

declare global {
  var __rateLimitStore: Map<string, RateLimitEntry> | undefined;
}

const rateLimitStore = globalThis.__rateLimitStore ?? new Map<string, RateLimitEntry>();

if (!globalThis.__rateLimitStore) {
  globalThis.__rateLimitStore = rateLimitStore;
}

const DANGEROUS_HTML_PATTERN = /<(script|iframe|object|embed|form|input|button|textarea|select|svg|math|link|meta)\b|on\w+\s*=|javascript:|data:text\/html|vbscript:/i;
const DANGEROUS_INPUT_PATTERN = /<\s*script|<\s*iframe|<\s*svg|javascript:|data:text\/html|vbscript:|onerror\s*=|onload\s*=|onclick\s*=/i;

function normalizeOrigin(value: string | null): string | null {
  if (!value) {
    return null;
  }

  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

function getAllowedOrigins(request: NextRequest): Set<string> {
  const origins = new Set<string>();
  const requestOrigin = normalizeOrigin(request.nextUrl.origin);
  const publicOrigin = normalizeOrigin(process.env.PUBLIC_BASE_URL ?? null);
  const forwardedHost = request.headers.get('x-forwarded-host');
  const forwardedProto = request.headers.get('x-forwarded-proto') || 'https';

  if (requestOrigin) {
    origins.add(requestOrigin);
  }

  if (publicOrigin) {
    origins.add(publicOrigin);
  }

  if (forwardedHost) {
    const forwardedOrigin = normalizeOrigin(`${forwardedProto}://${forwardedHost}`);
    if (forwardedOrigin) {
      origins.add(forwardedOrigin);
    }
  }

  if (process.env.NODE_ENV !== 'production') {
    origins.add('http://localhost:3000');
    origins.add('http://127.0.0.1:3000');
    origins.add('http://localhost:3001');
    origins.add('http://127.0.0.1:3001');
  }

  return origins;
}

function isPrivateIp(ip: string): boolean {
  return (
    ip === '127.0.0.1' ||
    ip === '::1' ||
    ip === 'localhost' ||
    ip.startsWith('10.') ||
    ip.startsWith('192.168.') ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(ip)
  );
}

export function isTrustedOrigin(request: NextRequest): boolean {
  const allowedOrigins = getAllowedOrigins(request);
  const origin = normalizeOrigin(request.headers.get('origin'));
  const referer = normalizeOrigin(request.headers.get('referer'));

  if (origin && allowedOrigins.has(origin)) {
    return true;
  }

  if (referer && allowedOrigins.has(referer)) {
    return true;
  }

  return false;
}

export function isInternalRequest(request: NextRequest): boolean {
  const hostname = request.nextUrl.hostname;
  const clientIp = getClientIP(request.headers);

  if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1') {
    return true;
  }

  return isPrivateIp(clientIp);
}

export function applyNoStore<T extends NextResponse>(response: T): T {
  response.headers.set('Cache-Control', 'no-store, no-cache, max-age=0, must-revalidate');
  response.headers.set('Pragma', 'no-cache');
  response.headers.set('Expires', '0');
  return response;
}

export function containsDangerousHtml(value: string): boolean {
  return DANGEROUS_HTML_PATTERN.test(value);
}

export function containsDangerousInput(value: string): boolean {
  return DANGEROUS_INPUT_PATTERN.test(value);
}

export function getContentLength(request: NextRequest): number | null {
  const contentLength = request.headers.get('content-length');

  if (!contentLength) {
    return null;
  }

  const parsed = Number.parseInt(contentLength, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

export function enforceRateLimit(
  request: NextRequest,
  bucket: string,
  maxRequests: number,
  windowMs: number,
  extraKey: string = ''
): { allowed: boolean; retryAfterSeconds: number } {
  const now = Date.now();
  const clientIp = getClientIP(request.headers);
  const userAgent = request.headers.get('user-agent') || 'unknown';
  const key = `${bucket}:${clientIp}:${userAgent}:${extraKey}`;

  for (const [storeKey, entry] of rateLimitStore.entries()) {
    if (entry.resetAt <= now) {
      rateLimitStore.delete(storeKey);
    }
  }

  const existing = rateLimitStore.get(key);

  if (!existing || existing.resetAt <= now) {
    rateLimitStore.set(key, {
      count: 1,
      resetAt: now + windowMs,
    });
    return { allowed: true, retryAfterSeconds: 0 };
  }

  if (existing.count >= maxRequests) {
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
    };
  }

  existing.count += 1;
  rateLimitStore.set(key, existing);
  return { allowed: true, retryAfterSeconds: 0 };
}

export function hasValidFileSignature(buffer: Buffer, mimeType: string): boolean {
  const fileType = mimeType.toLowerCase();

  if (fileType === 'application/pdf') {
    return buffer.length >= 5 && buffer.subarray(0, 5).equals(Buffer.from([0x25, 0x50, 0x44, 0x46, 0x2d]));
  }

  if (fileType === 'image/png') {
    return buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  }

  if (fileType === 'image/jpeg' || fileType === 'image/jpg') {
    return buffer.length >= 3 && buffer.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]));
  }

  if (fileType === 'image/webp') {
    return (
      buffer.length >= 12 &&
      buffer.subarray(0, 4).equals(Buffer.from('RIFF')) &&
      buffer.subarray(8, 12).equals(Buffer.from('WEBP'))
    );
  }

  return false;
}
