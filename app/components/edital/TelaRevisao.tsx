'use client'

import { CheckCircle2, XCircle, Loader2 } from 'lucide-react'
import { EditalSubmissionDocument, EditalWizardData } from '@/lib/edital-proposta-api'
import {
  computeEditalMissingItems,
  EDITAL_FIELD_LABELS,
  EDITAL_DOCUMENT_LABELS,
  EDITAL_STEP_BY_FIELD,
  EDITAL_STEP_BY_DOCUMENT_CODE,
} from '@/lib/edital-completeness'
import { EDITAL_MIN_PHOTO_COUNT } from '@/lib/edital-requirements'

interface TelaRevisaoProps {
  data: EditalWizardData
  documents: EditalSubmissionDocument[]
  readOnly: boolean
  submittedAt?: string | null
  submitting?: boolean
  submitError?: string | null
  onNavigateToStep?: (step: string) => void
  onSubmit?: () => void
}

export default function TelaRevisao({
  data,
  documents,
  readOnly,
  submittedAt,
  submitting,
  submitError,
  onNavigateToStep,
  onSubmit,
}: TelaRevisaoProps) {
  const missing = computeEditalMissingItems(data, documents)
  const missingKeys = new Set(
    missing.map((item) =>
      item.type === 'field' ? `field:${item.field}` : item.type === 'document' ? `document:${item.requirementCode}` : 'photo'
    )
  )

  const fieldRows = Object.entries(EDITAL_FIELD_LABELS).map(([field, label]) => ({
    key: `field:${field}`,
    label,
    ok: !missingKeys.has(`field:${field}`),
    step: EDITAL_STEP_BY_FIELD[field],
  }))

  const documentRows = Object.entries(EDITAL_DOCUMENT_LABELS).map(([code, label]) => ({
    key: `document:${code}`,
    label,
    ok: !missingKeys.has(`document:${code}`),
    step: EDITAL_STEP_BY_DOCUMENT_CODE[code],
  }))

  const rows = [
    ...fieldRows,
    ...documentRows,
    {
      key: 'photo',
      label: `Fotos do laboratório (mín. ${EDITAL_MIN_PHOTO_COUNT})`,
      ok: !missingKeys.has('photo'),
      step: 'fotos',
    },
  ]

  if (readOnly) {
    return (
      <div className="space-y-8">
        <div className="text-center">
          <CheckCircle2 className="w-12 h-12 text-[#22AE84] mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">Proposta enviada</h2>
          {submittedAt && (
            <p className="text-slate-400">Enviada em {new Date(submittedAt).toLocaleString('pt-BR')}</p>
          )}
        </div>
        <ul className="space-y-2">
          {rows.map((row) => (
            <li key={row.key} className="flex items-center gap-3 p-3 bg-slate-900/40 rounded-xl">
              <CheckCircle2 className="w-4 h-4 text-[#22AE84] flex-shrink-0" />
              <span className="text-sm text-slate-200">{row.label}</span>
            </li>
          ))}
        </ul>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-bold text-white mb-2">Revisão e envio</h2>
        <p className="text-slate-400">
          Confira se todos os itens obrigatórios estão completos antes de enviar sua proposta.
        </p>
      </div>

      <ul className="space-y-2">
        {rows.map((row) => (
          <li key={row.key}>
            <button
              type="button"
              onClick={() => onNavigateToStep?.(row.step)}
              className="w-full flex items-center gap-3 p-3 bg-slate-900/40 hover:bg-slate-900/60 rounded-xl transition-colors text-left"
            >
              {row.ok ? (
                <CheckCircle2 className="w-4 h-4 text-[#22AE84] flex-shrink-0" />
              ) : (
                <XCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
              )}
              <span className="text-sm text-slate-200">{row.label}</span>
            </button>
          </li>
        ))}
      </ul>

      {submitError && <p className="text-sm text-red-400 font-medium">{submitError}</p>}

      <button
        type="button"
        onClick={onSubmit}
        disabled={missing.length > 0 || submitting}
        className="w-full px-6 py-4 bg-[#22AE84] hover:bg-[#1C8C6A] disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-2xl font-bold transition-all flex items-center justify-center gap-2"
      >
        {submitting && <Loader2 className="w-5 h-5 animate-spin" />}
        {submitting ? 'Enviando...' : 'Enviar proposta'}
      </button>
    </div>
  )
}
