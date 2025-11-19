'use client'

import { useState, useEffect } from 'react'
import { User, CreditCard, Phone, Mail, MapPin, CheckCircle, Briefcase, FolderOpen, Building2, FileText, ChevronRight, X, AlertCircle } from 'lucide-react'
import IdentityUploadSection from './IdentityUploadSection'
import TermsModal from './TermsModal'
import ConfettiEffect from './ConfettiEffect'

export default function RegistrationFormSection() {
  const [formData, setFormData] = useState({
    nomeCompleto: '',
    profissao: '',
    empresa: '',
    cpf: '',
    telefone: '',
    email: '',
    endereco: '',
    projetos: ''
  })

  const [terms, setTerms] = useState({
    termoAdesao: false
  })

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [hasOpenedModal, setHasOpenedModal] = useState(false) // Novo estado para rastrear se o modal foi aberto
  const [hasIdentityDocument, setHasIdentityDocument] = useState(false) // Estado para rastrear se documento foi enviado
  const [showMissingFieldsModal, setShowMissingFieldsModal] = useState(false) // Estado para controlar modal de campos pendentes
  const [missingFieldsList, setMissingFieldsList] = useState<string[]>([]) // Lista de campos pendentes
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showConfetti, setShowConfetti] = useState(false)
  const [hasShownConfetti, setHasShownConfetti] = useState(false)

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
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
    setHasOpenedModal(true) // Marca que o modal foi aberto
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

  const handleCheckboxClick = (e: React.MouseEvent) => {
    // Se o modal ainda não foi aberto, abre o modal ao invés de marcar o checkbox
    if (!hasOpenedModal) {
      e.preventDefault()
      handleOpenModal()
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

  // Função para verificar se o formulário está válido (sem mostrar erros)
  const isFormValid = () => {
    const nomeValido = formData.nomeCompleto.trim() !== '' && formData.nomeCompleto.length <= 120
    const profissaoValida = formData.profissao.trim() !== ''
    const empresaValida = formData.empresa.trim() !== '' && formData.empresa.length <= 150
    const cpfValido = isValidCPF(formData.cpf) // Validação completa com cálculo dos dígitos verificadores
    const telefoneValido = formData.telefone.replace(/\D/g, '').length >= 10
    const emailValido = formData.email.trim() !== '' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)
    const enderecoValido = formData.endereco.trim() !== '' && formData.endereco.length <= 200
    const termosValidos = terms.termoAdesao

    return nomeValido && profissaoValida && empresaValida && cpfValido && telefoneValido && emailValido && enderecoValido && termosValidos && hasIdentityDocument
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

    if (!formData.endereco.trim()) {
      newErrors.endereco = 'Endereço é obrigatório'
    } else if (formData.endereco.length > 200) {
      newErrors.endereco = 'Endereço deve ter no máximo 200 caracteres'
    }

    if (!terms.termoAdesao) {
      newErrors.termoAdesao = 'Você deve aceitar o Termo de Adesão, Reciprocidade e Compromisso de Repasse'
    }

    setErrors(newErrors)
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
    if (!formData.endereco.trim()) {
      missing.push('Endereço')
    } else if (formData.endereco.length > 200) {
      missing.push('Endereço (máximo 200 caracteres)')
    }

    // Documento de identidade
    if (!hasIdentityDocument) {
      missing.push('Envio do documento de identidade')
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

    // Se estiver enviando, não fazer nada
    if (isSubmitting) {
      return
    }

    // Verifica se o formulário está válido
    if (isFormValid() && hasIdentityDocument) {
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

    setIsSubmitting(true)

    // Aqui você pode integrar com sua API ou enviar para WhatsApp
    // Por enquanto, apenas simula o envio
    setTimeout(() => {
      setIsSubmitting(false)
      
      // Ativa o efeito de confete apenas uma vez
      if (!hasShownConfetti) {
        setShowConfetti(true)
        setHasShownConfetti(true)
      }
      
      // Mostra o alerta após um pequeno delay para o confete aparecer
      setTimeout(() => {
        alert('Formulário enviado com sucesso! Em breve entraremos em contato.')
        // Reset form
        setFormData({
          nomeCompleto: '',
          profissao: '',
          empresa: '',
          cpf: '',
          telefone: '',
          email: '',
          endereco: '',
          projetos: ''
        })
        setTerms({
          termoAdesao: false
        })
        setHasOpenedModal(false)
        setHasIdentityDocument(false)
        // Reset do estado do confete após resetar o formulário
        setShowConfetti(false)
        setHasShownConfetti(false)
      }, 500)
    }, 1500)
  }

  return (
    <>
      <ConfettiEffect trigger={showConfetti} onComplete={() => setShowConfetti(false)} />
      <section className="relative py-8 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Título da Seção */}
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4">
            Faça a sua <span className="text-[#22AE84] font-bold">Inscrição</span> agora!
          </h2>
          <p className="text-lg text-gray-300 max-w-2xl mx-auto font-normal">
            Preencha o formulário abaixo e torne-se membro da comunidade{' '}
            <span className="text-[#22AE84] font-medium">InnovaNation</span>
          </p>
        </div>

        {/* Formulário */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-sm rounded-2xl p-6 sm:p-8 border border-gray-700/50">
            {/* Campo Nome Completo */}
            <div className="mb-6">
              <label htmlFor="nomeCompleto" className="block text-sm font-semibold text-white mb-2">
                <User className="inline w-4 h-4 mr-2" />
                Nome Completo
              </label>
              <input
                type="text"
                id="nomeCompleto"
                name="nomeCompleto"
                value={formData.nomeCompleto}
                onChange={handleInputChange}
                maxLength={120}
                className={`w-full px-4 py-3 bg-gray-800/50 border rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 transition-all font-normal ${
                  errors.nomeCompleto 
                    ? 'border-red-500 focus:ring-red-500' 
                    : 'border-gray-600 focus:ring-[#25D366] focus:border-[#25D366]'
                }`}
                placeholder="Digite seu nome completo"
              />
              {errors.nomeCompleto && (
                <p className="mt-1 text-sm text-red-400">{errors.nomeCompleto}</p>
              )}
            </div>

            {/* Campo Profissão */}
            <div className="mb-6">
              <label htmlFor="profissao" className="block text-sm font-semibold text-white mb-2">
                <Briefcase className="inline w-4 h-4 mr-2" />
                Profissão
              </label>
              <input
                type="text"
                id="profissao"
                name="profissao"
                value={formData.profissao}
                onChange={handleInputChange}
                className={`w-full px-4 py-3 bg-gray-800/50 border rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 transition-all font-normal ${
                  errors.profissao 
                    ? 'border-red-500 focus:ring-red-500' 
                    : 'border-gray-600 focus:ring-[#25D366] focus:border-[#25D366]'
                }`}
                placeholder="Digite sua profissão"
              />
              {errors.profissao && (
                <p className="mt-1 text-sm text-red-400">{errors.profissao}</p>
              )}
            </div>

            {/* Campo Empresa ou Instituição */}
            <div className="mb-6">
              <label htmlFor="empresa" className="block text-sm font-semibold text-white mb-2">
                <Building2 className="inline w-4 h-4 mr-2" />
                Empresa ou Instituição que Trabalha
              </label>
              <input
                type="text"
                id="empresa"
                name="empresa"
                value={formData.empresa}
                onChange={handleInputChange}
                maxLength={150}
                className={`w-full px-4 py-3 bg-gray-800/50 border rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 transition-all font-normal ${
                  errors.empresa 
                    ? 'border-red-500 focus:ring-red-500' 
                    : 'border-gray-600 focus:ring-[#25D366] focus:border-[#25D366]'
                }`}
                placeholder="Digite o nome da empresa ou instituição"
              />
              {errors.empresa && (
                <p className="mt-1 text-sm text-red-400">{errors.empresa}</p>
              )}
            </div>

            {/* Campo CPF */}
            <div className="mb-6">
              <label htmlFor="cpf" className="block text-sm font-semibold text-white mb-2">
                <CreditCard className="inline w-4 h-4 mr-2" />
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
                  
                  // Validação em tempo real
                  const cpfNumbers = formatted.replace(/\D/g, '')
                  if (cpfNumbers.length === 11) {
                    if (!isValidCPF(formatted)) {
                      setErrors(prev => ({
                        ...prev,
                        cpf: 'CPF inválido. Verifique os dígitos informados.'
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
                className={`w-full px-4 py-3 bg-gray-800/50 border rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 transition-all font-normal ${
                  errors.cpf 
                    ? 'border-red-500 focus:ring-red-500' 
                    : 'border-gray-600 focus:ring-[#25D366] focus:border-[#25D366]'
                }`}
                placeholder="000.000.000-00"
              />
              {errors.cpf && (
                <p className="mt-1 text-sm text-red-400">{errors.cpf}</p>
              )}
            </div>

            {/* Campo Telefone */}
            <div className="mb-6">
              <label htmlFor="telefone" className="block text-sm font-semibold text-white mb-2">
                <Phone className="inline w-4 h-4 mr-2" />
                Número de Celular
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
                className={`w-full px-4 py-3 bg-gray-800/50 border rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 transition-all font-normal ${
                  errors.telefone 
                    ? 'border-red-500 focus:ring-red-500' 
                    : 'border-gray-600 focus:ring-[#25D366] focus:border-[#25D366]'
                }`}
                placeholder="(00) 00000-0000"
              />
              {errors.telefone && (
                <p className="mt-1 text-sm text-red-400">{errors.telefone}</p>
              )}
            </div>

            {/* Campo E-mail */}
            <div className="mb-6">
              <label htmlFor="email" className="block text-sm font-semibold text-white mb-2">
                <Mail className="inline w-4 h-4 mr-2" />
                E-mail
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                className={`w-full px-4 py-3 bg-gray-800/50 border rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 transition-all font-normal ${
                  errors.email 
                    ? 'border-red-500 focus:ring-red-500' 
                    : 'border-gray-600 focus:ring-[#25D366] focus:border-[#25D366]'
                }`}
                placeholder="seu.email@exemplo.com"
              />
              {errors.email && (
                <p className="mt-1 text-sm text-red-400">{errors.email}</p>
              )}
            </div>

            {/* Campo Endereço */}
            <div className="mb-6">
              <label htmlFor="endereco" className="block text-sm font-semibold text-white mb-2">
                <MapPin className="inline w-4 h-4 mr-2" />
                Endereço
              </label>
              <textarea
                id="endereco"
                name="endereco"
                value={formData.endereco}
                onChange={handleInputChange}
                rows={3}
                maxLength={200}
                className={`w-full px-4 py-3 bg-gray-800/50 border rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 transition-all resize-none font-normal ${
                  errors.endereco 
                    ? 'border-red-500 focus:ring-red-500' 
                    : 'border-gray-600 focus:ring-[#25D366] focus:border-[#25D366]'
                }`}
                placeholder="Digite seu endereço completo (rua, número, bairro, cidade, estado)"
              />
              {errors.endereco && (
                <p className="mt-1 text-sm text-red-400">{errors.endereco}</p>
              )}
            </div>

            {/* Campo Projetos (Opcional) */}
            <div className="mb-6">
              <label htmlFor="projetos" className="block text-sm font-semibold text-white mb-2">
                <FolderOpen className="inline w-4 h-4 mr-2" />
                Nome(s) do(s) Seu(s) Projeto(s) <span className="text-gray-500 font-normal text-xs">(opcional)</span>
              </label>
              <textarea
                id="projetos"
                name="projetos"
                value={formData.projetos}
                onChange={handleInputChange}
                rows={3}
                className="w-full px-4 py-3 bg-gray-800/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#25D366] focus:border-[#25D366] transition-all resize-none font-normal"
                placeholder="Digite o nome dos projetos que você possui (separe por vírgula se houver mais de um)"
              />
            </div>
          </div>

          {/* Seção de Upload de Identidade */}
          <IdentityUploadSection onFilesChange={setHasIdentityDocument} />

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
                  onClick={handleCheckboxClick}
                  disabled={!hasOpenedModal}
                  className={`w-5 h-5 rounded border-gray-600 bg-gray-800/50 text-[#25D366] focus:ring-2 focus:ring-[#25D366] ${
                    hasOpenedModal 
                      ? 'cursor-pointer' 
                      : 'cursor-not-allowed opacity-50'
                  }`}
                />
              </div>
              <label 
                htmlFor="termoAdesao" 
                className={`flex-1 text-sm text-gray-300 font-normal ${
                  hasOpenedModal ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'
                }`}
              >
                {hasOpenedModal 
                  ? 'Aceito o Termo de Adesão, Reciprocidade e Compromisso de Repasse'
                  : 'Você precisa ler os termos antes de aceitar'
                }
              </label>
            </div>
            {errors.termoAdesao && (
              <p className="ml-8 mt-2 text-sm text-red-400">{errors.termoAdesao}</p>
            )}
            {!hasOpenedModal && (
              <p className="mt-2 text-xs text-gray-400 italic">
                Clique no botão acima para ler os termos completos
              </p>
            )}
          </div>

          {/* Modal de Termos */}
          <TermsModal
            isOpen={isModalOpen}
            onClose={handleCloseModal}
            onAccept={handleAcceptTerms}
            isAccepted={terms.termoAdesao}
          />

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

          {/* Botão de Submit */}
          <div className="flex justify-center pt-4">
            <button
              type="button"
              onClick={handleAttemptSubmit}
              className={`
                w-full sm:w-auto
                px-8 py-4 rounded-full
                font-semibold text-lg
                transition-all duration-300
                ${isSubmitting 
                  ? 'bg-gray-600 text-gray-300 cursor-wait transform-none hover:scale-100' 
                  : isFormValid() && hasIdentityDocument
                    ? 'bg-[#25D366] hover:bg-[#20BA5A] text-white shadow-xl shadow-[#25D366]/30 transform hover:scale-105 active:scale-95 cursor-pointer'
                    : 'bg-gray-600 text-gray-400 cursor-not-allowed transform-none hover:scale-100'
                }
                flex items-center justify-center gap-2
              `}
            >
              {isSubmitting ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Enviando...
                </>
              ) : (
                <>
                  <CheckCircle className="w-5 h-5" />
                  Finalizar Inscrição
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </section>
    </>
  )
}

