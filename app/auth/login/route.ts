import { NextRequest, NextResponse } from 'next/server';
import * as client from 'openid-client';

import {
  brokerEnabled,
  centralOidcConfigured,
  cognitoEnabled,
} from '@/lib/authMode';
import {
  buildCentralAuthorizeUrl,
  CentralOidcConfigError,
  cookieSecure,
  encryptTransaction,
  publicAppOrigin,
  TRANSACTION_COOKIE,
  TRANSACTION_MAX_AGE,
} from '@/lib/centralOidc';
import {
  buildAuthorizeUrl,
  CognitoConfigError,
  createNonce,
  createOAuthState,
  createPkcePair,
  encodeOAuthCookie,
  REAUTH_COOKIE,
  reauthCookieOptions,
  type AuthorizePrompt,
} from '@/lib/cognitoOidc';
import { safeReturnTo } from '@/lib/redirectTarget';

const OAUTH_COOKIE = 'comunidade_oauth';
const DEFAULT_NEXT = '/admin/editais?tab=pendentes';

function sessionCookieOptions(maxAge = 0) {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: cookieSecure(),
    path: '/',
    maxAge,
  };
}

export async function GET(request: NextRequest) {
  if (brokerEnabled() && centralOidcConfigured()) {
    return brokerLogin(request);
  }

  if (!cognitoEnabled()) {
    return NextResponse.redirect(new URL('/admin/login', publicAppOrigin(request)));
  }

  return cognitoLogin(request);
}

async function brokerLogin(request: NextRequest) {
  try {
    const returnTo = safeReturnTo(
      request.nextUrl.searchParams.get('returnTo'),
      DEFAULT_NEXT,
    );
    const codeVerifier = client.randomPKCECodeVerifier();
    const codeChallenge = await client.calculatePKCECodeChallenge(codeVerifier);
    const state = client.randomState();
    const nonce = client.randomNonce();
    const authorizeUrl = await buildCentralAuthorizeUrl({
      state,
      nonce,
      codeChallenge,
    });

    const response = NextResponse.redirect(authorizeUrl);
    response.cookies.set(
      TRANSACTION_COOKIE,
      await encryptTransaction({
        state,
        nonce,
        code_verifier: codeVerifier,
        returnTo,
      }),
      sessionCookieOptions(TRANSACTION_MAX_AGE),
    );
    return response;
  } catch (error) {
    const message =
      error instanceof CentralOidcConfigError ? error.message : 'Falha ao iniciar SSO central.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

async function cognitoLogin(request: NextRequest) {
  try {
    const resume =
      request.nextUrl.searchParams.get('resume') === '1' ||
      request.cookies.get(REAUTH_COOKIE)?.value === '1';
    const prompt: AuthorizePrompt = resume ? 'login' : 'none';
    const { verifier, challenge } = createPkcePair();
    const state = createOAuthState();
    const nonce = createNonce();
    const authorizeUrl = buildAuthorizeUrl({
      state,
      nonce,
      codeChallenge: challenge,
      prompt,
    });

    const response = NextResponse.redirect(authorizeUrl);
    response.cookies.set(REAUTH_COOKIE, '', reauthCookieOptions(0));
    response.cookies.set(
      OAUTH_COOKIE,
      encodeOAuthCookie({
        state,
        nonce,
        code_verifier: verifier,
      }),
      sessionCookieOptions(600),
    );
    return response;
  } catch (error) {
    const message =
      error instanceof CognitoConfigError ? error.message : 'Falha ao iniciar SSO.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
