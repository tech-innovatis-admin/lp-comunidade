'use client'

import { Target, Lightbulb, Layers, TrendingUp } from 'lucide-react'

const features = [
  {
    icon: Target,
    title: 'Comprometimento Total',
    description: 'Dedicação completa aos objetivos dos nossos clientes, garantindo que cada projeto seja executado com excelência e foco nos resultados esperados',
    color: 'from-blue-400 to-blue-600'
  },
  {
    icon: Lightbulb,
    title: 'Inovação Estratégica',
    description: 'Buscamos constantemente novas abordagens e soluções criativas para transformar complexidade em oportunidades de crescimento sustentável',
    color: 'from-yellow-400 to-orange-500'
  },
  {
    icon: Layers,
    title: 'Simplicidade na Execução',
    description: 'Traduzimos projetos complexos em soluções acessíveis e práticas, facilitando a gestão e implementação de iniciativas estratégicas',
    color: 'from-green-400 to-green-600'
  },
  {
    icon: TrendingUp,
    title: 'Resultados Tangíveis',
    description: 'Foco em gerar impacto real e mensurável nas áreas de educação, tecnologia, social e ambiental, promovendo transformação efetiva',
    color: 'from-pink-400 to-pink-600'
  }
]

export default function FeaturesSection() {
  return (
    <section className="relative py-20 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Título da Seção */}
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4">
            Por Que Escolher a <span className="text-[#25D366]">Innovatis</span>?
          </h2>
          <p className="text-gray-300 text-lg max-w-2xl mx-auto">
            Mais de uma década de experiência em gestão de projetos estratégicos, conectando instituições acadêmicas, governos e o mercado privado
          </p>
        </div>

        {/* Grid de Features */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {features.map((feature, index) => {
            const Icon = feature.icon
            return (
              <div
                key={index}
                className="group relative bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-700/50 hover:border-gray-600 transition-all duration-300 hover:transform hover:scale-105 hover:shadow-2xl"
                style={{
                  animation: 'fadeIn 0.6s ease-out forwards',
                  animationDelay: `${0.1 * index}s`,
                  opacity: 0
                }}
              >
                {/* Ícone com Gradiente */}
                <div className={`inline-flex p-3 rounded-xl bg-gradient-to-br ${feature.color} mb-4 group-hover:scale-110 transition-transform duration-300`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>

                {/* Título */}
                <h3 className="text-xl font-semibold mb-2 text-white">
                  {feature.title}
                </h3>

                {/* Descrição */}
                <p className="text-gray-400 leading-relaxed">
                  {feature.description}
                </p>

                {/* Efeito de Brilho no Hover */}
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/0 to-white/0 group-hover:from-white/5 group-hover:to-white/0 transition-all duration-300 pointer-events-none" />
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

