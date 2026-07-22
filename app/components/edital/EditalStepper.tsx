'use client'

import { useRef } from 'react'

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
  const scrollRef = useRef<HTMLDivElement>(null)
  const dragState = useRef({ isDown: false, startX: 0, scrollLeft: 0, moved: false })

  const handleMouseDown = (e: React.MouseEvent) => {
    const el = scrollRef.current
    if (!el) return
    dragState.current = { isDown: true, startX: e.pageX - el.offsetLeft, scrollLeft: el.scrollLeft, moved: false }
  }

  const stopDragging = () => {
    dragState.current.isDown = false
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    const el = scrollRef.current
    if (!el || !dragState.current.isDown) return
    e.preventDefault()
    const x = e.pageX - el.offsetLeft
    const walk = x - dragState.current.startX
    if (Math.abs(walk) > 5) dragState.current.moved = true
    el.scrollLeft = dragState.current.scrollLeft - walk
  }

  const handleStepClick = (key: string) => {
    if (dragState.current.moved) {
      dragState.current.moved = false
      return
    }
    onStepClick(key)
  }

  return (
    <div
      ref={scrollRef}
      onMouseDown={handleMouseDown}
      onMouseUp={stopDragging}
      onMouseLeave={stopDragging}
      onMouseMove={handleMouseMove}
      className="flex items-center gap-1 sm:gap-2 mb-8 overflow-x-auto pb-2 scrollbar-hide cursor-grab active:cursor-grabbing select-none"
    >
      {steps.map((step, index) => {
        const isActive = step.key === currentStep
        const isPast = index < currentIndex

        return (
          <button
            key={step.key}
            type="button"
            onClick={() => handleStepClick(step.key)}
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
