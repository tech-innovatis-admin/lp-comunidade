import { NextRequest, NextResponse } from 'next/server';

import {
  createAdminSessionToken,
  ADMIN_SESSION_COOKIE_NAME,
} from '@/lib/admin-auth';
import { cognitoEnabled } from '@/lib/authMode';
import {
  CognitoConfigError,
  cookieSecure,
  decodeOAuthCookie,
  exchangeCode,
  publicAppOrigin,
  verifyIdToken,
  buildLogoutUrl,
  isSilentAuthError,
  REAUTH_COOKIE,
  reauthCookieOptions,
} from '@/lib/cognitoOidc';
import {
  findPlatformUserByCognitoSub,
  findPlatformUserByEmail,
  hasEditalAdminAccess,
  linkPlatformUserCognitoSub,
} from '@/lib/platforms-db';

const OAUTH_COOKIE = 'comunidade_oauth';
const DEFAULT_NEXT = '/admin/editais?tab=pendentes';

function errorRedirect(request: NextRequest, code: string) {
  const url = new URL('/admin/login', publicAppOrigin(request));
  url.searchParams.set('sso_error', code);
  return NextResponse.redirect(url);
}

export async function GET(request: NextRequest) {
  if (!cognitoEnabled()) {
    return NextResponse.json({ error: 'SSO Cognito desabilitado.' }, { status: 404 });
  }

  const oauthError = request.nextUrl.searchParams.get('error');
  if (oauthError) {
    if (isSilentAuthError(oauthError)) {
      const response = NextResponse.redirect(buildLogoutUrl());
      response.cookies.set(REAUTH_COOKIE, '1', reauthCookieOptions(120));
      response.cookies.set(OAUTH_COOKIE, '', reauthCookieOptions(0));
      return response;
    }
    return errorRedirect(request, 'cognito_denied');
  }

  const code = request.nextUrl.searchParams.get('code');
  const state = request.nextUrl.searchParams.get('state');
  if (!code || !state) {
    return errorRedirect(request, 'missing_code');
  }

  const rawCookie = request.cookies.get(OAUTH_COOKIE)?.value;
  if (!rawCookie) {
    return errorRedirect(request, 'missing_oauth_cookie');
  }

  let oauth: { state?: string; nonce?: string; code_verifier?: string };
  try {
    oauth = decodeOAuthCookie(rawCookie);
  } catch {
    return errorRedirect(request, 'invalid_oauth_cookie');
  }

  if (!oauth.state || oauth.state !== state || !oauth.nonce || !oauth.code_verifier) {
    return errorRedirect(request, 'state_mismatch');
  }

  try {
    const tokens = await exchangeCode(code, oauth.code_verifier);
    const identity = await verifyIdToken(tokens.id_token, oauth.nonce);

    let user = await findPlatformUserByCognitoSub(identity.sub);

    if (!user && identity.email) {
      const byEmail = await findPlatformUserByEmail(identity.email);
      if (byEmail) {
        if (byEmail.cognito_sub && byEmail.cognito_sub !== identity.sub) {
          return errorRedirect(request, 'user_not_linked');
        }
        if (!byEmail.cognito_sub) {
          await linkPlatformUserCognitoSub(byEmail.id, identity.sub);
          user = await findPlatformUserByCognitoSub(identity.sub);
        } else {
          user = byEmail;
        }
      }
    }

    if (!hasEditalAdminAccess(user)) {
      return errorRedirect(request, 'user_not_linked');
    }

    const sessionToken = createAdminSessionToken({
      userId: user!.id,
      username: user!.username || identity.email || String(user!.id),
      name: user!.name,
    });

    const response = NextResponse.redirect(new URL(DEFAULT_NEXT, publicAppOrigin(request)));
    response.cookies.set(ADMIN_SESSION_COOKIE_NAME, sessionToken, {
      httpOnly: true,
      secure: cookieSecure(),
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    });
    response.cookies.set(OAUTH_COOKIE, '', {
      httpOnly: true,
      sameSite: 'lax',
      secure: cookieSecure(),
      path: '/',
      maxAge: 0,
    });
    return response;
  } catch (err) {
    console.error('[auth/callback]', err instanceof CognitoConfigError ? err.message : err);
    return errorRedirect(request, 'callback_failed');
  }
}
