import { NextRequest } from 'next/server';

function normalizeBaseUrl(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }

  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

function isLocalhostOrPrivateHost(hostname: string): boolean {
  return (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '::1' ||
    hostname.startsWith('10.') ||
    hostname.startsWith('192.168.') ||
    hostname.startsWith('169.254.') ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(hostname)
  );
}

function getRequestHost(request: NextRequest): string {
  const forwardedHost = request.headers.get('x-forwarded-host');
  if (forwardedHost) {
    return forwardedHost.split(',')[0].trim();
  }

  const host = request.headers.get('host');
  if (host) {
    return host.trim();
  }

  return request.nextUrl.host;
}

function getForwardedOrigin(request: NextRequest): string | null {
  const forwardedHost = request.headers.get('x-forwarded-host');

  if (!forwardedHost) {
    return null;
  }

  const host = forwardedHost.split(',')[0].trim();
  const forwardedProto = request.headers.get('x-forwarded-proto') || 'https';
  const protocol = isLocalhostOrPrivateHost(host.split(':')[0]) ? 'http' : forwardedProto;

  try {
    return new URL(`${protocol}://${host}`).origin;
  } catch {
    return null;
  }
}

/**
 * Resolve a base pública estável para montar links absolutos.
 *
 * Ordem de prioridade:
 * 1. `PUBLIC_BASE_URL`, quando configurada corretamente.
 * 2. Origem indicada pelo proxy (`x-forwarded-host` / `x-forwarded-proto`).
 * 3. Origem observada pela própria request.
 */
export function getPublicBaseUrl(request: NextRequest): string {
  const requestOrigin = request.nextUrl.origin;
  const requestHost = getRequestHost(request);

  if (isLocalhostOrPrivateHost(request.nextUrl.hostname) || isLocalhostOrPrivateHost(requestHost.split(':')[0])) {
    if (requestOrigin.startsWith('https://')) {
      return requestOrigin.replace(/^https:/, 'http:');
    }

    return requestOrigin;
  }

  return (
    normalizeBaseUrl(process.env.PUBLIC_BASE_URL) ||
    getForwardedOrigin(request) ||
    requestOrigin
  );
}
