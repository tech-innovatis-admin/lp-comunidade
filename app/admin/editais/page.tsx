import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { query } from '@/lib/db'
import { verifyAdminSessionToken, ADMIN_SESSION_COOKIE_NAME } from '@/lib/admin-auth'
import { EDITAL_APPROVAL_MIN_SCORE } from '@/lib/edital-evaluation'

type Tab = 'pendentes' | 'ranking' | 'rejeitadas'

interface PendingRow {
  id: number
  full_name: string
  institution_name: string | null
  submitted_at: string
}

interface RankingRow {
  id: number
  full_name: string
  institution_name: string | null
  evaluation_total_score: number
}

interface RejectedRow {
  id: number
  full_name: string
  institution_name: string | null
  disqualified_reason: string
  disqualified_at: string
}

async function loadPending(): Promise<PendingRow[]> {
  return query<PendingRow>(
    `SELECT s.id, r.full_name, s.institution_name, s.submitted_at
     FROM edital_submissions s
     INNER JOIN registrations r ON r.id = s.registration_id
     WHERE s.status = 'SUBMITTED' AND s.disqualified_at IS NULL AND s.evaluation_total_score IS NULL
     ORDER BY s.submitted_at DESC`
  )
}

async function loadRanking(): Promise<RankingRow[]> {
  return query<RankingRow>(
    `SELECT s.id, r.full_name, s.institution_name, s.evaluation_total_score
     FROM edital_submissions s
     INNER JOIN registrations r ON r.id = s.registration_id
     WHERE s.status = 'SUBMITTED' AND s.disqualified_at IS NULL AND s.evaluation_total_score IS NOT NULL
     ORDER BY s.evaluation_total_score DESC, s.submitted_at ASC`
  )
}

async function loadRejected(): Promise<RejectedRow[]> {
  return query<RejectedRow>(
    `SELECT s.id, r.full_name, s.institution_name, s.disqualified_reason, s.disqualified_at
     FROM edital_submissions s
     INNER JOIN registrations r ON r.id = s.registration_id
     WHERE s.disqualified_at IS NOT NULL
     ORDER BY s.disqualified_at DESC`
  )
}

function CardShell({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-4 bg-slate-900/40 hover:bg-slate-900/60 border border-slate-800 hover:border-[#22AE84]/40 rounded-2xl p-6 transition-all"
    >
      {children}
      <ChevronRight className="w-5 h-5 text-slate-600 group-hover:text-[#22AE84] transition-colors flex-shrink-0" />
    </Link>
  )
}

function Avatar({ name }: { name: string }) {
  return (
    <div className="flex-shrink-0 w-12 h-12 rounded-full bg-[#22AE84]/10 flex items-center justify-center text-[#22AE84] font-bold text-lg">
      {name.charAt(0).toUpperCase()}
    </div>
  )
}

const TABS: Array<{ key: Tab; label: string }> = [
  { key: 'pendentes', label: 'Sem avaliação' },
  { key: 'ranking', label: 'Ranking' },
  { key: 'rejeitadas', label: 'Rejeitadas' },
]

async function PendingList() {
  const submissions = await loadPending()

  if (submissions.length === 0) {
    return <p className="text-slate-400">Nenhuma proposta aguardando avaliação.</p>
  }

  return (
    <div className="space-y-3">
      {submissions.map((submission) => (
        <CardShell key={submission.id} href={`/admin/editais/${submission.id}`}>
          <Avatar name={submission.full_name} />
          <div className="flex-1 min-w-0">
            <p className="text-white font-bold truncate">{submission.full_name}</p>
            <p className="text-sm text-slate-400 truncate">
              {submission.institution_name || 'Sem instituição informada'}
            </p>
          </div>
          <p className="text-xs text-slate-500 flex-shrink-0">
            {new Date(submission.submitted_at).toLocaleString('pt-BR')}
          </p>
        </CardShell>
      ))}
    </div>
  )
}

async function RankingList() {
  const submissions = await loadRanking()

  if (submissions.length === 0) {
    return <p className="text-slate-400">Nenhuma proposta avaliada ainda.</p>
  }

  return (
    <div className="space-y-3">
      {submissions.map((submission, index) => (
        <CardShell key={submission.id} href={`/admin/editais/${submission.id}`}>
          <div className="flex-shrink-0 w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center text-slate-300 font-bold text-lg">
            #{index + 1}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white font-bold truncate">{submission.full_name}</p>
            <p className="text-sm text-slate-400 truncate">
              {submission.institution_name || 'Sem instituição informada'}
            </p>
          </div>
          <span
            className={`px-3 py-1 rounded-full text-xs font-bold flex-shrink-0 ${
              submission.evaluation_total_score >= EDITAL_APPROVAL_MIN_SCORE
                ? 'bg-[#22AE84]/20 text-[#22AE84]'
                : 'bg-slate-800 text-slate-400'
            }`}
          >
            {submission.evaluation_total_score} / 100
          </span>
        </CardShell>
      ))}
    </div>
  )
}

async function RejectedList() {
  const submissions = await loadRejected()

  if (submissions.length === 0) {
    return <p className="text-slate-400">Nenhuma proposta rejeitada.</p>
  }

  return (
    <div className="space-y-3">
      {submissions.map((submission) => (
        <CardShell key={submission.id} href={`/admin/editais/${submission.id}`}>
          <Avatar name={submission.full_name} />
          <div className="flex-1 min-w-0">
            <p className="text-white font-bold truncate">{submission.full_name}</p>
            <p className="text-sm text-red-300/80 truncate">{submission.disqualified_reason}</p>
          </div>
          <p className="text-xs text-slate-500 flex-shrink-0">
            {new Date(submission.disqualified_at).toLocaleString('pt-BR')}
          </p>
        </CardShell>
      ))}
    </div>
  )
}

export default async function AdminEditaisPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>
}) {
  const cookieStore = await cookies()
  const token = cookieStore.get(ADMIN_SESSION_COOKIE_NAME)?.value

  if (!verifyAdminSessionToken(token)) {
    redirect('/admin/login')
  }

  const { tab: tabParam } = await searchParams
  const tab: Tab = tabParam === 'ranking' || tabParam === 'rejeitadas' ? tabParam : 'pendentes'

  return (
    <main className="flex-1 relative z-10 min-h-screen px-4 py-16">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-white mb-2">Propostas do Edital PPI</h1>

        <div className="flex gap-2 mb-8 border-b border-slate-800">
          {TABS.map((item) => (
            <Link
              key={item.key}
              href={`/admin/editais?tab=${item.key}`}
              className={`px-4 py-3 text-sm font-bold border-b-2 transition-colors ${
                tab === item.key
                  ? 'border-[#22AE84] text-[#22AE84]'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              {item.label}
            </Link>
          ))}
        </div>

        {tab === 'pendentes' && <PendingList />}
        {tab === 'ranking' && <RankingList />}
        {tab === 'rejeitadas' && <RejectedList />}
      </div>
    </main>
  )
}
