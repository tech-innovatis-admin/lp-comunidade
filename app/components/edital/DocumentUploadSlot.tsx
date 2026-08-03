'use client'

import { useRef, useState } from 'react'
import { FileText, Upload, X, Loader2, Eye, AlertCircle } from 'lucide-react'
import {
  EditalSubmissionDocument,
  EditalApiError,
  uploadEditalDocument,
  deleteEditalDocument,
  getEditalDocumentUrl,
} from '@/lib/edital-proposta-api'

interface DocumentUploadSlotProps {
  token: string
  requirementCode: string
  label: string
  helperText?: string
  accept: string
  maxBytes: number
  document: EditalSubmissionDocument | null
  onUploaded: (document: EditalSubmissionDocument) => void
  onRemoved: (documentId: number) => void
  onTokenExpired: () => void
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

export default function DocumentUploadSlot({
  token,
  requirementCode,
  label,
  helperText,
  accept,
  maxBytes,
  document,
  onUploaded,
  onRemoved,
  onTokenExpired,
}: DocumentUploadSlotProps) {
  const [uploading, setUploading] = useState(false)
  const [removing, setRemoving] = useState(false)
  const [error, setError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setError('')

    if (file.size > maxBytes) {
      setError(`Arquivo acima do limite de ${formatFileSize(maxBytes)}`)
      if (inputRef.current) inputRef.current.value = ''
      return
    }

    setUploading(true)
    try {
      const result = await uploadEditalDocument(token, requirementCode, file)
      onUploaded({
        id: result.documentId,
        requirementCode: result.requirementCode,
        originalFilename: result.filename,
        mimeType: file.type,
        sizeBytes: file.size,
        uploadedAt: new Date().toISOString(),
      })
    } catch (err) {
      if (err instanceof EditalApiError && err.reason === 'token_expired') {
        onTokenExpired()
        return
      }
      setError(err instanceof Error ? err.message : 'Erro ao enviar arquivo')
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  const handleRemove = async () => {
    if (!document) return
    setRemoving(true)
    setError('')
    try {
      await deleteEditalDocument(token, document.id)
      onRemoved(document.id)
    } catch (err) {
      if (err instanceof EditalApiError && err.reason === 'token_expired') {
        onTokenExpired()
        return
      }
      setError(err instanceof Error ? err.message : 'Erro ao remover arquivo')
    } finally {
      setRemoving(false)
    }
  }

  const handleView = async () => {
    if (!document) return
    try {
      const url = await getEditalDocumentUrl(token, document.id)
      window.open(url, '_blank', 'noopener,noreferrer')
    } catch (err) {
      if (err instanceof EditalApiError && err.reason === 'token_expired') {
        onTokenExpired()
        return
      }
      setError('Não foi possível abrir o arquivo')
    }
  }

  return (
    <div className="space-y-2">
      <label className="block text-sm font-bold text-slate-100 ml-1">{label}</label>
      {helperText && <p className="text-xs text-slate-400 ml-1">{helperText}</p>}

      {!document && (
        <div>
          <input
            ref={inputRef}
            type="file"
            accept={accept}
            onChange={handleFileChange}
            disabled={uploading}
            className="hidden"
            id={`upload-${requirementCode}`}
          />
          <label
            htmlFor={`upload-${requirementCode}`}
            className="flex items-center justify-center gap-2 w-full p-4 border-2 border-dashed border-slate-700/50 rounded-2xl cursor-pointer hover:border-[#22AE84] transition-colors text-slate-300"
          >
            {uploading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Upload className="w-5 h-5" />
            )}
            <span className="text-sm font-medium">
              {uploading ? 'Enviando...' : 'Clique para selecionar o arquivo'}
            </span>
          </label>
        </div>
      )}

      {document && (
        <div className="flex items-center justify-between p-4 bg-slate-900/60 rounded-2xl border border-slate-700/50">
          <div className="flex items-center gap-3 min-w-0">
            <FileText className="w-5 h-5 text-[#22AE84] flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-sm font-medium text-white truncate">
                {document.originalFilename || 'Arquivo enviado'}
              </p>
              <p className="text-xs text-slate-400">{formatFileSize(document.sizeBytes)}</p>
            </div>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <button
              type="button"
              onClick={handleView}
              className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
              aria-label="Ver arquivo"
            >
              <Eye className="w-4 h-4 text-slate-400 hover:text-[#22AE84]" />
            </button>
            <button
              type="button"
              onClick={handleRemove}
              disabled={removing}
              className="p-2 hover:bg-slate-800 rounded-lg transition-colors disabled:opacity-50"
              aria-label="Remover arquivo"
            >
              {removing ? (
                <Loader2 className="w-4 h-4 text-slate-400 animate-spin" />
              ) : (
                <X className="w-4 h-4 text-slate-400 hover:text-red-400" />
              )}
            </button>
          </div>
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
