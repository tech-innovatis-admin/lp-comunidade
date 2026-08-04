'use client'

import { FileText } from 'lucide-react'
import DocumentUploadSlot from './DocumentUploadSlot'
import { EditalSubmissionDocument } from '@/lib/edital-proposta-api'
import { EDITAL_MAX_DOCUMENT_BYTES } from '@/lib/edital-requirements'

interface TelaDeclaracoesProps {
  token: string
  documents: EditalSubmissionDocument[]
  onDocumentUploaded: (document: EditalSubmissionDocument) => void
  onDocumentRemoved: (documentId: number) => void
  onTokenExpired: () => void
}

function findDocument(documents: EditalSubmissionDocument[], code: string): EditalSubmissionDocument | null {
  return documents.find((doc) => doc.requirementCode === code) ?? null
}

export default function TelaDeclaracoes({
  token,
  documents,
  onDocumentUploaded,
  onDocumentRemoved,
  onTokenExpired,
}: TelaDeclaracoesProps) {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-bold text-white mb-2">Declarações</h2>
        <p className="text-slate-400">
          Envie a Declaração de Responsabilidade e o Termo de Compromisso de Contrapartida,
          assinados conforme os modelos dos Anexos I e II do edital.{' '}
          <span className="text-slate-500">
            (
            <a
              href="/edital/anexo-i-declaracao-responsabilidade.pdf"
              download
              className="text-[#22AE84] hover:underline"
            >
              Anexo I
            </a>
            {' · '}
            <a
              href="/edital/anexo-ii-termo-contrapartida.pdf"
              download
              className="text-[#22AE84] hover:underline"
            >
              Anexo II
            </a>
            )
          </span>
        </p>
      </div>

      <div className="space-y-6">
        <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
          <FileText className="w-4 h-4 text-[#22AE84]" />
          Documentos assinados
        </h3>
        <DocumentUploadSlot
          token={token}
          requirementCode="8.1.15"
          label="Declaração de Responsabilidade (Anexo I)"
          helperText="Assinada pelo coordenador ou responsável técnico pela proposta"
          accept="application/pdf"
          maxBytes={EDITAL_MAX_DOCUMENT_BYTES}
          document={findDocument(documents, '8.1.15')}
          onUploaded={onDocumentUploaded}
          onRemoved={onDocumentRemoved}
          onTokenExpired={onTokenExpired}
        />
        <DocumentUploadSlot
          token={token}
          requirementCode="8.1.16"
          label="Termo de Compromisso de Contrapartida Institucional (Anexo II)"
          helperText="Assinado pelo laboratório ou instituição proponente"
          accept="application/pdf"
          maxBytes={EDITAL_MAX_DOCUMENT_BYTES}
          document={findDocument(documents, '8.1.16')}
          onUploaded={onDocumentUploaded}
          onRemoved={onDocumentRemoved}
          onTokenExpired={onTokenExpired}
        />
      </div>
    </div>
  )
}
