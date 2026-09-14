'use client'

import { useState } from 'react'
import { FileText } from 'lucide-react'
import {
  getDocumentAccessDisposition,
  getDocumentFallbackExtension,
} from '@/lib/edital-document-access'

interface ThumbnailCardProps {
  thumbnailUrl: string
  openUrl: string
  label: string
  mimeType?: string | null
  aspectClassName?: string
}

export default function ThumbnailCard({
  thumbnailUrl,
  openUrl,
  label,
  mimeType,
  aspectClassName = 'aspect-[3/4]',
}: ThumbnailCardProps) {
  const [failed, setFailed] = useState(false)
  const accessDisposition = getDocumentAccessDisposition(mimeType, label)
  const isWordDocument = accessDisposition.documentKind === 'doc' || accessDisposition.documentKind === 'docx'
  const fallbackExtension = getDocumentFallbackExtension(mimeType, label)

  return (
    <a
      href={openUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={`group relative block ${aspectClassName} rounded-xl overflow-hidden border border-slate-700/50 bg-slate-900/60 hover:border-[#22AE84]/50 transition-colors`}
      title={label}
    >
      {isWordDocument ? (
        <div className="flex flex-col items-center justify-center gap-2 w-full h-full text-slate-300 p-3">
          <FileText className="w-8 h-8 flex-shrink-0 text-[#22AE84]" />
          <span className="text-[10px] font-bold tracking-[0.2em] text-[#22AE84]">{fallbackExtension}</span>
          <span className="text-xs font-medium text-center line-clamp-2">{label}</span>
          <span className="text-[11px] text-slate-500">Baixar arquivo</span>
        </div>
      ) : failed ? (
        <div className="flex flex-col items-center justify-center gap-2 w-full h-full text-slate-500 p-3">
          <FileText className="w-8 h-8 flex-shrink-0" />
          <span className="text-[10px] font-bold tracking-[0.2em]">{fallbackExtension}</span>
          <span className="text-xs font-medium text-center line-clamp-2">{label}</span>
        </div>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={thumbnailUrl}
          alt={label}
          onError={() => setFailed(true)}
          className="w-full h-full object-cover"
        />
      )}
      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors pointer-events-none" />
    </a>
  )
}
