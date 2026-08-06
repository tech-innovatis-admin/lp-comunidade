import { NextResponse } from 'next/server';

import {
  cognitoEnabled,
  credentialsEnabled,
  getAuthMode,
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
      platformCode: process.env.PLATFORM_CODE || EDITAL_ADMIN_PLATFORM_TAG,
    })
  );
}
