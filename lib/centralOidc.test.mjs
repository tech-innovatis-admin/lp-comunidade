import assert from 'node:assert/strict';
import { test } from 'node:test';

const CLAIM_USER_ID = 'https://innovatis.com/claims/user_id';
const CLAIM_PLATFORMS = 'https://innovatis.com/claims/platforms';
const PLATFORM_CODE = 'edital-admin';

function parseCentralClaims(claims) {
  const sub = typeof claims.sub === 'string' ? claims.sub : '';
  const sid = typeof claims.sid === 'string' ? claims.sid : '';
  if (!sub || !sid) {
    throw new Error('ID token missing sub or sid');
  }

  const platformsRaw = claims[CLAIM_PLATFORMS];
  const platforms = Array.isArray(platformsRaw)
    ? platformsRaw.filter((entry) => typeof entry === 'string')
    : [];

  const userIdRaw = claims[CLAIM_USER_ID];
  const userId =
    typeof userIdRaw === 'number'
      ? userIdRaw
      : typeof userIdRaw === 'string'
        ? Number.parseInt(userIdRaw, 10)
        : null;

  return { sub, sid, userId, platforms };
}

function hasCentralPlatformAccess(identity, platformCode = PLATFORM_CODE) {
  return identity.platforms.includes(platformCode);
}

function safeReturnTo(raw, fallback) {
  if (!raw || !raw.startsWith('/') || raw.startsWith('//')) {
    return fallback;
  }
  return raw;
}

test('parseCentralClaims exige plataforma edital-admin', () => {
  const identity = parseCentralClaims({
    sub: 'broker-sub',
    sid: 'broker-sid',
    [CLAIM_USER_ID]: 12,
    [CLAIM_PLATFORMS]: ['edital-admin'],
  });
  assert.equal(identity.userId, 12);
  assert.equal(hasCentralPlatformAccess(identity), true);
});

test('hasCentralPlatformAccess rejeita usuario sem edital-admin', () => {
  const identity = parseCentralClaims({
    sub: 'broker-sub',
    sid: 'broker-sid',
    [CLAIM_USER_ID]: 12,
    [CLAIM_PLATFORMS]: ['hub'],
  });
  assert.equal(hasCentralPlatformAccess(identity), false);
});

test('safeReturnTo bloqueia open redirect', () => {
  assert.equal(safeReturnTo('/admin/editais', '/admin/login'), '/admin/editais');
  assert.equal(safeReturnTo('https://evil.test', '/admin/login'), '/admin/login');
});
