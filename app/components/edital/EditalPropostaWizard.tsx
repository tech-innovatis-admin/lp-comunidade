'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, ChevronLeft, ChevronRight, Save } from 'lucide-react'
import EditalStepper from './EditalStepper'
import TelaEquipe from './TelaEquipe'
import TelaInstituicao, { TelaInstituicaoField } from './TelaInstituicao'
import TelaFotos from './TelaFotos'
import TelaProposta from './TelaProposta'
import TelaDeclaracoes from './TelaDeclaracoes'
import TelaRevisao from './TelaRevisao'
import { getEditalSession, clearEditalSession, EditalSessionPrefill } from '@/lib/edital-session'
import {
  EditalSubmissionDocument,
  EditalWizardData,
  EditalDraftStep,
  EditalApiError,
  EMPTY_WIZARD_DATA,
  fetchEditalDraft,
  saveEditalDraftStep,
  submitEditalProposal,
  submissionToWizardData,
} from '@/lib/edital-proposta-api'
import { isInstituicaoCnpjBlocking, onlyDigits } from '@/lib/br-documents'

type WizardStep = 'equipe' | 'instituicao' | 'fotos' | 'proposta' | 'declaracoes' | 'revisao'

const STEPS: Array<{ key: WizardStep; label: string }> = [
  { key: 'equipe', label: 'Equipe' },
  { key: 'instituicao', label: 'Instituição' },
  { key: 'fotos', label: 'Fotos' },
  { key: 'proposta', label: 'Proposta' },
  { key: 'declaracoes', label: 'Declarações' },
  { key: 'revisao', label: 'Revisão' },
]

const DRAFT_STEP_BY_WIZARD_STEP: Partial<Record<WizardStep, EditalDraftStep>> = {
  equipe: 'equipe',
  instituicao: 'instituicao',
  fotos: 'fotos',
  proposta: 'proposta',
}

const LAST_STEP_STORAGE_KEY = 'edital_proposta_last_step'

function isEmptyDraft(data: EditalWizardData, documents: EditalSubmissionDocument[]): boolean {
  if (documents.length > 0) {
    return false
  }

  for (const key of Object.keys(EMPTY_WIZARD_DATA) as Array<keyof EditalWizardData>) {
    if (key === 'budgetItems') {
      if (data.budgetItems.length > 0) {
        return false
      }
    } else if (data[key] !== '') {
      return false
    }
  }

  return true
}

function buildStepPayload(step: EditalDraftStep, data: EditalWizardData): Record<string, unknown> {
  if (step === 'equipe') {
    return { team_description: data.teamDescription }
  }
  if (step === 'instituicao') {
    return {
      institution_name: data.institutionName,
      institution_cnpj: onlyDigits(data.institutionCnpj),
      lab_name: data.labName,
      lab_area: data.labArea,
      lab_served_public: data.labServedPublic,
      lab_academic_unit: data.labAcademicUnit,
    }
  }
  if (step === 'fotos') {
    return { lab_structure_description: data.labStructureDescription }
  }
  return {
    budget_items: data.budgetItems,
    technical_justification: data.technicalJustification,
    expected_results: data.expectedResults,
    main_improvement_objective: data.mainImprovementObjective,
  }
}

