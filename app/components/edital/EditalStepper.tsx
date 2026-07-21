'use client'

interface EditalStepperStep {
  key: string
  label: string
}

interface EditalStepperProps {
  steps: EditalStepperStep[]
  currentStep: string
  onStepClick: (key: string) => void
}

export default function EditalStepper({ steps, currentStep, onStepClick }: EditalStepperProps) {
  const currentIndex = steps.findIndex((step) => step.key === currentStep)

  return (
    <div className="flex items-center gap-1 sm:gap-2 mb-8 overflow-x-auto pb-2">
      {steps.map((step, index) => {
        const isActive = step.key === currentStep
        const isPast = index < currentIndex

        return (
          <button
            key={step.key}
            type="button"
            onClick={() => onStepClick(step.key)}
            className={`flex-shrink-0 flex items-center gap-2 px-3 sm:px-4 py-2 rounded-full text-xs sm:text-sm font-bold transition-all ${
              isActive
                ? 'bg-[#22AE84] text-white'
                : isPast
                ? 'bg-[#22AE84]/20 text-[#22AE84]'
                : 'bg-slate-800/60 text-slate-400 hover:text-slate-200'
            }`}
          >
            <span className="flex items-center justify-center w-5 h-5 rounded-full bg-black/20 text-[10px]">
              {index + 1}
            </span>
            <span className="hidden sm:inline">{step.label}</span>
          </button>
        )
      })}
    </div>
  )
}
