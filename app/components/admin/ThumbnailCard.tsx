'use client'

import { useState } from 'react'
import { FileText } from 'lucide-react'

interface ThumbnailCardProps {
  thumbnailUrl: string
  openUrl: string
  label: string
  aspectClassName?: string
}

export default function ThumbnailCard({
  thumbnailUrl,
  openUrl,
  label,
  aspectClassName = 'aspect-[3/4]',
}: ThumbnailCardProps) {
  const [failed, setFailed] = useState(false)

  return (
    <a
      href={openUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={`group relative block ${aspectClassName} rounded-xl overflow-hidden border border-slate-700/50 bg-slate-900/60 hover:border-[#22AE84]/50 transition-colors`}
      title={label}
    >
      {failed ? (
        <div className="flex flex-col items-center justify-center gap-2 w-full h-full text-slate-500 p-3">
          <FileText className="w-8 h-8 flex-shrink-0" />
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
