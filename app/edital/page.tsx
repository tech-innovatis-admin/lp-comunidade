import type { Metadata } from 'next'
import EditalCpfGate from '../components/EditalCpfGate'

export const metadata: Metadata = {
  title: 'Edital PPI 2026 | InnovaNation',
  description: 'Confirme sua inscrição na comunidade InnovaNation para submeter sua proposta ao Edital PPI.',
}

export default function EditalPage() {
  return (
    <main className="flex-1 relative z-10 min-h-screen flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-xl">
        <EditalCpfGate />
      </div>
    </main>
  )
}
