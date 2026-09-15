'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, AlertCircle } from 'lucide-react'
import {
  EDITAL_EVALUATION_CRITERIA,
  EDITAL_APPROVAL_MIN_SCORE,
  validateEvaluationScores,
} from '@/lib/edital-evaluation'

interface EvaluationData {
  scores: Record<string, number>
  total: number
  evaluatedBy: string
  evaluatedAt: string
}

interface DisqualificationData {
  reason: string
  disqualifiedBy: string
  disqualifiedAt: string
}

interface SubmissionActionsProps {
  submissionId: number
  evaluation: EvaluationData | null
  disqualification: DisqualificationData | null
}

function initialScoreInputs(evaluation: EvaluationData | null): Record<string, string> {
  const inputs: Record<string, string> = {}
  for (const criterion of EDITAL_EVALUATION_CRITERIA) {
    inputs[criterion.code] = String(evaluation?.scores[criterion.code] ?? 0)
  }
  return inputs
}

function parseScoreInputs(inputs: Record<string, string>): Record<string, number> {
  const scores: Record<string, number> = {}
  for (const criterion of EDITAL_EVALUATION_CRITERIA) {
    const raw = inputs[criterion.code]?.trim() ?? ''
    if (raw === '') {
      scores[criterion.code] = 0
      continue
    }
    const parsed = Number.parseInt(raw, 10)
    scores[criterion.code] = Number.isFinite(parsed) ? parsed : 0
  }
  return scores
}

function sanitizeScoreInput(raw: string, maxPoints: number): string {
  const digits = raw.replace(/\D/g, '')
  if (digits === '') {
    return ''
  }

  const parsed = Number.parseInt(digits, 10)
  if (!Number.isFinite(parsed)) {
    return ''
  }

  return String(Math.min(Math.max(parsed, 0), maxPoints))
}

