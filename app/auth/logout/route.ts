import { NextRequest, NextResponse } from 'next/server';

import { ADMIN_SESSION_COOKIE_NAME } from '@/lib/admin-auth';
import { brokerEnabled, centralOidcConfigured } from '@/lib/authMode';
import {
  buildCentralLogoutUrl,
  cookieSecure,
  publicAppOrigin,
  TRANSACTION_COOKIE,
} from '@/lib/centralOidc';

export async function GET(request: NextRequest) {
  const origin = publicAppOrigin(request);
  const response = NextResponse.redirect(
    brokerEnabled() && centralOidcConfigured()
      ? buildCentralLogoutUrl(`${origin}/admin/login`)
      : new URL('/admin/login', origin),
  );

  response.cookies.set(ADMIN_SESSION_COOKIE_NAME, '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: cookieSecure(),
    path: '/',
    maxAge: 0,
  });
  response.cookies.set(TRANSACTION_COOKIE, '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: cookieSecure(),
    path: '/',
    maxAge: 0,
  });
  return response;
}

export async function POST(request: NextRequest) {
  return GET(request);
}
