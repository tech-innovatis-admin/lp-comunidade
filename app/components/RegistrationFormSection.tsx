'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { User, CreditCard, Phone, Mail, MapPin, CheckCircle, Briefcase, FolderOpen, Building2, FileText, ChevronRight, X, AlertCircle } from 'lucide-react'
import TermsModal from './TermsModal'
import ConfettiEffect from './ConfettiEffect'
import { fetchActiveTerms, submitRegistration, type TermsResponse } from '@/lib/api'

// Helper para eventos do Google Analytics e Meta Pixel
const trackEvent = (eventName: string, params: Record<string, any> = {}) => {
  if (typeof window !== 'undefined') {
    // Google Analytics
    if ((window as any).gtag) {
      (window as any).gtag('event', eventName, params);
    }
    // Meta Pixel
    if ((window as any).fbq) {
      if (eventName === 'generate_lead') {
        (window as any).fbq('track', 'Lead', params);
      } else {
        (window as any).fbq('trackCustom', eventName, params);
      }
    }
  }
};

export default function RegistrationFormSection() {
  const [formData, setFormData] = useState({
    nomeCompleto: '',
    profissao: '',
    empresa: '',
    cpf: '',
    telefone: '',
    email: '',
    cep: '',
    logradouro: '',
    numero: '',
    bairro: '',
    cidade: '',
    estado: '',
    projetos: '',
    website: ''
  })

  const [terms, setTerms] = useState({
    termoAdesao: false
  })

  const [activeTerms, setActiveTerms] = useState<TermsResponse | null>(null)
  const [isLoadingTerms, setIsLoadingTerms] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [showMissingFieldsModal, setShowMissingFieldsModal] = useState(false)
  const [missingFieldsList, setMissingFieldsList] = useState<string[]>([])
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isFetchingCep, setIsFetchingCep] = useState(false)
  const [lastCepSearched, setLastCepSearched] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showConfetti, setShowConfetti] = useState(false)
  const [hasShownConfetti, setHasShownConfetti] = useState(false)
  const [showSuccessMessage, setShowSuccessMessage] = useState(false)
  const [showDuplicateErrorModal, setShowDuplicateErrorModal] = useState(false)
  const [duplicateErrorMessage, setDuplicateErrorMessage] = useState('')
  const [formStarted, setFormStarted] = useState(false)

  // Variante fixa: MANUAL
  const variant = 'MANUAL'

  // Busca termos ativos ao carregar
  useEffect(() => {
    async function loadTerms() {
      try {
        setIsLoadingTerms(true)
        const termsData = await fetchActiveTerms()
        setActiveTerms(termsData)
      } catch (error) {
        console.error('Erro ao carregar termos:', error)
        setErrors(prev => ({ ...prev, terms: 'Erro ao carregar termos de uso' }))
      } finally {
        setIsLoadingTerms(false)
      }
    }
    loadTerms()
  }, [])

  // Bloqueia scroll quando popup de sucesso está aberto
  useEffect(() => {
    if (showSuccessMessage) {
      document.body.style.overflow = 'hidden'
      document.body.style.position = 'fixed'
      document.body.style.width = '100%'
    } else {
      document.body.style.overflow = ''
      document.body.style.position = ''
      document.body.style.width = ''
    }

    // Cleanup ao desmontar
    return () => {
      document.body.style.overflow = ''
      document.body.style.position = ''
      document.body.style.width = ''
    }
  }, [showSuccessMessage])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target

    // Tracking: Início do preenchimento do formulário
    if (!formStarted) {
      setFormStarted(true);
      trackEvent('form_start', {
        form_id: 'registration_form',
        form_name: 'Inscrição InnovaNation'
      });
    }

    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
    // Limpa erro do campo quando usuário começa a digitar
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[name]
        return newErrors
      })
    }
  }

  const handleCheckboxChange = () => {
    setTerms(prev => ({
      ...prev,
      termoAdesao: !prev.termoAdesao
    }))
    if (errors.termoAdesao) {
      setErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors.termoAdesao
        return newErrors
      })
    }
  }

  const handleOpenModal = () => {
    setIsModalOpen(true)
    trackEvent('view_terms', {
      terms_type: 'adesão_compromisso'
    });
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
  }

  const handleAcceptTerms = () => {
    setTerms(prev => ({
      ...prev,
      termoAdesao: true
    }))
    setIsModalOpen(false)
    if (errors.termoAdesao) {
      setErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors.termoAdesao
        return newErrors
      })
    }
  }

  // Função de validação de CPF com cálculo dos dígitos verificadores
  const isValidCPF = (raw: string): boolean => {
    // 1) Remove tudo que não for número
    const cpf = raw.replace(/\D/g, '')

    // 2) Checa tamanho (tem que ter 11 dígitos)
    if (cpf.length !== 11) return false

    // 3) Rejeita CPFs com todos os dígitos iguais (ex.: 11111111111)
    if (/^(\d)\1{10}$/.test(cpf)) return false

    // Função auxiliar para calcular cada dígito verificador
    const calcDigit = (base: string, factorStart: number): number => {
      let sum = 0

      // Multiplica cada dígito pelo peso decrescente
      for (let i = 0; i < base.length; i++) {
        const digit = parseInt(base[i], 10)
        const factor = factorStart - i // ex.: 10,9,8... ou 11,10,9...
        sum += digit * factor
      }

      const rest = sum % 11
      // Regra do CPF
      return rest < 2 ? 0 : 11 - rest
    }

    // 4) Pega os 9 primeiros dígitos
    const base = cpf.slice(0, 9)

    // 5) Calcula o primeiro dígito
    const d1 = calcDigit(base, 10)

    // 6) Calcula o segundo dígito (usando base + d1)
    const d2 = calcDigit(base + d1.toString(), 11)

    // 7) Monta o CPF calculado e compara com o informado
    const cpfCalculated = base + d1.toString() + d2.toString()
    return cpf === cpfCalculated
  }

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

  const formatPhone = (value: string) => {
    const numbers = value.replace(/\D/g, '')
    if (numbers.length <= 11) {
      if (numbers.length <= 2) return numbers
      if (numbers.length <= 7) return numbers.replace(/(\d{2})(\d+)/, '($1) $2')
      return numbers.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3')
    }
    return value
  }

  const formatCep = (value: string) => {
    const numbers = value.replace(/\D/g, '').slice(0, 8)
    if (numbers.length <= 5) return numbers
    return numbers.replace(/(\d{5})(\d{1,3})/, '$1-$2')
  }

  const fetchCep = async (cepDigits: string) => {
    if (cepDigits.length !== 8 || cepDigits === lastCepSearched) {
      return
    }

    setIsFetchingCep(true)
    setLastCepSearched(cepDigits)

    try {
      const response = await fetch(`https://viacep.com.br/ws/${cepDigits}/json/`)
      if (!response.ok) {
        throw new Error('Erro ao consultar CEP')
      }

      const data = await response.json()
      if (data?.erro) {
        setErrors(prev => ({ ...prev, cep: 'CEP não encontrado' }))
        return
      }

      setFormData(prev => ({
        ...prev,
        logradouro: data.logradouro || '',
        bairro: data.bairro || '',
        cidade: data.localidade || '',
        estado: data.uf || ''
      }))

      setErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors.logradouro
        delete newErrors.bairro
        delete newErrors.cidade
        delete newErrors.estado
        return newErrors
      })
    } catch (error) {
      console.error('Erro ao buscar CEP:', error)
      setErrors(prev => ({ ...prev, cep: 'Erro ao buscar CEP' }))
    } finally {
      setIsFetchingCep(false)
    }
  }

  const handleCepChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCep(e.target.value)
    setFormData(prev => ({ ...prev, cep: formatted }))

    if (errors.cep) {
      setErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors.cep
        return newErrors
      })
    }

    const digits = formatted.replace(/\D/g, '')
    if (digits.length < 8) {
      setLastCepSearched('')
      return
    }
    if (digits.length === 8) {
      await fetchCep(digits)
    }
  }

  const handleStateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 2)
    setFormData(prev => ({ ...prev, estado: value }))

    if (errors.estado) {
      setErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors.estado
        return newErrors
      })
    }
  }

  // Função para verificar se o formulário está válido (sem mostrar erros)
  const isFormValid = () => {
    const nomeValido = formData.nomeCompleto.trim() !== '' && formData.nomeCompleto.length <= 120
    const profissaoValida = formData.profissao.trim() !== ''
    const empresaValida = formData.empresa.trim() !== '' && formData.empresa.length <= 150
    const cpfValido = isValidCPF(formData.cpf) // Validação completa com cálculo dos dígitos verificadores
    const telefoneValido = formData.telefone.replace(/\D/g, '').length >= 10
    const emailValido = formData.email.trim() !== '' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)
    const cepValido = formData.cep.replace(/\D/g, '').length === 8
    const logradouroValido = formData.logradouro.trim() !== ''
    const numeroValido = formData.numero.trim() !== ''
    const bairroValido = formData.bairro.trim() !== ''
    const cidadeValida = formData.cidade.trim() !== ''
    const estadoValido = formData.estado.trim().length === 2
    const termosValidos = terms.termoAdesao

    return nomeValido && profissaoValida && empresaValida && cpfValido && telefoneValido && emailValido && cepValido && logradouroValido && numeroValido && bairroValido && cidadeValida && estadoValido && termosValidos
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.nomeCompleto.trim()) {
      newErrors.nomeCompleto = 'Nome completo é obrigatório'
    } else if (formData.nomeCompleto.length > 120) {
      newErrors.nomeCompleto = 'Nome completo deve ter no máximo 120 caracteres'
    }

    if (!formData.profissao.trim()) {
      newErrors.profissao = 'Profissão é obrigatória'
    }

    if (!formData.empresa.trim()) {
      newErrors.empresa = 'Empresa ou Instituição que Trabalha é obrigatória'
    } else if (formData.empresa.length > 150) {
      newErrors.empresa = 'Empresa ou Instituição deve ter no máximo 150 caracteres'
    }

    if (!formData.cpf.trim()) {
      newErrors.cpf = 'CPF é obrigatório'
    } else if (formData.cpf.replace(/\D/g, '').length !== 11) {
      newErrors.cpf = 'CPF deve conter 11 dígitos'
    } else if (!isValidCPF(formData.cpf)) {
      newErrors.cpf = 'CPF inválido. Verifique os dígitos informados.'
    }

    if (!formData.telefone.trim()) {
      newErrors.telefone = 'Telefone é obrigatório'
    } else if (formData.telefone.replace(/\D/g, '').length < 10) {
      newErrors.telefone = 'Telefone inválido'
    }

    if (!formData.email.trim()) {
      newErrors.email = 'E-mail é obrigatório'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'E-mail inválido'
    }

    const cepDigits = formData.cep.replace(/\D/g, '')
    if (!cepDigits) {
      newErrors.cep = 'CEP é obrigatório'
    } else if (cepDigits.length !== 8) {
      newErrors.cep = 'CEP deve conter 8 dígitos'
    }

    if (!formData.logradouro.trim()) {
      newErrors.logradouro = 'Logradouro é obrigatório'
    }

    if (!formData.numero.trim()) {
      newErrors.numero = 'Número é obrigatório'
    }

    if (!formData.bairro.trim()) {
      newErrors.bairro = 'Bairro é obrigatório'
    }

    if (!formData.cidade.trim()) {
      newErrors.cidade = 'Cidade é obrigatória'
    }

    if (!formData.estado.trim()) {
      newErrors.estado = 'Estado é obrigatório'
    } else if (formData.estado.trim().length !== 2) {
      newErrors.estado = 'Estado deve conter 2 letras (UF)'
    }

    if (!terms.termoAdesao) {
      newErrors.termoAdesao = 'Você deve aceitar o Termo de Adesão, Reciprocidade e Compromisso de Repasse'
    }

    setErrors(newErrors)

    // Tracking: Erros de validação
    if (Object.keys(newErrors).length > 0) {
      trackEvent('form_error', {
        form_id: 'registration_form',
        error_fields: Object.keys(newErrors).join(', ')
      });
    }

    return Object.keys(newErrors).length === 0
  }

  // Função para listar todos os campos pendentes
  const getMissingFields = (): string[] => {
    const missing: string[] = []

    // Campos obrigatórios
    if (!formData.nomeCompleto.trim()) {
      missing.push('Nome completo')
    } else if (formData.nomeCompleto.length > 120) {
      missing.push('Nome completo (máximo 120 caracteres)')
    }

    if (!formData.profissao.trim()) {
      missing.push('Profissão')
    }

    // Empresa ou Instituição
    if (!formData.empresa.trim()) {
      missing.push('Empresa ou Instituição que Trabalha')
    } else if (formData.empresa.length > 150) {
      missing.push('Empresa ou Instituição (máximo 150 caracteres)')
    }

    // CPF
    if (!formData.cpf.trim()) {
      missing.push('CPF')
    } else if (formData.cpf.replace(/\D/g, '').length !== 11) {
      missing.push('CPF (deve conter 11 dígitos)')
    } else if (!isValidCPF(formData.cpf)) {
      missing.push('CPF válido')
    }

    // Telefone
    if (!formData.telefone.trim()) {
      missing.push('Número de telefone')
    } else if (formData.telefone.replace(/\D/g, '').length < 10) {
      missing.push('Telefone válido')
    }

    // Email
    if (!formData.email.trim()) {
      missing.push('E-mail')
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      missing.push('E-mail válido')
    }

    // Endereço
    if (!formData.cep.trim()) {
      missing.push('CEP')
    } else if (formData.cep.replace(/\D/g, '').length !== 8) {
      missing.push('CEP (deve conter 8 dígitos)')
    }

    if (!formData.logradouro.trim()) {
      missing.push('Logradouro')
    }

    if (!formData.numero.trim()) {
      missing.push('Número')
    }

    if (!formData.bairro.trim()) {
      missing.push('Bairro')
    }

    if (!formData.cidade.trim()) {
      missing.push('Cidade')
    }

    if (!formData.estado.trim()) {
      missing.push('Estado (UF)')
    }

    // Termos
    if (!terms.termoAdesao) {
      missing.push('Aceitar Termo de Adesão, Reciprocidade e Compromisso de Repasse')
    }

    return missing
  }

  // Função chamada ao tentar clicar no botão
  const handleAttemptSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    trackEvent('submit_attempt', {
      form_id: 'registration_form'
    });

    // Se estiver enviando, não fazer nada
    if (isSubmitting) {
      return
    }

    // Verifica se o formulário está válido
    if (isFormValid()) {
      // Se estiver tudo ok, prossegue com o submit
      handleSubmit(e)
      return
    }

    // Se houver pendências, mostra modal detalhado
    const missing = getMissingFields()

    if (missing.length > 0) {
      setMissingFieldsList(missing)
      setShowMissingFieldsModal(true)
    }
  }

  // Função para fechar o modal de campos pendentes
  const handleCloseMissingFieldsModal = () => {
    setShowMissingFieldsModal(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    if (!activeTerms) {
      setErrors(prev => ({ ...prev, terms: 'Termos de uso não carregados' }))
      return
    }

    setIsSubmitting(true)

    try {
      // Prepara FormData
      const formDataToSend = new FormData()
      formDataToSend.append('fullName', formData.nomeCompleto.trim())
      formDataToSend.append('profession', formData.profissao.trim())
      formDataToSend.append('organization', formData.empresa.trim())
      formDataToSend.append('cpf', formData.cpf.replace(/\D/g, ''))
      formDataToSend.append('phone', formData.telefone.trim())
      formDataToSend.append('email', formData.email.trim().toLowerCase())
      formDataToSend.append('cep', formData.cep.replace(/\D/g, ''))
      formDataToSend.append('logradouro', formData.logradouro.trim())
      formDataToSend.append('numero', formData.numero.trim())
      formDataToSend.append('bairro', formData.bairro.trim())
      formDataToSend.append('cidade', formData.cidade.trim())
      formDataToSend.append('estado', formData.estado.trim().toUpperCase())
      formDataToSend.append('projects', formData.projetos.trim() || '')
      formDataToSend.append('termsId', activeTerms.id.toString())
      formDataToSend.append('termsVersion', activeTerms.version)
      formDataToSend.append('variant', variant)
      formDataToSend.append('website', formData.website)

      // Envia para API
      await submitRegistration(formDataToSend)

      // Tracking: Lead gerado com sucesso
      trackEvent('generate_lead', {
        value: 1.0, // Valor simbólico de lead
        currency: 'BRL',
        profession: formData.profissao,
        organization: formData.empresa,
        city: formData.cidade,
        state: formData.estado
      });

      setIsSubmitting(false)

      // Mostra a mensagem de sucesso (o useEffect vai bloquear o scroll)
      setShowSuccessMessage(true)

      // Ativa o efeito de confete 3 vezes com intervalos
      if (!hasShownConfetti) {
        setHasShownConfetti(true)

        // Primeira explosão imediatamente
        setShowConfetti(true)

        // Segunda explosão após 1.5 segundos
        setTimeout(() => {
          setShowConfetti(false)
          setTimeout(() => {
            setShowConfetti(true)
          }, 100)
        }, 1500)

        // Terceira explosão após 3 segundos
        setTimeout(() => {
          setShowConfetti(false)
          setTimeout(() => {
            setShowConfetti(true)
          }, 100)
        }, 3000)
      }

      // Reset form após todas as explosões terminarem
      setTimeout(() => {
        setFormData({
          nomeCompleto: '',
          profissao: '',
          empresa: '',
          cpf: '',
          telefone: '',
          email: '',
          cep: '',
          logradouro: '',
          numero: '',
          bairro: '',
          cidade: '',
          estado: '',
          projetos: '',
          website: ''
        })
        setTerms({
          termoAdesao: false
        })
        setShowConfetti(false)
        setHasShownConfetti(false)
        // O useEffect vai restaurar o scroll automaticamente quando showSuccessMessage mudar
      }, 8000)
    } catch (error: any) {
      setIsSubmitting(false)

      // Verifica se é erro de duplicata (409 - Conflict)
      if (error.status === 409) {
        setDuplicateErrorMessage(error.message || 'Email ou CPF já cadastrado.')
        setShowDuplicateErrorModal(true)

        trackEvent('duplicate_error', {
          error_message: error.message || 'Email ou CPF já cadastrado'
        });
      } else {
        setErrors(prev => ({
          ...prev,
          submit: error.message || 'Erro ao enviar inscrição. Tente novamente.'
        }))
      }

      console.error('Erro ao enviar inscrição:', error)
    }
  }

  return (
    <>
      <ConfettiEffect trigger={showConfetti} onComplete={() => setShowConfetti(false)} />

      {/* Mensagem de Sucesso com Backdrop */}
      {showSuccessMessage && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 animate-fadeIn overflow-hidden"
          style={{
            animationDelay: '0.3s',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowSuccessMessage(false)
            }
          }}
        >
          <div className="bg-gradient-to-br from-gray-900/95 via-gray-800/90 to-gray-900/95 backdrop-blur-md rounded-2xl p-6 sm:p-8 border border-gray-700/50 shadow-2xl max-w-md mx-4 transform transition-all duration-500 relative z-[10000]">
            {/* Botão de Fechar */}
            <button
              onClick={() => {
                setShowSuccessMessage(false)
              }}
              className="absolute top-4 right-4 p-2 hover:bg-gray-700/50 rounded-lg transition-colors duration-200 group"
              aria-label="Fechar mensagem"
            >
              <X className="w-5 h-5 text-gray-400 group-hover:text-white transition-colors" />
            </button>

            <div className="flex flex-col items-center text-center space-y-4">
              <div className="w-24 h-24 flex items-center justify-center">
                <Image
                  src="/logo_innovatis_oficial.svg"
                  alt="Logo Innovatis"
                  width={96}
                  height={96}
                  className="w-full h-full object-contain"
                  priority
                />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl sm:text-2xl font-bold text-white">
                  Inscrição Enviada!
                </h3>
                <p className="text-gray-300 text-sm sm:text-base font-normal leading-relaxed">
                  Seus dados estão em análise pela nossa equipe. Em breve, entraremos em contato.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      <section id="formulario" className="relative py-24 px-4 scroll-mt-24">
        <div className="max-w-4xl mx-auto">
          {/* Título da Seção */}
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold mb-6 tracking-tight">
              Faça a sua <span className="text-[#22AE84]">Inscrição</span> agora!
            </h2>
            <p className="text-lg text-slate-300 max-w-2xl mx-auto font-medium leading-relaxed">
              Preencha o formulário abaixo e torne-se membro da comunidade{' '}
              <span className="text-[#22AE84]">InnovaNation</span>
            </p>
            <div className="mt-8 flex justify-center">
              <div className="h-1.5 w-20 bg-[#22AE84] rounded-full opacity-20"></div>
            </div>
          </div>

          {/* Formulário */}
          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="bg-slate-900/40 backdrop-blur-xl rounded-[2.5rem] p-8 sm:p-12 border border-slate-800 shadow-2xl">
              <div className="hidden" aria-hidden="true">
                <label htmlFor="website">Website</label>
                <input
                  type="text"
                  id="website"
                  name="website"
                  value={formData.website}
                  onChange={handleInputChange}
                  tabIndex={-1}
                  autoComplete="off"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                {/* Campo Nome Completo */}
                <div className="md:col-span-2">
                  <label htmlFor="nomeCompleto" className="block text-sm font-bold text-slate-100 mb-3 ml-1">
                    <User className="inline w-4 h-4 mr-2 text-[#22AE84]" />
                    Nome Completo
                  </label>
                  <input
                    type="text"
                    id="nomeCompleto"
                    name="nomeCompleto"
                    value={formData.nomeCompleto}
                    onChange={handleInputChange}
                    maxLength={120}
                    className={`w-full px-6 py-4 bg-slate-900/60 border rounded-2xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 transition-all font-medium ${errors.nomeCompleto
                      ? 'border-red-500 focus:ring-red-500/30'
                      : 'border-slate-700/50 focus:ring-[#22AE84]/30 focus:border-[#22AE84]'
                      }`}
                    placeholder="Digite seu nome completo"
                  />
                  {errors.nomeCompleto && (
                    <p className="mt-2 ml-1 text-xs font-bold text-red-400">{errors.nomeCompleto}</p>
                  )}
                </div>

                {/* Campo Profissão */}
                <div className="col-span-1">
                  <label htmlFor="profissao" className="block text-sm font-bold text-slate-100 mb-3 ml-1">
                    <Briefcase className="inline w-4 h-4 mr-2 text-[#22AE84]" />
                    Profissão
                  </label>
                  <input
                    type="text"
                    id="profissao"
                    name="profissao"
                    value={formData.profissao}
                    onChange={handleInputChange}
                    className={`w-full px-6 py-4 bg-slate-900/60 border rounded-2xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 transition-all font-medium ${errors.profissao
                      ? 'border-red-500 focus:ring-red-500/30'
                      : 'border-slate-700/50 focus:ring-[#22AE84]/30 focus:border-[#22AE84]'
                      }`}
                    placeholder="Digite sua profissão"
                  />
                  {errors.profissao && (
                    <p className="mt-2 ml-1 text-xs font-bold text-red-400">{errors.profissao}</p>
                  )}
                </div>

                {/* Campo Empresa ou Instituição */}
                <div className="col-span-1">
                  <label htmlFor="empresa" className="block text-sm font-bold text-slate-100 mb-3 ml-1">
                    <Building2 className="inline w-4 h-4 mr-2 text-[#22AE84]" />
                    Empresa ou Instituição
                  </label>
                  <input
                    type="text"
                    id="empresa"
                    name="empresa"
                    value={formData.empresa}
                    onChange={handleInputChange}
                    maxLength={150}
                    className={`w-full px-6 py-4 bg-slate-900/60 border rounded-2xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 transition-all font-medium ${errors.empresa
                      ? 'border-red-500 focus:ring-red-500/30'
                      : 'border-slate-700/50 focus:ring-[#22AE84]/30 focus:border-[#22AE84]'
                      }`}
                    placeholder="Nome da empresa / instituição"
                  />
                  {errors.empresa && (
                    <p className="mt-2 ml-1 text-xs font-bold text-red-400">{errors.empresa}</p>
                  )}
                </div>

                {/* Campo CPF */}
                <div className="col-span-1">
                  <label htmlFor="cpf" className="block text-sm font-bold text-slate-100 mb-3 ml-1">
                    <CreditCard className="inline w-4 h-4 mr-2 text-[#22AE84]" />
                    CPF
                  </label>
                  <input
                    type="text"
                    id="cpf"
                    name="cpf"
                    value={formData.cpf}
                    onChange={(e) => {
                      const formatted = formatCPF(e.target.value)
                      setFormData(prev => ({ ...prev, cpf: formatted }))

                      const cpfNumbers = formatted.replace(/\D/g, '')
                      if (cpfNumbers.length === 11) {
                        if (!isValidCPF(formatted)) {
                          setErrors(prev => ({
                            ...prev,
                            cpf: 'CPF inválido. Verifique os dígitos.'
                          }))
                        } else {
                          setErrors(prev => {
                            const newErrors = { ...prev }
                            delete newErrors.cpf
                            return newErrors
                          })
                        }
                      } else if (errors.cpf) {
                        setErrors(prev => {
                          const newErrors = { ...prev }
                          delete newErrors.cpf
                          return newErrors
                        })
                      }
                    }}
                    maxLength={14}
                    className={`w-full px-6 py-4 bg-slate-900/60 border rounded-2xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 transition-all font-medium ${errors.cpf
                      ? 'border-red-500 focus:ring-red-500/30'
                      : 'border-slate-700/50 focus:ring-[#22AE84]/30 focus:border-[#22AE84]'
                      }`}
                    placeholder="000.000.000-00"
                  />
                  {errors.cpf && (
                    <p className="mt-2 ml-1 text-xs font-bold text-red-400">{errors.cpf}</p>
                  )}
                </div>

                {/* Campo Telefone */}
                <div className="col-span-1">
                  <label htmlFor="telefone" className="block text-sm font-bold text-slate-100 mb-3 ml-1">
                    <Phone className="inline w-4 h-4 mr-2 text-[#22AE84]" />
                    Celular
                  </label>
                  <input
                    type="text"
                    id="telefone"
                    name="telefone"
                    value={formData.telefone}
                    onChange={(e) => {
                      const formatted = formatPhone(e.target.value)
                      setFormData(prev => ({ ...prev, telefone: formatted }))
                      if (errors.telefone) {
                        setErrors(prev => {
                          const newErrors = { ...prev }
                          delete newErrors.telefone
                          return newErrors
                        })
                      }
                    }}
                    maxLength={15}
                    className={`w-full px-6 py-4 bg-slate-900/60 border rounded-2xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 transition-all font-medium ${errors.telefone
                      ? 'border-red-500 focus:ring-red-500/30'
                      : 'border-slate-700/50 focus:ring-[#22AE84]/30 focus:border-[#22AE84]'
                      }`}
                    placeholder="(00) 00000-0000"
                  />
                  {errors.telefone && (
                    <p className="mt-2 ml-1 text-xs font-bold text-red-400">{errors.telefone}</p>
                  )}
                </div>

                {/* Campo E-mail */}
                <div className="md:col-span-2">
                  <label htmlFor="email" className="block text-sm font-bold text-slate-100 mb-3 ml-1">
                    <Mail className="inline w-4 h-4 mr-2 text-[#22AE84]" />
                    E-mail
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className={`w-full px-6 py-4 bg-slate-900/60 border rounded-2xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 transition-all font-medium ${errors.email
                      ? 'border-red-500 focus:ring-red-500/30'
                      : 'border-slate-700/50 focus:ring-[#22AE84]/30 focus:border-[#22AE84]'
                      }`}
                    placeholder="exemplo@email.com"
                  />
                  {errors.email && (
                    <p className="mt-2 ml-1 text-xs font-bold text-red-400">{errors.email}</p>
                  )}
                </div>
              </div>

              {/* Endereço Title */}
              <div className="mt-10 mb-6 flex items-center gap-4">
                <div className="h-px flex-1 bg-slate-800"></div>
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-[#22AE84]" />
                  Endereço
                </h3>
                <div className="h-px flex-1 bg-slate-800"></div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <div>
                  <label htmlFor="cep" className="block text-xs font-bold text-slate-400 mb-2 ml-1 uppercase">
                    CEP
                  </label>
                  <input
                    type="text"
                    id="cep"
                    name="cep"
                    value={formData.cep}
                    onChange={handleCepChange}
                    maxLength={9}
                    autoComplete="postal-code"
                    className={`w-full px-5 py-4 bg-slate-900/60 border rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 transition-all font-medium ${errors.cep
                      ? 'border-red-500 focus:ring-red-500/30'
                      : 'border-slate-700/30 focus:ring-[#22AE84]/30 focus:border-[#22AE84]'
                      }`}
                    placeholder="00000-000"
                  />
                  {errors.cep && (
                    <p className="mt-2 ml-1 text-xs font-bold text-red-400">{errors.cep}</p>
                  )}
                </div>

                <div className="sm:col-span-2">
                  <label htmlFor="logradouro" className="block text-xs font-bold text-slate-400 mb-2 ml-1 uppercase">
                    Logradouro
                  </label>
                  <input
                    type="text"
                    id="logradouro"
                    name="logradouro"
                    value={formData.logradouro}
                    onChange={handleInputChange}
                    autoComplete="address-line1"
                    className={`w-full px-5 py-4 bg-slate-900/60 border rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 transition-all font-medium ${errors.logradouro
                      ? 'border-red-500 focus:ring-red-500/30'
                      : 'border-slate-700/30 focus:ring-[#22AE84]/30 focus:border-[#22AE84]'
                      }`}
                    placeholder="Rua / Avenida"
                  />
                </div>

                <div>
                  <label htmlFor="numero" className="block text-xs font-bold text-slate-400 mb-2 ml-1 uppercase">
                    Número
                  </label>
                  <input
                    type="text"
                    id="numero"
                    name="numero"
                    value={formData.numero}
                    onChange={handleInputChange}
                    className={`w-full px-5 py-4 bg-slate-900/60 border rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 transition-all font-medium ${errors.numero
                      ? 'border-red-500 focus:ring-red-500/30'
                      : 'border-slate-700/30 focus:ring-[#22AE84]/30 focus:border-[#22AE84]'
                      }`}
                    placeholder="Nº"
                  />
                </div>

                <div>
                  <label htmlFor="bairro" className="block text-xs font-bold text-slate-400 mb-2 ml-1 uppercase">
                    Bairro
                  </label>
                  <input
                    type="text"
                    id="bairro"
                    name="bairro"
                    value={formData.bairro}
                    onChange={handleInputChange}
                    className={`w-full px-5 py-4 bg-slate-900/60 border rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 transition-all font-medium ${errors.bairro
                      ? 'border-red-500 focus:ring-red-500/30'
                      : 'border-slate-700/30 focus:ring-[#22AE84]/30 focus:border-[#22AE84]'
                      }`}
                    placeholder="Bairro"
                  />
                </div>

                <div className="flex gap-4">
                  <div className="flex-1">
                    <label htmlFor="cidade" className="block text-xs font-bold text-slate-400 mb-2 ml-1 uppercase">
                      Cidade
                    </label>
                    <input
                      type="text"
                      id="cidade"
                      name="cidade"
                      value={formData.cidade}
                      onChange={handleInputChange}
                      className="w-full px-5 py-4 bg-slate-900/60 border border-slate-700/30 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#22AE84]/30 focus:border-[#22AE84] transition-all font-medium"
                      placeholder="Cidade"
                    />
                  </div>
                  <div className="w-20">
                    <label htmlFor="estado" className="block text-xs font-bold text-slate-400 mb-2 ml-1 uppercase">
                      UF
                    </label>
                    <input
                      type="text"
                      id="estado"
                      name="estado"
                      value={formData.estado}
                      onChange={handleStateChange}
                      maxLength={2}
                      className="w-full px-5 py-4 bg-slate-900/60 border border-slate-700/30 rounded-xl text-white text-center placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#22AE84]/30 focus:border-[#22AE84] transition-all font-medium"
                      placeholder="UF"
                    />
                  </div>
                </div>
              </div>

              {/* Campo Projetos */}
              <div className="mt-10">
                <label htmlFor="projetos" className="block text-sm font-bold text-slate-100 mb-3 ml-1">
                  <FolderOpen className="inline w-4 h-4 mr-2 text-[#22AE84]" />
                  Nome do(s) seu(s) Projeto(s) <span className="text-slate-500 font-normal text-xs italic ml-1">(opcional)</span>
                </label>
                <textarea
                  id="projetos"
                  name="projetos"
                  value={formData.projetos}
                  onChange={handleInputChange}
                  rows={4}
                  className="w-full px-6 py-4 bg-slate-900/60 border border-slate-700/50 rounded-[1.5rem] text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#22AE84]/30 focus:border-[#22AE84] transition-all resize-none font-medium text-base leading-relaxed"
                  placeholder="Liste os projetos que você lidera ou participa..."
                />
              </div>
            </div>

            {/* Botão e Checkbox de Termos */}
            <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-sm rounded-2xl p-6 sm:p-8 border border-gray-700/50">
              {/* Botão para abrir os termos */}
              <div className="mb-4">
                <button
                  type="button"
                  onClick={handleOpenModal}
                  className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gray-700/50 hover:bg-gray-600/50 border border-gray-600 rounded-lg transition-all duration-300 group hover:scale-[1.02] active:scale-[0.98]"
                >
                  <FileText className="w-5 h-5 text-white group-hover:scale-110 transition-transform" />
                  <span className="text-white font-semibold text-sm sm:text-base">
                    Ler Termo de Adesão, Reciprocidade e Compromisso de Repasse
                  </span>
                  <ChevronRight className="w-5 h-5 text-white group-hover:translate-x-1 transition-transform" />
                </button>
              </div>

              {/* Checkbox de aceitação */}
              <div className="flex items-start gap-3">
                <div className="relative flex items-center">
                  <input
                    type="checkbox"
                    id="termoAdesao"
                    checked={terms.termoAdesao}
                    onChange={handleCheckboxChange}
                    className="w-5 h-5 rounded border-gray-600 bg-gray-800/50 text-[#25D366] focus:ring-2 focus:ring-[#25D366] cursor-pointer"
                  />
                </div>
                <label
                  htmlFor="termoAdesao"
                  className="flex-1 text-sm text-gray-300 font-normal cursor-pointer"
                >
                  Aceito o Termo de Adesão, Reciprocidade e Compromisso de Repasse
                </label>
              </div>
              {errors.termoAdesao && (
                <p className="ml-8 mt-2 text-sm text-red-400">{errors.termoAdesao}</p>
              )}
            </div>

            {/* Modal de Termos */}
            <TermsModal
              isOpen={isModalOpen}
              onClose={handleCloseModal}
              onAccept={handleAcceptTerms}
              isAccepted={terms.termoAdesao}
              termsContent={activeTerms?.content_html || ''}
              isLoading={isLoadingTerms}
            />

            {/* Modal de Erro de Duplicata */}
            {showDuplicateErrorModal && (
              <div
                className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 animate-fadeIn"
                style={{
                  backdropFilter: 'blur(12px)',
                  WebkitBackdropFilter: 'blur(12px)',
                  position: 'fixed',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0
                }}
                onClick={(e) => {
                  if (e.target === e.currentTarget) {
                    setShowDuplicateErrorModal(false)
                  }
                }}
              >
                <div className="bg-gradient-to-br from-red-900/95 via-gray-900/90 to-red-900/95 backdrop-blur-md rounded-2xl p-6 sm:p-8 border border-red-700/50 shadow-2xl max-w-md mx-4 transform transition-all duration-500 relative z-[10000]">
                  {/* Header */}
                  <div className="flex items-center justify-between p-4 border-b border-red-700/50">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-red-500/20 rounded-lg animate-pulse">
                        <AlertCircle className="w-5 h-5 text-red-400" />
                      </div>
                      <h2 className="text-lg font-bold text-white">
                        Inscrição Não Permitida
                      </h2>
                    </div>
                    <button
                      onClick={() => setShowDuplicateErrorModal(false)}
                      className="p-1.5 hover:bg-red-700/50 rounded-lg transition-colors"
                      aria-label="Fechar modal"
                    >
                      <X className="w-4 h-4 text-gray-400 hover:text-white" />
                    </button>
                  </div>

                  {/* Content */}
                  <div className="p-4">
                    <p className="text-red-200 mb-4 text-sm font-normal leading-relaxed">
                      {duplicateErrorMessage}
                    </p>

                    <div className="flex justify-center pt-2">
                      <button
                        onClick={() => setShowDuplicateErrorModal(false)}
                        className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold transition-colors duration-200"
                      >
                        Entendi
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Modal de Campos Pendentes */}
            {showMissingFieldsModal && (
              <div
                className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn"
                onClick={handleCloseMissingFieldsModal}
              >
                <div
                  className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl max-w-md w-full border border-gray-700 shadow-2xl transform transition-all animate-fadeIn"
                  onClick={(e) => e.stopPropagation()}
                  style={{ animationDelay: '0.1s' }}
                >
                  {/* Header */}
                  <div className="flex items-center justify-between p-4 border-b border-gray-700">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-yellow-500/20 rounded-lg animate-pulse">
                        <AlertCircle className="w-5 h-5 text-yellow-400" />
                      </div>
                      <h2 className="text-lg font-bold text-white">
                        Campos Pendentes
                      </h2>
                    </div>
                    <button
                      onClick={handleCloseMissingFieldsModal}
                      className="p-1.5 hover:bg-gray-700 rounded-lg transition-colors"
                      aria-label="Fechar modal"
                    >
                      <X className="w-4 h-4 text-gray-400 hover:text-white" />
                    </button>
                  </div>

                  {/* Content */}
                  <div className="p-4 max-h-[50vh] overflow-y-auto">
                    <p className="text-gray-300 mb-3 text-sm font-normal leading-relaxed">
                      Antes de finalizar sua inscrição, é necessário completar os seguintes campos:
                    </p>

                    <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700/50">
                      <ul className="space-y-2">
                        {missingFieldsList.map((field, index) => (
                          <li
                            key={index}
                            className="flex items-start gap-2 animate-fadeIn"
                            style={{ animationDelay: `${index * 0.05}s` }}
                          >
                            <div className="mt-1 flex-shrink-0">
                              <div className="w-1.5 h-1.5 bg-[#25D366] rounded-full"></div>
                            </div>
                            <span className="text-gray-200 text-sm font-normal leading-relaxed">{field}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="flex justify-end p-4 border-t border-gray-700">
                    <button
                      onClick={handleCloseMissingFieldsModal}
                      className="px-6 py-2 bg-[#25D366] hover:bg-[#20BA5A] text-white rounded-lg transition-all duration-300 font-semibold text-sm transform hover:scale-105 active:scale-95 shadow-lg shadow-[#25D366]/30"
                    >
                      Entendi, vou completar
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Submit Button Section */}
            <div className="flex flex-col items-center gap-6 pt-6">
              <button
                type="button"
                onClick={handleAttemptSubmit}
                disabled={isSubmitting}
                className={`
                  w-full sm:w-auto
                  px-12 py-5 rounded-full
                  font-extrabold text-lg uppercase tracking-wider
                  transition-all duration-500
                  ${isSubmitting
                    ? 'bg-slate-700 text-slate-400 cursor-wait'
                    : isFormValid()
                      ? 'bg-[#22AE84] hover:bg-[#1C8C6A] text-white shadow-2xl shadow-[#22AE84]/20 hover:shadow-[#22AE84]/40 transform hover:scale-105 active:scale-95'
                      : 'bg-slate-800 text-slate-500 border border-slate-700/50'
                  }
                  flex items-center justify-center gap-3
                `}
              >
                {isSubmitting ? (
                  <>
                    <div className="w-5 h-5 border-3 border-white/30 border-t-white rounded-full animate-spin"></div>
                    <span>Processando</span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-6 h-6" />
                    <span>Finalizar Inscrição</span>
                  </>
                )}
              </button>

              <p className="text-slate-500 text-xs font-medium uppercase tracking-widest text-center">
                Sua segurança é nossa prioridade. Seus dados estão protegidos.
              </p>
            </div>
          </form>
        </div>
      </section>
    </>
  )
}
