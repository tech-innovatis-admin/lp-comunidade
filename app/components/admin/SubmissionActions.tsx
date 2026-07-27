'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, AlertCircle } from 'lucide-react'
import { EDITAL_EVALUATION_CRITERIA, EDITAL_APPROVAL_MIN_SCORE, validateEvaluationScores } from '@/lib/edital-evaluation'

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

function initialScores(evaluation: EvaluationData | null): Record<string, number> {
  const scores: Record<string, number> = {}
  for (const criterion of EDITAL_EVALUATION_CRITERIA) {
    scores[criterion.code] = evaluation?.scores[criterion.code] ?? 0
  }
  return scores
}

export default function SubmissionActions({ submissionId, evaluation, disqualification }: SubmissionActionsProps) {
  const router = useRouter()
  const [showEvaluationModal, setShowEvaluationModal] = useState(false)
  const [showDisqualifyModal, setShowDisqualifyModal] = useState(false)
  const [scores, setScores] = useState<Record<string, number>>(() => initialScores(evaluation))
  const [reason, setReason] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const openEvaluationModal = () => {
    setScores(initialScores(evaluation))
    setError('')
    setShowEvaluationModal(true)
  }

  const openDisqualifyModal = () => {
    setReason('')
    setError('')
    setShowDisqualifyModal(true)
  }

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
    if (!window.confirm('Reverter a desqualificação desta proposta?')) {
      return
    }

    setSaving(true)

    try {
      const response = await fetch(`/api/admin/editais/${submissionId}/requalificar`, { method: 'POST' })
      if (!response.ok) {
        window.alert('Não foi possível reverter a desqualificação. Tente novamente.')
        setSaving(false)
        return
      }
      router.refresh()
    } catch {
      window.alert('Não foi possível reverter a desqualificação. Tente novamente.')
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
          onClick={handleRequalify}
          disabled={saving}
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
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold text-white mb-6">Avaliação da proposta</h2>

            <div className="space-y-4">
              {EDITAL_EVALUATION_CRITERIA.map((criterion) => (
                <div key={criterion.code}>
                  <label htmlFor={`score-${criterion.code}`} className="block text-sm text-slate-300 mb-1">
                    {criterion.label} <span className="text-slate-500">(máx. {criterion.maxPoints})</span>
                  </label>
                  <input
                    id={`score-${criterion.code}`}
                    type="number"
                    min={0}
                    max={criterion.maxPoints}
                    step={1}
                    value={scores[criterion.code]}
                    onChange={(e) => {
                      const value = Number.parseInt(e.target.value, 10)
                      setScores((prev) => ({ ...prev, [criterion.code]: Number.isFinite(value) ? value : 0 }))
                    }}
                    className="w-full px-4 py-2 bg-slate-900/60 border border-slate-700/50 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-[#22AE84]/30 focus:border-[#22AE84]"
                  />
                </div>
              ))}
            </div>

            <div className="mt-6 flex items-center justify-between border-t border-slate-800 pt-4">
              <span className="text-slate-300 font-medium">Nota final</span>
              <span className={`text-2xl font-bold ${validation.total >= EDITAL_APPROVAL_MIN_SCORE ? 'text-[#22AE84]' : 'text-slate-200'}`}>
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
    </div>
  )
}