export default function EditalPropostaWizard() {
  const router = useRouter()
  const [token, setToken] = useState<string | null>(null)
  const [prefill, setPrefill] = useState<EditalSessionPrefill | null>(null)
  const [status, setStatus] = useState<'loading' | 'ready' | 'submitted' | 'error'>('loading')
  const [loadError, setLoadError] = useState('')
  const [currentStep, setCurrentStep] = useState<WizardStep>('equipe')
  const [data, setData] = useState<EditalWizardData>(EMPTY_WIZARD_DATA)
  const [documents, setDocuments] = useState<EditalSubmissionDocument[]>([])
  const [submittedAt, setSubmittedAt] = useState<string | null>(null)
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [showSavedConfirmation, setShowSavedConfirmation] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [instituicaoCnpjBlocked, setInstituicaoCnpjBlocked] = useState(false)

  const handleTokenExpired = useCallback(() => {
    clearEditalSession()
    router.replace('/edital?expired=1')
  }, [router])

  useEffect(() => {
    const session = getEditalSession()
    if (!session) {
      router.replace('/edital')
      return
    }

    setToken(session.token)
    setPrefill(session.prefill)

    fetchEditalDraft(session.token)
      .then((submission) => {
        const wizardData = submission ? submissionToWizardData(submission) : EMPTY_WIZARD_DATA
        const docs = submission?.documents ?? []

        if (submission) {
          setData(wizardData)
          setDocuments(docs)
        }

        if (submission?.status === 'SUBMITTED') {
          setSubmittedAt(submission.submittedAt)
          setStatus('submitted')
          return
        }

        if (isEmptyDraft(wizardData, docs)) {
          setCurrentStep('equipe')
          if (typeof window !== 'undefined') {
            localStorage.removeItem(LAST_STEP_STORAGE_KEY)
          }
        } else {
          const lastStep = typeof window !== 'undefined' ? localStorage.getItem(LAST_STEP_STORAGE_KEY) : null
          if (lastStep && STEPS.some((step) => step.key === lastStep)) {
            setCurrentStep(lastStep as WizardStep)
          }
        }

        setStatus('ready')
      })
      .catch((error) => {
        if (error instanceof EditalApiError && error.reason === 'token_expired') {
          handleTokenExpired()
          return
        }
        setLoadError('Não foi possível carregar seu rascunho. Recarregue a página para tentar novamente.')
        setStatus('error')
      })
  }, [router, handleTokenExpired])

  useEffect(() => {
    if (status === 'ready' && typeof window !== 'undefined') {
      localStorage.setItem(LAST_STEP_STORAGE_KEY, currentStep)
    }
  }, [currentStep, status])

  const persistCurrentStep = useCallback((): Promise<void> => {
    const draftStep = DRAFT_STEP_BY_WIZARD_STEP[currentStep]
    if (!draftStep || !token) {
      return Promise.resolve()
    }

    if (currentStep === 'instituicao' && isInstituicaoCnpjBlocking(data.institutionCnpj)) {
      setInstituicaoCnpjBlocked(true)
      return Promise.resolve()
    }

    setInstituicaoCnpjBlocked(false)
    setSaveState('saving')
    return saveEditalDraftStep(token, draftStep, buildStepPayload(draftStep, data))
      .then(() => {
        setSaveState('saved')
      })
      .catch((error) => {
        if (error instanceof EditalApiError && error.reason === 'token_expired') {
          handleTokenExpired()
          return
        }
        setSaveState('error')
      })
  }, [currentStep, token, data, handleTokenExpired])

  const goToStep = (step: string) => {
    const targetIndex = STEPS.findIndex((item) => item.key === step)
    const fromIndex = STEPS.findIndex((item) => item.key === currentStep)
    const movingForward = targetIndex > fromIndex

    if (
      movingForward &&
      currentStep === 'instituicao' &&
      isInstituicaoCnpjBlocking(data.institutionCnpj)
    ) {
      setInstituicaoCnpjBlocked(true)
      return
    }

    setInstituicaoCnpjBlocked(false)
    if (movingForward || currentStep !== 'instituicao' || !isInstituicaoCnpjBlocking(data.institutionCnpj)) {
      persistCurrentStep()
    }
    setCurrentStep(step as WizardStep)
  }

  const handleSaveAndContinueLater = () => {
    persistCurrentStep().then(() => {
      setShowSavedConfirmation(true)
      setTimeout(() => setShowSavedConfirmation(false), 3000)
    })
  }

  const handleDocumentUploaded = (document: EditalSubmissionDocument) => {
    setDocuments((prev) => [...prev.filter((doc) => doc.id !== document.id), document])
  }

  const handleDocumentRemoved = (documentId: number) => {
    setDocuments((prev) => prev.filter((doc) => doc.id !== documentId))
  }

  const handleSubmit = async () => {
    if (!token) return
    setSubmitting(true)
    setSubmitError(null)
    try {
      const result = await submitEditalProposal(token)
      setSubmittedAt(result.submittedAt)
      setStatus('submitted')
    } catch (error) {
      if (error instanceof EditalApiError && error.reason === 'token_expired') {
        handleTokenExpired()
        return
      }
      if (error instanceof EditalApiError && error.reason === 'already_submitted') {
        setStatus('submitted')
        return
      }
      if (error instanceof EditalApiError && error.reason === 'incomplete') {
        setSubmitError('Ainda há itens pendentes. Confira a lista abaixo.')
        return
      }
      setSubmitError('Não foi possível enviar a proposta agora. Tente novamente em instantes.')
    } finally {
      setSubmitting(false)
    }
  }

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-8 h-8 text-[#22AE84] animate-spin" />
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className="bg-slate-900/40 backdrop-blur-xl rounded-[2.5rem] p-8 sm:p-12 border border-slate-800 shadow-2xl text-center">
        <p className="text-slate-300">{loadError}</p>
      </div>
    )
  }

  if (status === 'submitted') {
    return (
      <div className="bg-slate-900/40 backdrop-blur-xl rounded-[2.5rem] p-8 sm:p-12 border border-slate-800 shadow-2xl">
        <TelaRevisao data={data} documents={documents} readOnly submittedAt={submittedAt} />
      </div>
    )
  }

  const currentIndex = STEPS.findIndex((step) => step.key === currentStep)
  const isFirstStep = currentIndex === 0
  const isLastStep = currentStep === 'revisao'

  return (
    <div className="bg-slate-900/40 backdrop-blur-xl rounded-[2.5rem] p-8 sm:p-12 border border-slate-800 shadow-2xl">
      <EditalStepper steps={STEPS} currentStep={currentStep} onStepClick={goToStep} />

      {currentStep === 'equipe' && prefill && token && (
        <TelaEquipe
          prefill={prefill}
          token={token}
          teamDescription={data.teamDescription}
          onTeamDescriptionChange={(value) => setData((prev) => ({ ...prev, teamDescription: value }))}
          documents={documents}
          onDocumentUploaded={handleDocumentUploaded}
          onDocumentRemoved={handleDocumentRemoved}
          onTokenExpired={handleTokenExpired}
        />
      )}

      {currentStep === 'instituicao' && token && (
        <TelaInstituicao
          token={token}
          institutionName={data.institutionName}
          institutionCnpj={data.institutionCnpj}
          labName={data.labName}
          labAcademicUnit={data.labAcademicUnit}
          labArea={data.labArea}
          labServedPublic={data.labServedPublic}
          onFieldChange={(field: TelaInstituicaoField, value: string) => {
            if (field === 'institutionCnpj') {
              setInstituicaoCnpjBlocked(false)
            }
            setData((prev) => ({ ...prev, [field]: value }))
          }}
          documents={documents}
          onDocumentUploaded={handleDocumentUploaded}
          onDocumentRemoved={handleDocumentRemoved}
          onTokenExpired={handleTokenExpired}
        />
      )}

      {currentStep === 'fotos' && token && (
        <TelaFotos
          token={token}
          labStructureDescription={data.labStructureDescription}
          onLabStructureDescriptionChange={(value) =>
            setData((prev) => ({ ...prev, labStructureDescription: value }))
          }
          documents={documents}
          onDocumentUploaded={handleDocumentUploaded}
          onDocumentRemoved={handleDocumentRemoved}
          onTokenExpired={handleTokenExpired}
        />
      )}

      {currentStep === 'proposta' && (
        <TelaProposta
          mainImprovementObjective={data.mainImprovementObjective}
          onMainImprovementObjectiveChange={(value) =>
            setData((prev) => ({ ...prev, mainImprovementObjective: value }))
          }
          budgetItems={data.budgetItems}
          onBudgetItemsChange={(items) => setData((prev) => ({ ...prev, budgetItems: items }))}
          technicalJustification={data.technicalJustification}
          onTechnicalJustificationChange={(value) =>
            setData((prev) => ({ ...prev, technicalJustification: value }))
          }
          expectedResults={data.expectedResults}
          onExpectedResultsChange={(value) => setData((prev) => ({ ...prev, expectedResults: value }))}
        />
      )}

      {currentStep === 'declaracoes' && token && (
        <TelaDeclaracoes
          token={token}
          documents={documents}
          onDocumentUploaded={handleDocumentUploaded}
          onDocumentRemoved={handleDocumentRemoved}
          onTokenExpired={handleTokenExpired}
        />
      )}

      {currentStep === 'revisao' && (
        <TelaRevisao
          data={data}
          documents={documents}
          readOnly={false}
          submitting={submitting}
          submitError={submitError}
          onNavigateToStep={goToStep}
          onSubmit={handleSubmit}
        />
      )}

      <div className="mt-8 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {!isFirstStep && (
            <button
              type="button"
              onClick={() => goToStep(STEPS[currentIndex - 1].key)}
              className="flex items-center gap-1 px-4 py-3 border border-slate-700/50 text-slate-200 rounded-2xl font-bold hover:border-[#22AE84] transition-all"
            >
              <ChevronLeft className="w-4 h-4" />
              Voltar
            </button>
          )}
          <button
            type="button"
            onClick={handleSaveAndContinueLater}
            className="flex items-center gap-1 px-4 py-3 text-sm text-slate-400 hover:text-slate-200 transition-colors"
          >
            <Save className="w-4 h-4" />
            {showSavedConfirmation ? 'Salvo!' : 'Salvar e continuar depois'}
          </button>
        </div>

        {!isLastStep && (
          <button
            type="button"
            onClick={() => goToStep(STEPS[currentIndex + 1].key)}
            className="flex items-center gap-1 px-6 py-3 bg-[#22AE84] hover:bg-[#1C8C6A] text-white rounded-2xl font-bold transition-all"
          >
            Avançar
            <ChevronRight className="w-4 h-4" />
          </button>
        )}
      </div>

      <p className="mt-3 text-xs text-slate-500 text-right">
        {instituicaoCnpjBlocked && (
          <span className="block text-red-400 mb-1 text-sm">
            Corrija o CNPJ antes de avançar ou salvar.
          </span>
        )}
        {saveState === 'saving' && 'Salvando...'}
        {saveState === 'saved' && 'Salvo'}
        {saveState === 'error' && 'Erro ao salvar automaticamente'}
      </p>
    </div>
  )
}
