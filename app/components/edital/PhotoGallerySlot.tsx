'use client'

import { useRef, useState } from 'react'
import { Upload, X, Loader2, AlertCircle, CheckCircle } from 'lucide-react'
import {
  EditalSubmissionDocument,
  EditalApiError,
  uploadEditalDocument,
  deleteEditalDocument,
} from '@/lib/edital-proposta-api'
import {
  EDITAL_PHOTO_DOCUMENT_CODE,
  EDITAL_MAX_PHOTO_BYTES,
  EDITAL_MAX_PHOTO_COUNT,
  EDITAL_MIN_PHOTO_COUNT,
} from '@/lib/edital-requirements'

interface PhotoGallerySlotProps {
  token: string
  photos: EditalSubmissionDocument[]
  onUploaded: (document: EditalSubmissionDocument) => void
  onRemoved: (documentId: number) => void
  onTokenExpired: () => void
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

export default function PhotoGallerySlot({
  token,
  photos,
  onUploaded,
  onRemoved,
  onTokenExpired,
}: PhotoGallerySlotProps) {
  const [uploading, setUploading] = useState(false)
  const [removingId, setRemovingId] = useState<number | null>(null)
  const [error, setError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFilesChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return

    setError('')

    if (photos.length + files.length > EDITAL_MAX_PHOTO_COUNT) {
      setError(`Você pode enviar no máximo ${EDITAL_MAX_PHOTO_COUNT} fotos`)
      if (inputRef.current) inputRef.current.value = ''
      return
    }

    const validTypes = ['image/jpeg', 'image/png', 'image/webp']
    for (const file of files) {
      if (!validTypes.includes(file.type)) {
        setError('Apenas imagens JPG, PNG ou WEBP são permitidas')
        if (inputRef.current) inputRef.current.value = ''
        return
      }
      if (file.size > EDITAL_MAX_PHOTO_BYTES) {
        setError(`Cada foto deve ter no máximo ${formatFileSize(EDITAL_MAX_PHOTO_BYTES)}`)
        if (inputRef.current) inputRef.current.value = ''
        return
      }
    }

    setUploading(true)
    try {
      for (const file of files) {
        const result = await uploadEditalDocument(token, EDITAL_PHOTO_DOCUMENT_CODE, file)
        onUploaded({
          id: result.documentId,
          requirementCode: result.requirementCode,
          originalFilename: result.filename,
          mimeType: file.type,
          sizeBytes: file.size,
          uploadedAt: new Date().toISOString(),
        })
      }
    } catch (err) {
      if (err instanceof EditalApiError && err.reason === 'token_expired') {
        onTokenExpired()
        return
      }
      setError(err instanceof Error ? err.message : 'Erro ao enviar foto')
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  const handleRemove = async (documentId: number) => {
    setRemovingId(documentId)
    setError('')
    try {
      await deleteEditalDocument(token, documentId)
      onRemoved(documentId)
    } catch (err) {
      if (err instanceof EditalApiError && err.reason === 'token_expired') {
        onTokenExpired()
        return
      }
      setError(err instanceof Error ? err.message : 'Erro ao remover foto')
    } finally {
      setRemovingId(null)
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-bold text-slate-100 mb-1 ml-1">
          Fotos do laboratório
        </label>
        <p className="text-xs text-slate-400 ml-1">
          Mínimo {EDITAL_MIN_PHOTO_COUNT}, máximo {EDITAL_MAX_PHOTO_COUNT} fotos, {formatFileSize(EDITAL_MAX_PHOTO_BYTES)} cada
        </p>
      </div>

      {photos.length < EDITAL_MAX_PHOTO_COUNT && (
        <div>
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            onChange={handleFilesChange}
            disabled={uploading}
            className="hidden"
            id="upload-foto"
          />
          <label
            htmlFor="upload-foto"
            className="flex items-center justify-center gap-2 w-full p-4 border-2 border-dashed border-slate-700/50 rounded-2xl cursor-pointer hover:border-[#22AE84] transition-colors text-slate-300"
          >
            {uploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Upload className="w-5 h-5" />}
            <span className="text-sm font-medium">
              {uploading ? 'Enviando...' : 'Clique para selecionar as fotos'}
            </span>
          </label>
        </div>
      )}

      {photos.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {photos.map((photo) => (
            <div key={photo.id} className="relative group bg-slate-900/60 rounded-xl border border-slate-700/50 p-3">
              <p className="text-xs font-medium text-white truncate">{photo.originalFilename}</p>
              <p className="text-xs text-slate-400">{formatFileSize(photo.sizeBytes)}</p>
              <button
                type="button"
                onClick={() => handleRemove(photo.id)}
                disabled={removingId === photo.id}
                className="absolute top-2 right-2 p-1.5 bg-black/50 hover:bg-red-500 rounded-lg transition-colors disabled:opacity-50"
                aria-label="Remover foto"
              >
                {removingId === photo.id ? (
                  <Loader2 className="w-3.5 h-3.5 text-white animate-spin" />
                ) : (
                  <X className="w-3.5 h-3.5 text-white" />
                )}
              </button>
            </div>
          ))}
        </div>
      )}

      {photos.length >= EDITAL_MIN_PHOTO_COUNT && (
        <div className="flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
          <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
          <p className="text-sm text-green-400 font-medium">Mínimo de fotos atingido</p>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 text-sm text-red-400 font-medium">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  )
}
