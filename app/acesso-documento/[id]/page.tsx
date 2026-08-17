import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { ADMIN_SESSION_COOKIE_NAME, verifyAdminSessionToken } from '@/lib/admin-auth'
import { unauthenticatedAdminPath } from '@/lib/authMode'

const ADMIN_PENDENTES_PATH = '/admin/editais?tab=pendentes'

export default async function AcessoDocumentoPage() {
  const cookieStore = await cookies()
  const token = cookieStore.get(ADMIN_SESSION_COOKIE_NAME)?.value

  if (verifyAdminSessionToken(token)) {
    redirect(ADMIN_PENDENTES_PATH)
  }

  redirect(unauthenticatedAdminPath())
}
