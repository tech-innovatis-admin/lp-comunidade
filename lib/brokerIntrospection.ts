export const INTROSPECTION_CACHE_MS = 60_000;

export type BrokerSessionPayload = {
  sid: string;
  authz_version: number;
  sub: string;
  auth: 'broker';
};

type IntrospectionCacheEntry = {
  active: boolean;
  authzVersion: number;
  expiresAt: number;
};

const introspectionCache = new Map<string, IntrospectionCacheEntry>();
let introspectionCacheTtlMs = INTROSPECTION_CACHE_MS;

function env(name: string): string | undefined {
  return process.env[name]?.trim();
}

function brokerIssuer() {
  return (env('CENTRAL_OIDC_ISSUER') || 'https://hub.innovatismc.com').replace(/\/$/, '');
}

function brokerClientId() {
  return env('CENTRAL_OIDC_CLIENT_ID') || 'comunidade';
}

function brokerClientSecret() {
  return env('CENTRAL_OIDC_CLIENT_SECRET') ?? '';
}

export async function introspectCentralSession(
  sid: string,
): Promise<{ active: boolean; authz_version?: number }> {
  const clientSecret = brokerClientSecret();
  if (!clientSecret) {
    return { active: false };
  }

  const introspectionEndpoint = `${brokerIssuer()}/oidc/introspect`;
  const body = new URLSearchParams({
    token: sid,
    token_type_hint: 'access_token',
  });
  const authorization = `Basic ${Buffer.from(`${brokerClientId()}:${clientSecret}`).toString('base64')}`;

  const response = await fetch(introspectionEndpoint, {
    method: 'POST',
    headers: {
      'content-type': 'application/x-www-form-urlencoded',
      accept: 'application/json',
      authorization,
    },
    body,
  });

  if (!response.ok) {
    return { active: false };
  }

  const payload = (await response.json()) as {
    active?: boolean;
    authz_version?: number | string;
  };

  const authzVersion =
    typeof payload.authz_version === 'number'
      ? payload.authz_version
      : typeof payload.authz_version === 'string'
        ? Number.parseInt(payload.authz_version, 10)
        : undefined;

  return {
    active: payload.active === true,
    authz_version: Number.isFinite(authzVersion) ? authzVersion : undefined,
  };
}

export async function validateBrokerSession(session: BrokerSessionPayload): Promise<boolean> {
  const now = Date.now();
  const cached = introspectionCache.get(session.sid);
  if (cached && cached.expiresAt > now) {
    return cached.active && cached.authzVersion === session.authz_version;
  }

  const result = await introspectCentralSession(session.sid);
  introspectionCache.set(session.sid, {
    active: result.active,
    authzVersion: result.authz_version ?? session.authz_version,
    expiresAt: now + introspectionCacheTtlMs,
  });

  if (!result.active) {
    return false;
  }
  if (
    result.authz_version !== undefined &&
    result.authz_version !== session.authz_version
  ) {
    return false;
  }
  return true;
}
