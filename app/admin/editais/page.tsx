import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { query } from '@/lib/db'
import { verifyAdminSessionToken, ADMIN_SESSION_COOKIE_NAME } from '@/lib/admin-auth'

interface SubmissionListRow {
  id: number
  full_name: string
  institution_name: string | null
  status: 'DRAFT' | 'SUBMITTED'
  submitted_at: string
}

async function loadSubmissions(): Promise<SubmissionListRow[]> {
  return query<SubmissionListRow>(
    `SELECT s.id, r.full_name, s.institution_name, s.status, s.submitted_at
     FROM edital_submissions s
     INNER JOIN registrations r ON r.id = s.registration_id
     WHERE s.status = 'SUBMITTED'
     ORDER BY s.submitted_at DESC`
  )
}

export default async function AdminEditaisPage() {
  const cookieStore = await cookies()
  const token = cookieStore.get(ADMIN_SESSION_COOKIE_NAME)?.value

  if (!verifyAdminSessionToken(token)) {
    redirect('/admin/login')
  }

  const submissions = await loadSubmissions()

  return (
    <main className="flex-1 relative z-10 min-h-screen px-4 py-16">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-white mb-2">Propostas do Edital PPI</h1>
        <p className="text-slate-400 mb-8">{submissions.length} proposta(s) enviada(s).</p>

        {submissions.length === 0 && (
          <p className="text-slate-400">Nenhuma proposta enviada ainda.</p>
        )}

        <div className="space-y-3">
          {submissions.map((submission) => (
            <Link
              key={submission.id}
              href={`/admin/editais/${submission.id}`}
              className="group flex items-center gap-4 bg-slate-900/40 hover:bg-slate-900/60 border border-slate-800 hover:border-[#22AE84]/40 rounded-2xl p-6 transition-all"
            >
              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-[#22AE84]/10 flex items-center justify-center text-[#22AE84] font-bold text-lg">
                {submission.full_name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white font-bold truncate">{submission.full_name}</p>
                <p className="text-sm text-slate-400 truncate">
                  {submission.institution_name || 'Sem instituição informada'}
                </p>
              </div>
              <div className="text-right flex-shrink-0">
                <span className="inline-block px-3 py-1 bg-[#22AE84]/20 text-[#22AE84] rounded-full text-xs font-bold">
                  {submission.status}
                </span>
                <p className="text-xs text-slate-500 mt-2">
                  {new Date(submission.submitted_at).toLocaleString('pt-BR')}
                </p>
              </div>
              <ChevronRight className="w-5 h-5 text-slate-600 group-hover:text-[#22AE84] transition-colors flex-shrink-0" />
            </Link>
          ))}
        </div>
      </div>
    </main>
  )
}
