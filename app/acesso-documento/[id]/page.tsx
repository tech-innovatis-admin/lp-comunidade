import { redirect } from 'next/navigation'
import { verifyAdminSession } from '@/lib/admin-session'
import { unauthenticatedAdminPath } from '@/lib/authMode'

const ADMIN_PENDENTES_PATH = '/admin/editais?tab=pendentes'

export default async function AcessoDocumentoPage() {
  if (await verifyAdminSession()) {
    redirect(ADMIN_PENDENTES_PATH)
  }

  redirect(unauthenticatedAdminPath())
}
