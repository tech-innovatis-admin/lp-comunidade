import { NextRequest, NextResponse } from 'next/server';

import {
  createAdminSessionToken,
  ADMIN_SESSION_COOKIE_NAME,
} from '@/lib/admin-auth';
import { cognitoEnabled } from '@/lib/authMode';
import {
  CognitoConfigError,
  exchangeCode,
  verifyIdToken,
} from '@/lib/cognitoOidc';
import {
  findPlatformUserByCognitoSub,
  findPlatformUserByEmail,
  hasEditalAdminAccess,
  linkPlatformUserCognitoSub,
} from '@/lib/platforms-db';

const OAUTH_COOKIE = 'comunidade_oauth';
const DEFAULT_NEXT = '/admin/editais?tab=pendentes';

function appOrigin(request: NextRequest) {
  return (
    process.env.APP_URL?.replace(/\/$/, '') ||
    process.env.PUBLIC_BASE_URL?.replace(/\/$/, '') ||
    `${request.nextUrl.protocol}//${request.nextUrl.host}`
  );
}

function errorRedirect(request: NextRequest, code: string) {
  const url = new URL('/admin/login', appOrigin(request));
  url.searchParams.set('sso_error', code);
  return NextResponse.redirect(url);
}

export async function GET(request: NextRequest) {
  if (!cognitoEnabled()) {
    return NextResponse.json({ error: 'SSO Cognito desabilitado.' }, { status: 404 });
  }

  if (request.nextUrl.searchParams.get('error')) {
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
    oauth = JSON.parse(rawCookie) as typeof oauth;
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

    const response = NextResponse.redirect(new URL(DEFAULT_NEXT, appOrigin(request)));
    response.cookies.set(ADMIN_SESSION_COOKIE_NAME, sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    });
    response.cookies.set(OAUTH_COOKIE, '', {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 0,
    });
    return response;
  } catch (err) {
    console.error('[auth/callback]', err instanceof CognitoConfigError ? err.message : err);
    return errorRedirect(request, 'callback_failed');
  }
}
