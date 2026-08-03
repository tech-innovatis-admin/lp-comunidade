'use client'

import PhotoGallerySlot from './PhotoGallerySlot'
import { EditalSubmissionDocument } from '@/lib/edital-proposta-api'
import { EDITAL_MAX_TEXT_LENGTH, EDITAL_PHOTO_DOCUMENT_CODE } from '@/lib/edital-requirements'

interface TelaFotosProps {
  token: string
  labStructureDescription: string
  onLabStructureDescriptionChange: (value: string) => void
  documents: EditalSubmissionDocument[]
  onDocumentUploaded: (document: EditalSubmissionDocument) => void
  onDocumentRemoved: (documentId: number) => void
  onTokenExpired: () => void
}

const textareaClass =
  'w-full px-6 py-4 bg-slate-900/60 border border-slate-700/50 rounded-2xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#22AE84]/30 focus:border-[#22AE84] transition-all font-medium resize-none'

export default function TelaFotos({
  token,
  labStructureDescription,
  onLabStructureDescriptionChange,
  documents,
  onDocumentUploaded,
  onDocumentRemoved,
  onTokenExpired,
}: TelaFotosProps) {
  const photos = documents.filter((doc) => doc.requirementCode === EDITAL_PHOTO_DOCUMENT_CODE)

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-bold text-white mb-2">Fotos do laboratório</h2>
        <p className="text-slate-400">
          Registro fotográfico atual do laboratório e descrição da estrutura existente.
        </p>
      </div>

      <div>
        <label htmlFor="lab_structure_description" className="block text-sm font-bold text-slate-100 mb-3 ml-1">
          Descrição da estrutura do laboratório
        </label>
        <p className="text-sm text-slate-400 mb-3 ml-1">
          Descreva a estrutura física, tecnológica e operacional existente, identificando as principais
          limitações, necessidades ou oportunidades de melhoria.
        </p>
        <textarea
          id="lab_structure_description"
          rows={6}
          value={labStructureDescription}
          onChange={(e) => onLabStructureDescriptionChange(e.target.value.slice(0, EDITAL_MAX_TEXT_LENGTH))}
          className={textareaClass}
        />
        <p className="mt-1 text-xs text-slate-500 text-right">
          {labStructureDescription.length}/{EDITAL_MAX_TEXT_LENGTH}
        </p>
      </div>

      <PhotoGallerySlot
        token={token}
        photos={photos}
        onUploaded={onDocumentUploaded}
        onRemoved={onDocumentRemoved}
        onTokenExpired={onTokenExpired}
      />
    </div>
  )
}
