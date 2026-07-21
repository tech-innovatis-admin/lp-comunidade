'use client'

import { FileText } from 'lucide-react'
import DocumentUploadSlot from './DocumentUploadSlot'
import { EditalSubmissionDocument } from '@/lib/edital-proposta-api'
import { EDITAL_MAX_DOCUMENT_BYTES, EDITAL_MAX_TEXT_LENGTH } from '@/lib/edital-requirements'

export type TelaInstituicaoField =
  | 'institutionName'
  | 'institutionCnpj'
  | 'labName'
  | 'labArea'
  | 'labServedPublic'

interface TelaInstituicaoProps {
  token: string
  institutionName: string
  institutionCnpj: string
  labName: string
  labArea: string
  labServedPublic: string
  onFieldChange: (field: TelaInstituicaoField, value: string) => void
  documents: EditalSubmissionDocument[]
  onDocumentUploaded: (document: EditalSubmissionDocument) => void
  onDocumentRemoved: (documentId: number) => void
  onTokenExpired: () => void
}

function findDocument(documents: EditalSubmissionDocument[], code: string): EditalSubmissionDocument | null {
  return documents.find((doc) => doc.requirementCode === code) ?? null
}

const inputClass =
  'w-full px-6 py-4 bg-slate-900/60 border border-slate-700/50 rounded-2xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#22AE84]/30 focus:border-[#22AE84] transition-all font-medium'

export default function TelaInstituicao({
  token,
  institutionName,
  institutionCnpj,
  labName,
  labArea,
  labServedPublic,
  onFieldChange,
  documents,
  onDocumentUploaded,
  onDocumentRemoved,
  onTokenExpired,
}: TelaInstituicaoProps) {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-bold text-white mb-2">Instituição e laboratório</h2>
        <p className="text-slate-400">
          Dados da instituição de ensino e do laboratório participante da proposta.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="institution_name" className="block text-sm font-bold text-slate-100 mb-3 ml-1">
            Nome da instituição
          </label>
          <input
            id="institution_name"
            type="text"
            value={institutionName}
            onChange={(e) => onFieldChange('institutionName', e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="institution_cnpj" className="block text-sm font-bold text-slate-100 mb-3 ml-1">
            CNPJ da instituição
          </label>
          <input
            id="institution_cnpj"
            type="text"
            value={institutionCnpj}
            onChange={(e) => onFieldChange('institutionCnpj', e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="lab_name" className="block text-sm font-bold text-slate-100 mb-3 ml-1">
            Nome do laboratório
          </label>
          <input
            id="lab_name"
            type="text"
            value={labName}
            onChange={(e) => onFieldChange('labName', e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="lab_area" className="block text-sm font-bold text-slate-100 mb-3 ml-1">
            Área de atuação do laboratório
          </label>
          <input
            id="lab_area"
            type="text"
            value={labArea}
            onChange={(e) => onFieldChange('labArea', e.target.value)}
            className={inputClass}
          />
        </div>
      </div>

      <div>
        <label htmlFor="lab_served_public" className="block text-sm font-bold text-slate-100 mb-3 ml-1">
          Público atendido pelo laboratório
        </label>
        <textarea
          id="lab_served_public"
          value={labServedPublic}
          onChange={(e) => onFieldChange('labServedPublic', e.target.value.slice(0, EDITAL_MAX_TEXT_LENGTH))}
          rows={4}
          className={`${inputClass} resize-none`}
        />
        <p className="mt-1 text-xs text-slate-500 text-right">
          {labServedPublic.length}/{EDITAL_MAX_TEXT_LENGTH}
        </p>
      </div>

      <div className="space-y-6">
        <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
          <FileText className="w-4 h-4 text-[#22AE84]" />
          Documentação da instituição e do laboratório
        </h3>
        <DocumentUploadSlot
          token={token}
          requirementCode="8.1.5"
          label="Comprovante de inscrição e situação cadastral do CNPJ"
          accept="application/pdf"
          maxBytes={EDITAL_MAX_DOCUMENT_BYTES}
          document={findDocument(documents, '8.1.5')}
          onUploaded={onDocumentUploaded}
          onRemoved={onDocumentRemoved}
          onTokenExpired={onTokenExpired}
        />
        <DocumentUploadSlot
          token={token}
          requirementCode="8.1.6"
          label="Carta de anuência da instituição"
          helperText="Assinada por representante legal, direção, coordenação ou chefia de departamento"
          accept="application/pdf"
          maxBytes={EDITAL_MAX_DOCUMENT_BYTES}
          document={findDocument(documents, '8.1.6')}
          onUploaded={onDocumentUploaded}
          onRemoved={onDocumentRemoved}
          onTokenExpired={onTokenExpired}
        />
        <DocumentUploadSlot
          token={token}
          requirementCode="8.1.7"
          label="Documento de identificação do laboratório"
          helperText="Nome oficial, área de atuação, responsável técnico e público atendido"
          accept="application/pdf"
          maxBytes={EDITAL_MAX_DOCUMENT_BYTES}
          document={findDocument(documents, '8.1.7')}
          onUploaded={onDocumentUploaded}
          onRemoved={onDocumentRemoved}
          onTokenExpired={onTokenExpired}
        />
      </div>
    </div>
  )
}
