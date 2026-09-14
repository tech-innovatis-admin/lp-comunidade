import { NextResponse } from 'next/server';

import {
  brokerEnabled,
  centralOidcConfigured,
  cognitoEnabled,
  credentialsEnabled,
  getAuthMode,
  ssoEnabled,
} from '@/lib/authMode';
import { EDITAL_ADMIN_PLATFORM_TAG } from '@/lib/platforms-db';
import { applyNoStore } from '@/lib/security';

export async function GET() {
  const mode = getAuthMode();
  return applyNoStore(
    NextResponse.json({
      mode,
      credentials: credentialsEnabled(mode),
      broker: brokerEnabled(mode),
      sso: ssoEnabled(mode),
      cognito: cognitoEnabled(mode),
      centralConfigured: centralOidcConfigured(),
      platformCode: process.env.PLATFORM_CODE || EDITAL_ADMIN_PLATFORM_TAG,
    }),
  );
}
