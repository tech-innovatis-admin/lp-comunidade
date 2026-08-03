'use client'

import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { EditalBudgetItem } from '@/lib/edital-proposta-api'
import {
  EDITAL_MAX_BUDGET_ITEMS,
  EDITAL_MAX_BUDGET_DESCRIPTION_LENGTH,
  EDITAL_MAX_BUDGET_JUSTIFICATION_LENGTH,
  EDITAL_MAX_TEXT_LENGTH,
} from '@/lib/edital-requirements'

interface TelaPropostaProps {
  mainImprovementObjective: string
  onMainImprovementObjectiveChange: (value: string) => void
  budgetItems: EditalBudgetItem[]
  onBudgetItemsChange: (items: EditalBudgetItem[]) => void
  technicalJustification: string
  onTechnicalJustificationChange: (value: string) => void
  expectedResults: string
  onExpectedResultsChange: (value: string) => void
}

const inputClass =
  'w-full px-4 py-3 bg-slate-900/60 border border-slate-700/50 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#22AE84]/30 focus:border-[#22AE84] transition-all font-medium text-sm'

const textareaClass =
  'w-full px-6 py-4 bg-slate-900/60 border border-slate-700/50 rounded-2xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#22AE84]/30 focus:border-[#22AE84] transition-all font-medium resize-none'

export default function TelaProposta({
  mainImprovementObjective,
  onMainImprovementObjectiveChange,
  budgetItems,
  onBudgetItemsChange,
  technicalJustification,
  onTechnicalJustificationChange,
  expectedResults,
  onExpectedResultsChange,
}: TelaPropostaProps) {
  const [valorDrafts, setValorDrafts] = useState<Record<number, string>>({})

  const handleValorChange = (index: number, raw: string) => {
    if (!/^\d*\.?\d*$/.test(raw)) {
      return
    }
    setValorDrafts((prev) => ({ ...prev, [index]: raw }))
    const parsed = Number.parseFloat(raw)
    updateItem(index, 'valor_estimado', Number.isNaN(parsed) ? 0 : parsed)
  }

  const getValorDisplay = (index: number, item: EditalBudgetItem): string => {
    if (valorDrafts[index] !== undefined) {
      return valorDrafts[index]
    }
    return item.valor_estimado === 0 ? '' : String(item.valor_estimado)
  }

  const updateItem = (index: number, field: keyof EditalBudgetItem, value: string | number) => {
    const next = budgetItems.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    onBudgetItemsChange(next)
  }

  const addItem = () => {
    if (budgetItems.length >= EDITAL_MAX_BUDGET_ITEMS) return
    onBudgetItemsChange([...budgetItems, { descricao: '', valor_estimado: 0, justificativa: '' }])
  }

  const removeItem = (index: number) => {
    onBudgetItemsChange(budgetItems.filter((_, i) => i !== index))
    setValorDrafts({})
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-bold text-white mb-2">Proposta</h2>
        <p className="text-slate-400">
          Plano de aplicação dos recursos, justificativa técnica e resultados esperados.
        </p>
      </div>

      <div>
        <label htmlFor="main_improvement_objective" className="block text-sm font-bold text-slate-100 mb-3 ml-1">
          Objetivo principal da melhoria pretendida
        </label>
        <p className="text-sm text-slate-400 mb-3 ml-1">
          Informe, de forma clara e objetiva, qual é a principal melhoria que se pretende alcançar no laboratório
          por meio do patrocínio.
        </p>
        <textarea
          id="main_improvement_objective"
          rows={4}
          value={mainImprovementObjective}
          onChange={(e) => onMainImprovementObjectiveChange(e.target.value.slice(0, EDITAL_MAX_TEXT_LENGTH))}
          className={textareaClass}
        />
        <p className="mt-1 text-xs text-slate-500 text-right">
          {mainImprovementObjective.length}/{EDITAL_MAX_TEXT_LENGTH}
        </p>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <label className="block text-sm font-bold text-slate-100 ml-1">Itens de orçamento</label>
          <button
            type="button"
            onClick={addItem}
            disabled={budgetItems.length >= EDITAL_MAX_BUDGET_ITEMS}
            className="flex items-center gap-1 text-sm font-bold text-[#22AE84] hover:text-[#1C8C6A] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus className="w-4 h-4" />
            Adicionar item
          </button>
        </div>

        {budgetItems.length === 0 && (
          <p className="text-sm text-slate-500">Nenhum item adicionado ainda.</p>
        )}

        {budgetItems.map((item, index) => (
          <div key={index} className="p-4 bg-slate-900/40 rounded-2xl border border-slate-800 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <span className="text-xs font-bold text-slate-500 mt-3">Item {index + 1}</span>
              <button
                type="button"
                onClick={() => removeItem(index)}
                className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
                aria-label="Remover item"
              >
                <Trash2 className="w-4 h-4 text-slate-400 hover:text-red-400" />
              </button>
            </div>
            <input
              type="text"
              value={item.descricao}
              onChange={(e) =>
                updateItem(index, 'descricao', e.target.value.slice(0, EDITAL_MAX_BUDGET_DESCRIPTION_LENGTH))
              }
              placeholder="Descrição do item, serviço ou equipamento"
              className={inputClass}
            />
            <input
              type="text"
              inputMode="decimal"
              value={getValorDisplay(index, item)}
              onChange={(e) => handleValorChange(index, e.target.value)}
              placeholder="Valor estimado (R$)"
              className={inputClass}
            />
            <textarea
              value={item.justificativa}
              onChange={(e) =>
                updateItem(index, 'justificativa', e.target.value.slice(0, EDITAL_MAX_BUDGET_JUSTIFICATION_LENGTH))
              }
              placeholder="Justificativa da despesa"
              rows={2}
              className={`${inputClass} resize-none`}
            />
          </div>
        ))}
      </div>

      <div>
        <label htmlFor="technical_justification" className="block text-sm font-bold text-slate-100 mb-3 ml-1">
          Justificativa técnica
        </label>
        <textarea
          id="technical_justification"
          value={technicalJustification}
          onChange={(e) => onTechnicalJustificationChange(e.target.value.slice(0, EDITAL_MAX_TEXT_LENGTH))}
          rows={6}
          placeholder="Situação atual do laboratório, problemas identificados e relevância da intervenção proposta"
          className={textareaClass}
        />
        <p className="mt-1 text-xs text-slate-500 text-right">
          {technicalJustification.length}/{EDITAL_MAX_TEXT_LENGTH}
        </p>
      </div>

      <div>
        <label htmlFor="expected_results" className="block text-sm font-bold text-slate-100 mb-3 ml-1">
          Resultados esperados
        </label>
        <textarea
          id="expected_results"
          value={expectedResults}
          onChange={(e) => onExpectedResultsChange(e.target.value.slice(0, EDITAL_MAX_TEXT_LENGTH))}
          rows={6}
          placeholder="Público beneficiado, impactos previstos e indicadores de acompanhamento"
          className={textareaClass}
        />
        <p className="mt-1 text-xs text-slate-500 text-right">
          {expectedResults.length}/{EDITAL_MAX_TEXT_LENGTH}
        </p>
      </div>
    </div>
  )
}
