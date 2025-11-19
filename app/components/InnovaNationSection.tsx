'use client'

import { Users, FileText, HandCoins, Handshake, Sparkles, ArrowRight } from 'lucide-react'

export default function InnovaNationSection() {
  const benefits = [
    {
      icon: FileText,
      title: 'Editais de Fomento',
      description: 'Acesso exclusivo a editais de financiamento',
      color: '#2563EB', // Azul - confiança e institucionalidade
      gradient: 'from-blue-500 to-blue-600',
      titleColor: '#60A5FA' // Azul mais claro para o título
    },
    {
      icon: HandCoins,
      title: 'Captação de Recursos',
      description: 'Oportunidades personalizadas para captação de recursos e investimentos',
      color: '#22C55E', // Verde - dinheiro e crescimento
      gradient: 'from-green-500 to-green-600',
      titleColor: '#4ADE80' // Verde mais claro para o título
    },
    {
      icon: Handshake,
      title: 'Parcerias Estratégicas',
      description: 'Conexões com instituições parceiras para desenvolvimento de projetos',
      color: '#8B5CF6', // Roxo - sofisticação e estratégia
      gradient: 'from-purple-500 to-purple-600',
      titleColor: '#A78BFA' // Roxo mais claro para o título
    },
    {
      icon: Users,
      title: 'Networking',
      description: 'Rede de contatos qualificados em diversos setores e áreas de atuação',
      color: '#FACC15', // Amarelo - energia e conexões
      gradient: 'from-yellow-400 to-yellow-500',
      titleColor: '#FDE047' // Amarelo mais claro para o título
    }
  ]

  return (
    <section className="relative py-16 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Título da Seção */}
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4">
            Nossa comunidade a <span className="text-[#25D366] font-bold">InnovaNation</span>
          </h2>
          <p className="text-lg sm:text-xl text-gray-300 max-w-3xl mx-auto leading-relaxed font-normal">
            Uma comunidade exclusiva onde membros têm acesso a oportunidades únicas de crescimento e desenvolvimento
          </p>
        </div>

        {/* Cards de Benefícios */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-12">
          {benefits.map((benefit, index) => {
            const Icon = benefit.icon
            return (
              <div
                key={index}
                className="group relative bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-700/50 hover:border-gray-600 transition-all duration-300 hover:transform hover:scale-105"
                style={{
                  animation: 'fadeIn 0.6s ease-out forwards',
                  animationDelay: `${0.2 * index}s`,
                  opacity: 0
                }}
              >
                {/* Ícone */}
                <div 
                  className="inline-flex p-3 rounded-xl mb-4 group-hover:scale-110 transition-transform duration-300 shadow-lg"
                  style={{ backgroundColor: benefit.color }}
                >
                  <Icon className="w-6 h-6 text-white" />
                </div>

                {/* Título */}
                <h3 
                  className="text-xl font-semibold mb-2"
                  style={{ color: benefit.titleColor }}
                >
                  {benefit.title}
                </h3>

                {/* Descrição */}
                <p className="text-gray-400 leading-relaxed font-normal">
                  {benefit.description}
                </p>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
