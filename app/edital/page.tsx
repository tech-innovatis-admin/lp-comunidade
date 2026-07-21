import type { Metadata } from 'next'
import EditalCpfGate from '../components/EditalCpfGate'

export const metadata: Metadata = {
  title: 'Edital PPI 2026 | InnovaNation',
  description: 'Confirme sua inscrição na comunidade InnovaNation para submeter sua proposta ao Edital PPI.',
}

export default async function EditalPage({
  searchParams,
}: {
  searchParams: Promise<{ expired?: string }>
}) {
  const params = await searchParams
  const sessionExpired = params.expired === '1'

  return (
    <main className="flex-1 relative z-10 min-h-screen flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-xl">
        {sessionExpired && (
          <div className="mb-4 p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl text-center">
            <p className="text-sm text-amber-300 font-medium">
              Sua sessão expirou. Informe seu CPF novamente para continuar.
            </p>
          </div>
        )}
        <EditalCpfGate />
      </div>
    </main>
  )
}
