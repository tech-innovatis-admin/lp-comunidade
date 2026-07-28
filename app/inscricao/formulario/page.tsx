import type { Metadata } from 'next'
import Link from 'next/link'
import RegistrationFormSection from '../../components/RegistrationFormSection'

export const metadata: Metadata = {
  title: 'Formulário de inscrição | InnovaNation',
  description: 'Conclua o cadastro da comunidade InnovaNation para liberar automaticamente o Edital PPI.',
}

export default function InscricaoFormularioPage() {
  return (
    <main className="flex-1 relative z-10 min-h-screen px-4 py-12 sm:py-14">
      <div className="mx-auto max-w-4xl">
        <div className="mb-6 flex justify-start">
          <Link
            href="/inscricao"
            className="inline-flex rounded-full border border-slate-700/70 px-5 py-3 text-sm font-semibold text-slate-200 transition-colors hover:border-[#22AE84] hover:text-white"
          >
            Voltar ao comunicado
          </Link>
        </div>

        <section className="mb-6 rounded-[2rem] border border-slate-800/70 bg-slate-950/60 p-7 text-center backdrop-blur-xl shadow-2xl shadow-black/20 sm:p-9">
          <h1 className="mx-auto max-w-3xl text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            Faça seu <span className="text-[#22AE84]">Cadastro</span> para acessar o Edital PPI!
          </h1>
          <p className="mx-auto mt-4 max-w-3xl text-base leading-relaxed text-slate-300">
            Conclua o cadastro abaixo para liberar automaticamente o formulário de submissão do{' '}
            <span className="text-[#22AE84]">Edital PPI</span>.
          </p>
        </section>

        <RegistrationFormSection flowMode="edital" hideIntro />
      </div>
    </main>
  )
}
