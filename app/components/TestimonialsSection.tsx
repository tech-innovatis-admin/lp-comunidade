'use client'

import Image from 'next/image'
import { Star, Quote } from 'lucide-react'

const testimonials = [
  {
    name: 'Maria Silva',
    role: 'CEO, TechStart',
    content: 'A Innovatis transformou completamente nossa presença digital. Resultados incríveis em pouco tempo!',
    rating: 5,
    avatar: 'https://i.pravatar.cc/150?img=47' // Foto placeholder - substitua por URL real
  },
  {
    name: 'João Santos',
    role: 'Diretor, InovaCorp',
    content: 'Profissionalismo e dedicação excepcionais. Recomendo sem hesitação para qualquer empresa.',
    rating: 5,
    avatar: 'https://i.pravatar.cc/150?img=12' // Foto placeholder - substitua por URL real
  },
  {
    name: 'Ana Costa',
    role: 'Fundadora, Digital Solutions',
    content: 'Soluções inovadoras que superaram todas as expectativas. Parceiros de confiança!',
    rating: 5,
    avatar: 'https://i.pravatar.cc/150?img=32' // Foto placeholder - substitua por URL real
  }
]

export default function TestimonialsSection() {
  return (
    <section className="relative py-16 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Título da Seção */}
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4">
            O Que Nossos <span className="text-[#25D366] font-bold">Clientes</span> Dizem
          </h2>
          <p className="text-gray-300 text-lg font-normal">
            Depoimentos reais de quem já transformou seu projeto conosco
          </p>
        </div>

        {/* Grid de Depoimentos */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {testimonials.map((testimonial, index) => (
            <div
              key={index}
              className="relative bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-700/50 hover:border-gray-600 transition-all duration-300 hover:transform hover:scale-105"
              style={{
                animation: 'fadeIn 0.6s ease-out forwards',
                animationDelay: `${0.2 * index}s`,
                opacity: 0
              }}
            >
              {/* Cabeçalho com Foto e Aspas */}
              <div className="flex items-start justify-between mb-4">
                {/* Foto de Perfil */}
                <div className="relative">
                  <div className="w-20 h-20 rounded-full overflow-hidden ring-2 ring-[#25D366]/30 ring-offset-2 ring-offset-gray-800/50">
                    <Image
                      src={testimonial.avatar}
                      alt={testimonial.name}
                      width={80}
                      height={80}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  {/* Badge de verificação */}
                  <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-[#25D366] rounded-full flex items-center justify-center border-2 border-gray-800">
                    <svg className="w-3.5 h-3.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                </div>

                {/* Ícone de Aspas */}
                <Quote className="w-8 h-8 text-[#25D366] opacity-30 flex-shrink-0" />
              </div>

              {/* Avaliação */}
              <div className="flex gap-1 mb-4">
                {[...Array(testimonial.rating)].map((_, i) => (
                  <Star key={i} className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                ))}
              </div>

              {/* Conteúdo */}
              <p className="text-gray-300 mb-6 leading-relaxed italic font-light">
                "{testimonial.content}"
              </p>

              {/* Autor */}
              <div className="border-t border-gray-700/50 pt-4">
                <p className="font-semibold text-white">{testimonial.name}</p>
                <p className="text-sm text-gray-400 font-normal">{testimonial.role}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

