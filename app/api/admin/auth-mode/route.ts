import { NextResponse } from 'next/server';

import {
  brokerEnabled,
  centralOidcConfigured,
  cognitoEnabled,
  credentialsEnabled,
  getAuthMode,
  ssoEnabled,
} from '@/lib/authMode';
import { applyNoStore } from '@/lib/security';
import { EDITAL_ADMIN_PLATFORM_TAG } from '@/lib/platforms-db';

export async function GET() {
  const mode = getAuthMode();
  return applyNoStore(
    NextResponse.json({
      mode,
      credentials: credentialsEnabled(mode),
      cognito: cognitoEnabled(mode),
      broker: brokerEnabled(mode),
      sso: ssoEnabled(mode),
      centralConfigured: centralOidcConfigured(),
      platformCode: process.env.PLATFORM_CODE || EDITAL_ADMIN_PLATFORM_TAG,
    })
  );
}
