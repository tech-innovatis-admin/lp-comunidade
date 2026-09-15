'use client'

import Link from 'next/link'
import type { MouseEvent } from 'react'
import { useEffect, useRef, useState } from 'react'
import { ArrowRight, CalendarDays, Download, ExternalLink, FileText, Lock, X } from 'lucide-react'
import {
  isEditalRegistrationOpen,
  resolveEditalRegistrationOpensAt,
} from '@/lib/edital-registration-window'

const EDITAL_PDF_URL = '/edital/edital-ppi-2026.pdf'
const EDITAL_TITLE = 'Edital PPI 2026'
const EDITAL_SUBTITLE = 'Apoio ao fortalecimento e modernização de laboratórios'
const EDITAL_PERIOD = 'Inscrições: 17/09 a 04/10/2026'

/** Divulgação na home só após este instante (America/Sao_Paulo). Override: NEXT_PUBLIC_EDITAL_ANNOUNCEMENT_AVAILABLE_AT */
const DEFAULT_AVAILABLE_AT = '2026-09-15T06:00:00-03:00'

function resolveTimestamp(raw: string | undefined, fallback: string): number {
  const parsed = Date.parse(raw ?? fallback)
  return Number.isFinite(parsed) ? parsed : Date.parse(fallback)
}

function resolveAvailableAt(): number {
  return resolveTimestamp(process.env.NEXT_PUBLIC_EDITAL_ANNOUNCEMENT_AVAILABLE_AT, DEFAULT_AVAILABLE_AT)
}

