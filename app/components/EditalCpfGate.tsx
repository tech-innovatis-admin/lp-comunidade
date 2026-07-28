'use client'

import { useState } from 'react'
import Link from 'next/link'
import { CreditCard, Loader2, CheckCircle2, AlertCircle } from 'lucide-react'
import { validateCpfForEdital, EditalValidationError } from '@/lib/edital-api'
import { setEditalSession } from '@/lib/edital-session'

type GateState = 'idle' | 'validating' | 'blocked' | 'granted'

function triggerDownload(url: string) {
  const link = document.createElement('a')
  link.href = url
  link.rel = 'noopener noreferrer'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

export default function EditalCpfGate() {
  const [state, setState] = useState<GateState>('idle')
  const [cpf, setCpf] = useState('')
  const [website, setWebsite] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [welcomeName, setWelcomeName] = useState('')
  const [alreadySubmitted, setAlreadySubmitted] = useState(false)
  const [certificateUrl, setCertificateUrl] = useState<string | null>(null)

  const formatCPF = (value: string) => {
    const numbers = value.replace(/\D/g, '')
    if (numbers.length <= 11) {
      if (numbers.length <= 3) return numbers
      if (numbers.length <= 6) return numbers.replace(/(\d{3})(\d+)/, '$1.$2')
      if (numbers.length <= 9) return numbers.replace(/(\d{3})(\d{3})(\d+)/, '$1.$2.$3')
      return numbers.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
    }
    return value
  }

  const handleCpfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCpf(formatCPF(e.target.value))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage('')
    setState('validating')

    try {
      const result = await validateCpfForEdital(cpf, website)
      setEditalSession({ token: result.token, prefill: result.prefill })
      setWelcomeName(result.prefill.fullName)
      setAlreadySubmitted(result.alreadySubmitted)
      setCertificateUrl(result.certificateUrl)
      setState('granted')

      if (result.certificateUrl) {
        triggerDownload(result.certificateUrl)
      }
    } catch (error) {
      if (error instanceof EditalValidationError && error.reason === 'not_found') {
        setState('blocked')
        return
      }

      if (error instanceof EditalValidationError && error.reason === 'rate_limited') {
        setErrorMessage('Muitas tentativas. Tente novamente em alguns minutos.')
      } else if (error instanceof EditalValidationError && error.reason === 'invalid_cpf') {
        setErrorMessage('CPF inválido. Confira os números e tente novamente.')
      } else {
        setErrorMessage('Não foi possível validar seu CPF agora. Tente novamente daqui a pouco.')
      }
      setState('idle')
    }
  }

  const handleTryAnotherCpf = () => {
    setCpf('')
    setErrorMessage('')
    setState('idle')
  }

  if (state === 'blocked') {
    return (
      <div className="bg-slate-900/40 backdrop-blur-xl rounded-[2.5rem] p-8 sm:p-12 border border-slate-800 shadow-2xl text-center">
        <AlertCircle className="w-12 h-12 text-amber-400 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-white mb-3">
          Não encontramos uma inscrição confirmada com esse CPF na comunidade InnovaNation
        </h2>
        <p className="text-slate-300 mb-8">
          Para submeter uma proposta ao Edital PPI, você precisa primeiro concluir sua inscrição
          na página de pré-cadastro e depois seguir para o formulário de inscrição.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/inscricao"
            className="px-6 py-4 bg-[#22AE84] hover:bg-[#1C8C6A] text-white rounded-2xl font-bold transition-all text-center"
          >
            Fazer minha inscrição
          </Link>
          <button
            type="button"
            onClick={handleTryAnotherCpf}
            className="px-6 py-4 border border-slate-700/50 text-slate-200 rounded-2xl font-bold hover:border-[#22AE84] transition-all"
          >
            Tentar outro CPF
          </button>
        </div>
      </div>
    )
  }

  if (state === 'granted' && alreadySubmitted) {
    return (
      <div className="bg-slate-900/40 backdrop-blur-xl rounded-[2.5rem] p-8 sm:p-12 border border-slate-800 shadow-2xl text-center">
        <CheckCircle2 className="w-12 h-12 text-[#22AE84] mx-auto mb-4" />
        <h2 className="text-xl font-bold text-white mb-3">
          Bem-vindo(a) de volta, {welcomeName}!
        </h2>
        <p className="text-slate-300 mb-8">
          Sua proposta ao Edital PPI já foi enviada. Você não precisa enviá-la novamente —
          o download do seu certificado de inscrição na comunidade começou automaticamente.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          {certificateUrl && (
            <button
              type="button"
              onClick={() => triggerDownload(certificateUrl)}
              className="px-6 py-4 bg-[#22AE84] hover:bg-[#1C8C6A] text-white rounded-2xl font-bold transition-all"
            >
              Baixar certificado novamente
            </button>
          )}
          <Link
            href="/edital/proposta"
            className="px-6 py-4 border border-slate-700/50 text-slate-200 rounded-2xl font-bold hover:border-[#22AE84] transition-all text-center"
          >
            Ver minha proposta
          </Link>
        </div>
      </div>
    )
  }

  if (state === 'granted') {
    return (
      <div className="bg-slate-900/40 backdrop-blur-xl rounded-[2.5rem] p-8 sm:p-12 border border-slate-800 shadow-2xl text-center">
        <CheckCircle2 className="w-12 h-12 text-[#22AE84] mx-auto mb-4" />
        <h2 className="text-xl font-bold text-white mb-3">
          Bem-vindo(a), {welcomeName}!
        </h2>
        <p className="text-slate-300 mb-8">
          Seu cadastro na comunidade InnovaNation foi confirmado e o download do seu
          certificado de inscrição começou automaticamente. Continue para preencher
          o formulário de submissão da proposta ao Edital PPI.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          {certificateUrl && (
            <button
              type="button"
              onClick={() => triggerDownload(certificateUrl)}
              className="px-6 py-4 border border-slate-700/50 text-slate-200 rounded-2xl font-bold hover:border-[#22AE84] transition-all"
            >
              Baixar certificado novamente
            </button>
          )}
          <Link
            href="/edital/proposta"
            className="px-6 py-4 bg-[#22AE84] hover:bg-[#1C8C6A] text-white rounded-2xl font-bold transition-all text-center"
          >
            Continuar
          </Link>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="bg-slate-900/40 backdrop-blur-xl rounded-[2.5rem] p-8 sm:p-12 border border-slate-800 shadow-2xl">
      <div className="hidden" aria-hidden="true">
        <label htmlFor="website">Website</label>
        <input
          type="text"
          id="website"
          name="website"
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
          tabIndex={-1}
          autoComplete="off"
        />
      </div>

      <h2 className="text-xl font-bold text-white mb-2">Edital PPI 2026</h2>
      <p className="text-slate-400 mb-8">
        Informe o CPF usado na sua inscrição da comunidade InnovaNation para continuar.
      </p>

      <label htmlFor="cpf" className="block text-sm font-bold text-slate-100 mb-3 ml-1">
        <CreditCard className="inline w-4 h-4 mr-2 text-[#22AE84]" />
        CPF
      </label>
      <input
        type="text"
        id="cpf"
        name="cpf"
        value={cpf}
        onChange={handleCpfChange}
        placeholder="000.000.000-00"
        maxLength={14}
        required
        className="w-full px-6 py-4 bg-slate-900/60 border border-slate-700/50 rounded-2xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#22AE84]/30 focus:border-[#22AE84] transition-all font-medium"
      />

      {errorMessage && (
        <p className="mt-4 text-sm text-red-400 font-medium">{errorMessage}</p>
      )}

      <button
        type="submit"
        disabled={state === 'validating' || cpf.replace(/\D/g, '').length !== 11}
        className="mt-8 w-full px-6 py-4 bg-[#22AE84] hover:bg-[#1C8C6A] disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-2xl font-bold transition-all flex items-center justify-center gap-2"
      >
        {state === 'validating' && <Loader2 className="w-5 h-5 animate-spin" />}
        {state === 'validating' ? 'Validando...' : 'Continuar'}
      </button>
    </form>
  )
}
