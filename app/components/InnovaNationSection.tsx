'use client'

import { Users, FileText, HandCoins, Handshake, Sparkles, ArrowRight } from 'lucide-react'

export default function InnovaNationSection() {
  const benefits = [
    {
      icon: FileText,
      title: 'Editais qualificados para quem executa projetos',
      description: 'Curadoria contínua de editais nacionais e internacionais, com foco em viabilidade, elegibilidade e execução real.',
      color: '#5EBFED', // Azul - confiança e institucionalidade
      gradient: 'from-blue-500 to-blue-600',
      titleColor: '#5EBFED' // Azul mais claro para o título
    },
    {
      icon: HandCoins,
      title: 'Estruturação e captação de recursos',
      description: 'Acesso a método, leitura estratégica de editais e apoio na estruturação de propostas mais competitivas e aderentes às exigências institucionais.',
      color: '#22AE84', // Verde - dinheiro e crescimento
      gradient: 'from-green-500 to-green-600',
      titleColor: '#22AE84' // Verde mais claro para o título
    },
    {
      icon: Handshake,
      title: 'Conexões institucionais para viabilizar projetos',
      description: 'Aproximação entre academia, governo, mercado e startups para construir projetos mais robustos, articulados e com maior potencial de aprovação.',
      color: '#8B5CF6', // Roxo - sofisticação e estratégia
      gradient: 'from-purple-500 to-purple-600',
      titleColor: '#A78BFA' // Roxo mais claro para o título
    },
    {
      icon: Users,
      title: 'Rede qualificada de quem já atua em projetos',
      description: 'Troca direta com pesquisadores, professores, extensionistas e startups que já lidam com captação, execução e gestão de projetos. ',
      color: '#EA5B0C', // Amarelo - energia e conexões
      gradient: 'from-yellow-400 to-yellow-500',
      titleColor: '#EA5B0C' // Amarelo mais claro para o título
    }
  ]

  return (
    <section className="relative py-24 px-4 bg-[#F8FAFC]">
      <div className="max-w-6xl mx-auto">
        {/* Título da Seção */}
        <div className="text-center mb-20">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold mb-6 text-slate-900 tracking-tight">
            O que você acessa dentro da <span className="text-[#22AE84]">InnovaNation</span>
          </h2>
          <p className="text-lg sm:text-xl text-slate-600 max-w-3xl mx-auto leading-relaxed font-medium">
            Tudo o que você precisa para reduzir erros, aumentar competitividade e viabilizar projetos com mais segurança!
          </p>
          <div className="mt-8 flex justify-center">
            <div className="h-1.5 w-20 bg-[#22AE84] rounded-full opacity-20"></div>
          </div>
        </div>

        {/* Cards de Benefícios */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 mb-4">
          {benefits.map((benefit, index) => {
            const Icon = benefit.icon
            return (
              <div
                key={index}
                className="group relative bg-white rounded-3xl p-8 border border-slate-100 card-white-hover shadow-premium"
                style={{
                  animation: 'fadeIn 0.6s ease-out forwards',
                  animationDelay: `${0.1 * index}s`,
                  opacity: 0
                }}
              >
                {/* Ícone */}
                <div
                  className="inline-flex p-4 rounded-2xl mb-6 group-hover:scale-110 transition-transform duration-500 shadow-md group-hover:shadow-lg"
                  style={{ backgroundColor: benefit.color }}
                >
                  <Icon className="w-6 h-6 text-white" />
                </div>

                {/* Título */}
                <h3
                  className="text-xl font-bold mb-4 text-slate-900 leading-tight"
                >
                  {benefit.title}
                </h3>

                {/* Descrição */}
                <p className="text-slate-600 leading-relaxed font-normal text-sm sm:text-base">
                  {benefit.description}
                </p>

                {/* Decorative element */}
                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                  <Icon className="w-12 h-12" />
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