export default function SubmissionActions({ submissionId, evaluation, disqualification }: SubmissionActionsProps) {
  const router = useRouter()
  const [showEvaluationModal, setShowEvaluationModal] = useState(false)
  const [showDisqualifyModal, setShowDisqualifyModal] = useState(false)
  const [showRequalifyModal, setShowRequalifyModal] = useState(false)
  const [scoreInputs, setScoreInputs] = useState<Record<string, string>>(() => initialScoreInputs(evaluation))
  const [reason, setReason] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const openEvaluationModal = () => {
    setScoreInputs(initialScoreInputs(evaluation))
    setError('')
    setShowEvaluationModal(true)
  }

  const openDisqualifyModal = () => {
    setReason('')
    setError('')
    setShowDisqualifyModal(true)
  }

  const openRequalifyModal = () => {
    setError('')
    setShowRequalifyModal(true)
  }

  const scores = parseScoreInputs(scoreInputs)
  const validation = validateEvaluationScores(scores)

  const handleSaveEvaluation = async () => {
    if (!validation.valid) {
      setError(validation.error || 'Notas inválidas')
      return
    }

    setSaving(true)
    setError('')

    try {
      const response = await fetch(`/api/admin/editais/${submissionId}/avaliacao`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scores }),
      })

      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        setError(data.error || 'Não foi possível salvar a avaliação.')
        setSaving(false)
        return
      }

      setShowEvaluationModal(false)
      setSaving(false)
      router.refresh()
    } catch {
      setError('Não foi possível salvar a avaliação.')
      setSaving(false)
    }
  }

  const handleDisqualify = async () => {
    if (!reason.trim()) {
      setError('Informe o motivo da desqualificação')
      return
    }

    setSaving(true)
    setError('')

    try {
      const response = await fetch(`/api/admin/editais/${submissionId}/desqualificar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      })

      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        setError(data.error || 'Não foi possível desqualificar a proposta.')
        setSaving(false)
        return
      }

      setShowDisqualifyModal(false)
      setSaving(false)
      router.refresh()
    } catch {
      setError('Não foi possível desqualificar a proposta.')
      setSaving(false)
    }
  }

  const handleRequalify = async () => {
    setSaving(true)
    setError('')

    try {
      const response = await fetch(`/api/admin/editais/${submissionId}/requalificar`, { method: 'POST' })
      if (!response.ok) {
        setError('Não foi possível reverter a desqualificação. Tente novamente.')
        setSaving(false)
        return
      }
      setShowRequalifyModal(false)
      setSaving(false)
      router.refresh()
    } catch {
      setError('Não foi possível reverter a desqualificação. Tente novamente.')
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-wrap gap-3">
      <button
        type="button"
        onClick={openEvaluationModal}
        className="px-5 py-3 bg-[#22AE84] hover:bg-[#1C8C6A] text-white rounded-xl font-bold transition-all text-sm"
      >
        {evaluation ? 'Editar avaliação' : 'Fazer avaliação'}
      </button>

      {disqualification ? (
        <button
          type="button"
          onClick={openRequalifyModal}
          className="px-5 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold transition-all text-sm disabled:opacity-50"
        >
          Reverter desqualificação
        </button>
      ) : (
        <button
          type="button"
          onClick={openDisqualifyModal}
          className="px-5 py-3 bg-red-900/40 hover:bg-red-900/60 border border-red-800/50 text-red-300 rounded-xl font-bold transition-all text-sm"
        >
          Desqualificar
        </button>
      )}

      {showEvaluationModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-8">
          <div className="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 max-h-[90vh] overflow-y-auto admin-modal-scroll">
            <h2 className="text-lg font-bold text-white mb-2">Avaliação da proposta</h2>
            <p className="text-sm text-slate-400 mb-6">
              Informe a nota de cada critério. O máximo por campo está indicado ao lado.
            </p>

            <div className="space-y-4">
              {EDITAL_EVALUATION_CRITERIA.map((criterion) => (
                  <div
                    key={criterion.code}
                    className="rounded-2xl border border-slate-800 bg-slate-950/40 px-4 py-3"
                  >
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <label htmlFor={`score-${criterion.code}`} className="text-sm text-slate-200 leading-snug">
                        {criterion.label}
                      </label>
                      <span className="shrink-0 rounded-md bg-slate-800 px-2 py-0.5 text-[11px] font-bold tracking-wide text-[#22AE84]">
                        0–{criterion.maxPoints}
                      </span>
                    </div>
                    <input
                      id={`score-${criterion.code}`}
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      autoComplete="off"
                      value={scoreInputs[criterion.code] ?? ''}
                      placeholder="0"
                      onFocus={(e) => {
                        if ((scoreInputs[criterion.code] ?? '') === '0') {
                          setScoreInputs((prev) => ({ ...prev, [criterion.code]: '' }))
                        }
                        requestAnimationFrame(() => e.target.select())
                      }}
                      onChange={(e) => {
                        const next = sanitizeScoreInput(e.target.value, criterion.maxPoints)
                        setScoreInputs((prev) => ({ ...prev, [criterion.code]: next }))
                        setError('')
                      }}
                      onBlur={() => {
                        setScoreInputs((prev) => {
                          const current = prev[criterion.code]?.trim() ?? ''
                          if (current === '') {
                            return { ...prev, [criterion.code]: '0' }
                          }
                          return prev
                        })
                      }}
                      className="w-full px-4 py-2.5 bg-slate-900/60 border border-slate-700/50 rounded-xl text-white tabular-nums focus:outline-none focus:ring-2 focus:ring-[#22AE84]/30 focus:border-[#22AE84]"
                    />
                  </div>
                ))}
            </div>

            <div className="mt-6 flex items-center justify-between border-t border-slate-800 pt-4">
              <div>
                <p className="text-slate-300 font-medium">Nota final</p>
                <p className="text-xs text-slate-500">Aprovação a partir de {EDITAL_APPROVAL_MIN_SCORE}</p>
              </div>
              <span
                className={`text-2xl font-bold tabular-nums ${
                  validation.total >= EDITAL_APPROVAL_MIN_SCORE ? 'text-[#22AE84]' : 'text-slate-200'
                }`}
              >
                {validation.total} / 100
              </span>
            </div>

            {error && (
              <div className="mt-4 flex items-center gap-2 text-sm text-red-400 font-medium">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => setShowEvaluationModal(false)}
                disabled={saving}
                className="flex-1 px-5 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold transition-all text-sm disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveEvaluation}
                disabled={saving}
                className="flex-1 px-5 py-3 bg-[#22AE84] hover:bg-[#1C8C6A] text-white rounded-xl font-bold transition-all text-sm disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}

      {showDisqualifyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-8">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8">
            <h2 className="text-lg font-bold text-white mb-4">Desqualificar proposta</h2>
            <label htmlFor="disqualify-reason" className="block text-sm text-slate-300 mb-2">
              Motivo
            </label>
            <textarea
              id="disqualify-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={4}
              className="w-full px-4 py-3 bg-slate-900/60 border border-slate-700/50 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-[#22AE84]/30 focus:border-[#22AE84]"
            />

            {error && (
              <div className="mt-4 flex items-center gap-2 text-sm text-red-400 font-medium">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => setShowDisqualifyModal(false)}
                disabled={saving}
                className="flex-1 px-5 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold transition-all text-sm disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleDisqualify}
                disabled={saving}
                className="flex-1 px-5 py-3 bg-red-900/60 hover:bg-red-900/80 text-white rounded-xl font-bold transition-all text-sm disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      {showRequalifyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-8">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8">
            <h2 className="text-lg font-bold text-white mb-4">Reverter desqualificação</h2>
            <p className="text-slate-300">Tem certeza que deseja reverter a desqualificação desta proposta?</p>

            {error && (
              <div className="mt-4 flex items-center gap-2 text-sm text-red-400 font-medium">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => setShowRequalifyModal(false)}
                disabled={saving}
                className="flex-1 px-5 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold transition-all text-sm disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleRequalify}
                disabled={saving}
                className="flex-1 px-5 py-3 bg-[#22AE84] hover:bg-[#1C8C6A] text-white rounded-xl font-bold transition-all text-sm disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