export default function EditalAnnouncementSection() {
  const [isVisible, setIsVisible] = useState(false)
  const [registrationOpen, setRegistrationOpen] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const triggerButtonRef = useRef<HTMLButtonElement>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const availableAt = resolveAvailableAt()
    const showIfReady = () => {
      if (Date.now() >= availableAt) {
        setIsVisible(true)
        return true
      }
      return false
    }

    if (showIfReady()) {
      return
    }

    const remainingMs = Math.max(availableAt - Date.now(), 0)
    const timer = window.setTimeout(() => {
      setIsVisible(true)
    }, remainingMs)

    return () => window.clearTimeout(timer)
  }, [])

  useEffect(() => {
    const opensAt = resolveEditalRegistrationOpensAt()
    const markIfReady = () => {
      if (isEditalRegistrationOpen()) {
        setRegistrationOpen(true)
        return true
      }
      setRegistrationOpen(false)
      return false
    }

    if (markIfReady()) {
      return
    }

    const remainingMs = Math.max(opensAt - Date.now(), 0)
    const timer = window.setTimeout(() => {
      setRegistrationOpen(true)
    }, remainingMs)

    return () => window.clearTimeout(timer)
  }, [])

  useEffect(() => {
    if (!isModalOpen) {
      return
    }

    const previousOverflow = document.body.style.overflow

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsModalOpen(false)
      }
    }

    document.body.style.overflow = 'hidden'
    document.addEventListener('keydown', handleKeyDown)
    closeButtonRef.current?.focus()

    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', handleKeyDown)
      triggerButtonRef.current?.focus()
    }
  }, [isModalOpen])

  const closeModal = () => setIsModalOpen(false)

  const handleBackdropClick = (event: MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) {
      closeModal()
    }
  }

  if (!isVisible) {
    return null
  }

  return (
    <section className="relative overflow-hidden bg-[#121826] px-4 py-16 sm:py-20">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(34,174,132,0.22),transparent_32%),radial-gradient(circle_at_bottom_right,rgba(234,91,12,0.18),transparent_30%)]" />

      <div className="relative z-10 mx-auto max-w-6xl">
        <div className="grid items-center gap-8 rounded-[2rem] border border-white/10 bg-white/[0.04] p-6 shadow-2xl shadow-black/20 backdrop-blur-sm sm:p-10 lg:grid-cols-[1.15fr_0.85fr] lg:p-12">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#22AE84]/30 bg-[#22AE84]/10 px-4 py-2 text-sm font-semibold text-[#22AE84]">
              <FileText className="h-4 w-4" aria-hidden="true" />
              Edital aberto
            </div>

            <div className="space-y-4">
              <h2 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl md:text-5xl">
                {EDITAL_TITLE}
              </h2>
              <p className="max-w-3xl text-lg font-medium leading-relaxed text-slate-200 sm:text-xl">
                {EDITAL_SUBTITLE}
              </p>
            </div>

            <div className="inline-flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-slate-100 sm:text-base">
              <CalendarDays className="h-5 w-5 flex-none text-[#EA5B0C]" aria-hidden="true" />
              <span>{EDITAL_PERIOD}</span>
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white p-6 text-slate-900 shadow-premium sm:p-8">
            <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#22AE84] shadow-lg shadow-emerald-950/20">
              <FileText className="h-7 w-7 text-white" aria-hidden="true" />
            </div>

            <h3 className="mb-3 text-2xl font-bold leading-tight">
              Programa de fortalecimento laboratorial
            </h3>
            <p className="mb-8 text-sm leading-relaxed text-slate-600 sm:text-base">
              Confira as regras do programa, prepare a documentação exigida e envie sua proposta no prazo indicado.
            </p>

            <div className="flex flex-col gap-3 sm:flex-row lg:flex-col xl:flex-row">
              <button
                ref={triggerButtonRef}
                type="button"
                onClick={() => setIsModalOpen(true)}
                className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-6 py-3 text-sm font-bold text-slate-900 transition duration-300 hover:border-[#22AE84] hover:text-[#22AE84] focus:outline-none focus:ring-2 focus:ring-[#22AE84] focus:ring-offset-2"
              >
                Edital do Programa
                <ExternalLink className="h-4 w-4" aria-hidden="true" />
              </button>

              {registrationOpen ? (
                <Link
                  href="/edital"
                  className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#EA5B0C] px-6 py-3 text-sm font-bold text-white shadow-lg shadow-orange-950/20 transition duration-300 hover:bg-[#D94F0A] hover:shadow-orange-900/30 focus:outline-none focus:ring-2 focus:ring-[#EA5B0C] focus:ring-offset-2"
                >
                  Inscreva-se
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              ) : (
                <div className="w-full space-y-2">
                  <button
                    type="button"
                    disabled
                    aria-disabled="true"
                    title="Inscrições liberadas a partir de 17/09/2026 à 00:00 (horário de Brasília)"
                    className="inline-flex w-full cursor-not-allowed items-center justify-center gap-2 rounded-full bg-slate-800 px-6 py-3 text-sm font-bold text-slate-400 shadow-inner"
                  >
                    <Lock className="h-4 w-4" aria-hidden="true" />
                    Inscreva-se
                  </button>
                  <p className="text-center text-xs font-medium text-slate-500">
                    Liberação em 17/09/2026 às 00:00 (Brasília)
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/70 p-4 backdrop-blur-sm"
          onClick={handleBackdropClick}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="edital-modal-title"
            aria-describedby="edital-modal-description"
            className="max-h-[calc(100vh-2rem)] w-full max-w-2xl overflow-y-auto rounded-3xl border border-slate-200 bg-white shadow-2xl"
          >
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 p-5 sm:p-6">
              <div>
                <p className="mb-2 text-sm font-semibold text-[#22AE84]">Edital do Programa</p>
                <h2 id="edital-modal-title" className="text-2xl font-extrabold text-slate-900 sm:text-3xl">
                  {EDITAL_TITLE}
                </h2>
              </div>
              <button
                ref={closeButtonRef}
                type="button"
                onClick={closeModal}
                className="rounded-full p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#22AE84]"
                aria-label="Fechar modal do edital"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>

            <div className="space-y-6 p-5 sm:p-6">
              <div className="space-y-3">
                <p className="text-lg font-semibold leading-relaxed text-slate-800">
                  {EDITAL_SUBTITLE}
                </p>
                <div className="inline-flex items-center gap-3 rounded-2xl bg-[#EA5B0C]/10 px-4 py-3 text-sm font-bold text-[#B94709]">
                  <CalendarDays className="h-5 w-5 flex-none" aria-hidden="true" />
                  <span>{EDITAL_PERIOD}</span>
                </div>
              </div>

              <p id="edital-modal-description" className="text-base leading-relaxed text-slate-600">
                O programa apoia iniciativas voltadas ao fortalecimento e modernização de laboratórios,
                com submissão de propostas pelo fluxo digital do Edital PPI 2026.
              </p>

              <div className="grid gap-3 sm:grid-cols-2">
                <a
                  href={EDITAL_PDF_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-6 py-3 text-sm font-bold text-slate-900 transition hover:border-[#22AE84] hover:text-[#22AE84] focus:outline-none focus:ring-2 focus:ring-[#22AE84] focus:ring-offset-2"
                >
                  Abrir edital
                  <ExternalLink className="h-4 w-4" aria-hidden="true" />
                </a>
                <a
                  href={EDITAL_PDF_URL}
                  download
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-[#22AE84] px-6 py-3 text-sm font-bold text-white shadow-lg shadow-emerald-950/20 transition hover:bg-[#1E9A74] focus:outline-none focus:ring-2 focus:ring-[#22AE84] focus:ring-offset-2"
                >
                  Baixar edital
                  <Download className="h-4 w-4" aria-hidden="true" />
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
