'use client'

import { useState } from 'react'
import { User, CreditCard, Phone, Mail, MapPin, CheckCircle, Briefcase, FolderOpen, Building2, FileText, ChevronRight } from 'lucide-react'
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
    const nomeValido = formData.nomeCompleto.trim() !== ''
    const profissaoValida = formData.profissao.trim() !== ''
    const cpfValido = isValidCPF(formData.cpf) // Validação completa com cálculo dos dígitos verificadores
    const telefoneValido = formData.telefone.replace(/\D/g, '').length >= 10
    const emailValido = formData.email.trim() !== '' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)
    const enderecoValido = formData.endereco.trim() !== ''
    const termosValidos = terms.termoAdesao

    return nomeValido && profissaoValida && cpfValido && telefoneValido && emailValido && enderecoValido && termosValidos
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.nomeCompleto.trim()) {
      newErrors.nomeCompleto = 'Nome completo é obrigatório'
    }

    if (!formData.profissao.trim()) {
      newErrors.profissao = 'Profissão é obrigatória'
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
    }

    if (!terms.termoAdesao) {
      newErrors.termoAdesao = 'Você deve aceitar o Termo de Adesão, Reciprocidade e Compromisso de Repasse'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
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
        // Reset do estado do confete após resetar o formulário
        setShowConfetti(false)
        setHasShownConfetti(false)
      }, 500)
    }, 1500)
  }

  return (
    <>
      <ConfettiEffect trigger={showConfetti} onComplete={() => setShowConfetti(false)} />
      <section className="relative py-16 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Título da Seção */}
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4">
            Faça a sua <span className="text-[#25D366] font-bold">Inscrição</span> agora!
          </h2>
          <p className="text-lg text-gray-300 max-w-2xl mx-auto font-normal">
            Preencha o formulário abaixo e torne-se membro da comunidade{' '}
            <span className="text-[#25D366] font-medium">InnovaNation</span>
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
                className="w-full px-4 py-3 bg-gray-800/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#25D366] focus:border-[#25D366] transition-all font-normal"
                placeholder="Digite o nome da empresa ou instituição"
              />
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
          <IdentityUploadSection />

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

          {/* Botão de Submit */}
          <div className="flex justify-center pt-4">
            <button
              type="submit"
              disabled={isSubmitting || !isFormValid()}
              className={`
                w-full sm:w-auto
                px-8 py-4 rounded-full
                font-semibold text-lg
                transition-all duration-300
                transform hover:scale-105 active:scale-95
                disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:hover:scale-100
                ${isSubmitting 
                  ? 'bg-gray-600 text-gray-300' 
                  : isFormValid()
                    ? 'bg-[#25D366] hover:bg-[#20BA5A] text-white shadow-xl shadow-[#25D366]/30'
                    : 'bg-gray-600 text-gray-400 cursor-not-allowed'
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

