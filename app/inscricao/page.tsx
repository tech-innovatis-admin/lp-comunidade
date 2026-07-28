import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight, ShieldCheck, Sparkles } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Pré-cadastro da comunidade | InnovaNation',
  description: 'Leia o comunicado de pré-cadastro e siga para o formulário de inscrição da comunidade InnovaNation.',
}

export default function InscricaoPage() {
  return (
    <main className="flex-1 relative z-10 min-h-screen px-4 py-16">
      <div className="mx-auto flex max-w-4xl flex-col gap-8">
        <section className="rounded-[2rem] border border-slate-800/70 bg-slate-950/60 p-8 backdrop-blur-xl shadow-2xl shadow-black/20 sm:p-10">
          <div className="flex items-center gap-3 text-[#22AE84]">
            <Sparkles className="h-5 w-5" />
            <p className="text-sm font-semibold uppercase tracking-[0.24em]">
              Comunidade InnovaNation
            </p>
          </div>

          <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            Faça parte da comunidade InnovaNation e tenha acesso ao Edital PPI!
          </h1>

          <p className="mt-6 max-w-2xl text-base leading-relaxed text-slate-300">
            Ao fazer parte da comunidade, você terá acesso ao Edital PPI e poderá participar do processo de inscrição. O cadastro é único e validado, garantindo que apenas membros da comunidade tenham acesso ao conteúdo exclusivo.
          </p>

          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-slate-800/70 bg-slate-900/50 p-4 text-sm text-slate-300">
              <ShieldCheck className="mb-3 h-5 w-5 text-[#22AE84]" />
              Cadastro único e validado
            </div>
            <div className="rounded-2xl border border-slate-800/70 bg-slate-900/50 p-4 text-sm text-slate-300">
              <ShieldCheck className="mb-3 h-5 w-5 text-[#22AE84]" />
              Submeta seus dados com segurança e privacidade
            </div>
            <div className="rounded-2xl border border-slate-800/70 bg-slate-900/50 p-4 text-sm text-slate-300">
              <ShieldCheck className="mb-3 h-5 w-5 text-[#22AE84]" />
              Acesso automático ao Edital
            </div>
          </div>

          <div className="mt-10 flex flex-col gap-4 sm:flex-row">
            <Link
              href="/inscricao/formulario"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-[#22AE84] px-6 py-4 text-sm font-bold text-white transition-colors hover:bg-[#1C8C6A]"
            >
              Quero entrar na comunidade InnovaNation
              <ArrowRight className="h-4 w-4" />
            </Link>

            <Link
              href="/edital"
              className="inline-flex items-center justify-center rounded-full border border-slate-700/70 px-6 py-4 text-sm font-semibold text-slate-200 transition-colors hover:border-[#22AE84] hover:text-white"
            >
              Já tenho cadastro e quero voltar ao Edital
            </Link>
          </div>
        </section>
      </div>
    </main>
  )
}
