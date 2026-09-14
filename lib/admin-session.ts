import { cookies } from 'next/headers';

import { verifyAdminSessionToken, type AdminSessionIdentity } from '@/lib/admin-auth';
import { validateBrokerSession } from '@/lib/brokerIntrospection';

export async function verifyAdminSession(): Promise<AdminSessionIdentity | null> {
  const cookieStore = await cookies();
  const identity = verifyAdminSessionToken(cookieStore.get('admin_session')?.value);
  if (!identity) {
    return null;
  }

  if (identity.sid && identity.authz_version !== undefined) {
    const active = await validateBrokerSession({
      sid: identity.sid,
      authz_version: identity.authz_version,
      sub: identity.brokerSub || String(identity.userId),
      auth: 'broker',
    });
    if (!active) {
      return null;
    }
  }

  return identity;
}
