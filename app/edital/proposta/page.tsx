import type { Metadata } from 'next'
import EditalPropostaWizard from '../../components/edital/EditalPropostaWizard'

export const metadata: Metadata = {
  title: 'Proposta ao Edital PPI | InnovaNation',
  description: 'Envie sua proposta de patrocínio ao Edital PPI da comunidade InnovaNation.',
}

export default function EditalPropostaPage() {
  return (
    <main className="flex-1 relative z-10 min-h-screen flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-3xl">
        <EditalPropostaWizard />
      </div>
    </main>
  )
}
