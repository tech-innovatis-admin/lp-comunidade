import Link from 'next/link'
import { CalendarDays, Lock } from 'lucide-react'

export default function EditalRegistrationClosed() {
  return (
    <main className="flex-1 relative z-10 min-h-screen flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-xl bg-slate-900/40 backdrop-blur-xl rounded-[2.5rem] p-8 sm:p-12 border border-slate-800 shadow-2xl text-center">
        <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-800">
          <Lock className="h-7 w-7 text-slate-400" aria-hidden="true" />
        </div>
        <h1 className="text-2xl font-bold text-white mb-3">Inscrições ainda não liberadas</h1>
        <p className="text-slate-300 mb-6 leading-relaxed">
          O envio de propostas do Edital PPI 2026 será liberado em{' '}
          <strong className="text-white">17/09/2026 às 00:00</strong> (horário de Brasília).
        </p>
        <div className="inline-flex items-center gap-2 rounded-2xl border border-slate-700/60 bg-slate-950/50 px-4 py-3 text-sm font-medium text-slate-300 mb-8">
          <CalendarDays className="h-4 w-4 text-[#EA5B0C]" aria-hidden="true" />
          Inscrições: 17/09 a 04/10/2026
        </div>
        <div>
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-full bg-[#22AE84] px-6 py-3 text-sm font-bold text-white transition hover:bg-[#1E9A74]"
          >
            Voltar para a home
          </Link>
        </div>
      </div>
    </main>
  )
}
