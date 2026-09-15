'use client'

import { useState } from 'react'
import { Download, FileText, ImageIcon } from 'lucide-react'
import {
  getDocumentAccessDisposition,
  getDocumentFallbackExtension,
  isThumbnailMimeTypeSupported,
} from '@/lib/edital-document-access'

interface ThumbnailCardProps {
  thumbnailUrl: string
  openUrl: string
  label: string
  caption?: string
  mimeType?: string | null
  aspectClassName?: string
}

function displayExtension(mimeType: string | null | undefined, label: string): string {
  const extension = getDocumentFallbackExtension(mimeType, label)
  return extension === 'JPEG' ? 'JPG' : extension
}

export default function ThumbnailCard({
  thumbnailUrl,
  openUrl,
  label,
  caption,
  mimeType,
  aspectClassName = 'aspect-[3/4]',
}: ThumbnailCardProps) {
  const [failed, setFailed] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const accessDisposition = getDocumentAccessDisposition(mimeType, label)
  const isWordDocument = accessDisposition.documentKind === 'doc' || accessDisposition.documentKind === 'docx'
  const shouldAttemptThumbnail =
    !isWordDocument && (mimeType == null || mimeType === '' || isThumbnailMimeTypeSupported(mimeType))
  const fallbackExtension = displayExtension(mimeType, label)
  const isImage =
    accessDisposition.documentKind === 'jpeg' ||
    accessDisposition.documentKind === 'png' ||
    accessDisposition.documentKind === 'webp'
  const FallbackIcon = isImage ? ImageIcon : FileText
  const actionLabel = isWordDocument || !shouldAttemptThumbnail ? 'Baixar' : 'Abrir'

  return (
    <div className="space-y-2">
      <a
        href={openUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={`group relative block ${aspectClassName} rounded-2xl overflow-hidden border border-slate-700/60 bg-slate-950/80 hover:border-[#22AE84]/60 transition-colors shadow-lg shadow-black/20`}
        title={label}
      >
        {isWordDocument || !shouldAttemptThumbnail || failed ? (
          <div className="flex flex-col items-center justify-center gap-2 w-full h-full text-slate-300 p-4">
            <FallbackIcon className="w-9 h-9 flex-shrink-0 text-[#22AE84]" />
            <span className="text-[10px] font-bold tracking-[0.18em] text-[#22AE84]">{fallbackExtension}</span>
            <span className="text-xs font-medium text-center line-clamp-3 text-slate-200">{label}</span>
            <span className="inline-flex items-center gap-1 text-[11px] text-slate-500">
              <Download className="w-3 h-3" />
              {actionLabel}
            </span>
          </div>
        ) : (
          <>
            {!loaded && (
              <div className="absolute inset-0 animate-pulse bg-slate-800/80" aria-hidden />
            )}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={thumbnailUrl}
              alt={label}
              onLoad={() => setLoaded(true)}
              onError={() => setFailed(true)}
              className={`w-full h-full object-cover transition-opacity ${loaded ? 'opacity-100' : 'opacity-0'}`}
            />
            <div className="absolute top-2 left-2 rounded-md bg-black/65 px-1.5 py-0.5 text-[10px] font-bold tracking-wide text-white">
              {fallbackExtension}
            </div>
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <p className="text-[11px] text-white line-clamp-2">{label}</p>
            </div>
          </>
        )}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors pointer-events-none" />
      </a>
      {caption && <p className="text-xs text-slate-400 text-center leading-snug px-1">{caption}</p>}
    </div>
  )
}
