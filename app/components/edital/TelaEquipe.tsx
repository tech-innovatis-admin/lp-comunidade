'use client'

import { FileText, User } from 'lucide-react'
import DocumentUploadSlot from './DocumentUploadSlot'
import { EditalSubmissionDocument } from '@/lib/edital-proposta-api'
import { EditalSessionPrefill } from '@/lib/edital-session'
import { EDITAL_MAX_TEXT_LENGTH, EDITAL_MAX_DOCUMENT_BYTES } from '@/lib/edital-requirements'

interface TelaEquipeProps {
  prefill: EditalSessionPrefill
  token: string
  teamDescription: string
  onTeamDescriptionChange: (value: string) => void
  documents: EditalSubmissionDocument[]
  onDocumentUploaded: (document: EditalSubmissionDocument) => void
  onDocumentRemoved: (documentId: number) => void
  onTokenExpired: () => void
}

function findDocument(documents: EditalSubmissionDocument[], code: string): EditalSubmissionDocument | null {
  return documents.find((doc) => doc.requirementCode === code) ?? null
}

export default function TelaEquipe({
  prefill,
  token,
  teamDescription,
  onTeamDescriptionChange,
  documents,
  onDocumentUploaded,
  onDocumentRemoved,
  onTokenExpired,
}: TelaEquipeProps) {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-bold text-white mb-2">Responsável e equipe</h2>
        <p className="text-slate-400">
          Confirme os dados do responsável pela proposta e conte quem mais compõe a equipe.
        </p>
      </div>

      <div className="bg-slate-900/60 rounded-2xl p-6 border border-slate-700/50">
        <div className="flex items-center gap-2 text-sm font-bold text-slate-100 mb-4">
          <User className="w-4 h-4 text-[#22AE84]" />
          Dados do responsável (da inscrição na InnovaNation)
        </div>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <div>
            <dt className="text-slate-400">Nome completo</dt>
            <dd className="text-white font-medium">{prefill.fullName}</dd>
          </div>
          {prefill.email && (
            <div>
              <dt className="text-slate-400">E-mail</dt>
              <dd className="text-white font-medium">{prefill.email}</dd>
            </div>
          )}
          {prefill.phone && (
            <div>
              <dt className="text-slate-400">Telefone</dt>
              <dd className="text-white font-medium">{prefill.phone}</dd>
            </div>
          )}
          {prefill.profession && (
            <div>
              <dt className="text-slate-400">Profissão</dt>
              <dd className="text-white font-medium">{prefill.profession}</dd>
            </div>
          )}
          {prefill.organization && (
            <div>
              <dt className="text-slate-400">Organização</dt>
              <dd className="text-white font-medium">{prefill.organization}</dd>
            </div>
          )}
        </dl>
      </div>

      <div>
        <label htmlFor="team_description" className="block text-sm font-bold text-slate-100 mb-3 ml-1">
          Equipe envolvida
        </label>
        <textarea
          id="team_description"
          value={teamDescription}
          onChange={(e) => onTeamDescriptionChange(e.target.value.slice(0, EDITAL_MAX_TEXT_LENGTH))}
          rows={5}
          placeholder="Descreva quem mais participa da proposta e o papel de cada pessoa"
          className="w-full px-6 py-4 bg-slate-900/60 border border-slate-700/50 rounded-2xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#22AE84]/30 focus:border-[#22AE84] transition-all font-medium resize-none"
        />
        <p className="mt-1 text-xs text-slate-500 text-right">
          {teamDescription.length}/{EDITAL_MAX_TEXT_LENGTH}
        </p>
      </div>

      <div className="space-y-6">
        <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
          <FileText className="w-4 h-4 text-[#22AE84]" />
          Documentação do responsável
        </h3>
        <DocumentUploadSlot
          token={token}
          requirementCode="8.1.1"
          label="Documento oficial de identificação com foto"
          helperText="RG, CNH (com foto) ou equivalente"
          accept="application/pdf"
          maxBytes={EDITAL_MAX_DOCUMENT_BYTES}
          document={findDocument(documents, '8.1.1')}
          onUploaded={onDocumentUploaded}
          onRemoved={onDocumentRemoved}
          onTokenExpired={onTokenExpired}
        />
        <DocumentUploadSlot
          token={token}
          requirementCode="8.1.2"
          label="CPF do responsável pela submissão"
          accept="application/pdf"
          maxBytes={EDITAL_MAX_DOCUMENT_BYTES}
          document={findDocument(documents, '8.1.2')}
          onUploaded={onDocumentUploaded}
          onRemoved={onDocumentRemoved}
          onTokenExpired={onTokenExpired}
        />
        <DocumentUploadSlot
          token={token}
          requirementCode="8.1.3"
          label="Comprovante de vínculo institucional"
          helperText="Declaração institucional, portaria, contrato ou documento equivalente"
          accept="application/pdf"
          maxBytes={EDITAL_MAX_DOCUMENT_BYTES}
          document={findDocument(documents, '8.1.3')}
          onUploaded={onDocumentUploaded}
          onRemoved={onDocumentRemoved}
          onTokenExpired={onTokenExpired}
        />
        <DocumentUploadSlot
          token={token}
          requirementCode="8.1.4"
          label="Currículo atualizado"
          helperText="Preferencialmente extraído da Plataforma Lattes"
          accept="application/pdf"
          maxBytes={EDITAL_MAX_DOCUMENT_BYTES}
          document={findDocument(documents, '8.1.4')}
          onUploaded={onDocumentUploaded}
          onRemoved={onDocumentRemoved}
          onTokenExpired={onTokenExpired}
        />
      </div>
    </div>
  )
}
