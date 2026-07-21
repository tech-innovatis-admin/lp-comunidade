'use client'

import PhotoGallerySlot from './PhotoGallerySlot'
import DocumentUploadSlot from './DocumentUploadSlot'
import { EditalSubmissionDocument } from '@/lib/edital-proposta-api'
import { EDITAL_MAX_DOCUMENT_BYTES, EDITAL_PHOTO_DOCUMENT_CODE } from '@/lib/edital-requirements'

interface TelaFotosProps {
  token: string
  documents: EditalSubmissionDocument[]
  onDocumentUploaded: (document: EditalSubmissionDocument) => void
  onDocumentRemoved: (documentId: number) => void
  onTokenExpired: () => void
}

export default function TelaFotos({
  token,
  documents,
  onDocumentUploaded,
  onDocumentRemoved,
  onTokenExpired,
}: TelaFotosProps) {
  const photos = documents.filter((doc) => doc.requirementCode === EDITAL_PHOTO_DOCUMENT_CODE)
  const layout = documents.find((doc) => doc.requirementCode === '8.1.9') ?? null

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-bold text-white mb-2">Fotos e planta do laboratório</h2>
        <p className="text-slate-400">
          Registro fotográfico atual do laboratório e, quando houver, planta ou layout do espaço.
        </p>
      </div>

      <PhotoGallerySlot
        token={token}
        photos={photos}
        onUploaded={onDocumentUploaded}
        onRemoved={onDocumentRemoved}
        onTokenExpired={onTokenExpired}
      />

      <DocumentUploadSlot
        token={token}
        requirementCode="8.1.9"
        label="Planta, layout ou memorial descritivo do espaço (quando houver)"
        helperText="Especialmente se a proposta envolver adequações estruturais, mobiliário ou instalação de equipamentos"
        accept="application/pdf"
        maxBytes={EDITAL_MAX_DOCUMENT_BYTES}
        document={layout}
        onUploaded={onDocumentUploaded}
        onRemoved={onDocumentRemoved}
        onTokenExpired={onTokenExpired}
      />
    </div>
  )
}
