'use client'

import Image from 'next/image'
import { Star, Quote } from 'lucide-react'

const testimonials = [
  {
    name: 'Marcus Varandas',
    role: 'Founder @equityclub.mls | Sócio @hofacapital | Founder Menew',
    content: 'A INNOVATIS vem mudando o mercado com soluções que atendem a dor real do cliente.',
    rating: 5,
    avatar: '/foto_depoimentos/foto_varandas.png'
  },
  {
    name: 'Carlos Alexandre',
    role: 'Pró-reitor de Extensão do IFMA',
    content: 'Com a INNOVATIS, fortalecemos ações no social, na capacitação e na inovação pública.',
    rating: 5,
    avatar: '/foto_depoimentos/foto_carlos_alexandre.png'
  },
  {
    name: 'Davys Negreiro',
    role: 'Assessor Especial Reitoria IFRO',
    content: 'Já plantamos uma parceria semente que vai beneficiar toda Rondônia com a INNOVATIS.',
    rating: 5,
    avatar: '/foto_depoimentos/foto_davys.png',
  }
]

export default function TestimonialsSection() {
  return (
    <section className="relative py-24 px-4 bg-[#F8FAFC] border-t border-slate-100 -mt-px" >
      <div className="max-w-6xl mx-auto">
        {/* Título da Seção */}
        <div className="text-center mb-20">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold mb-6 text-slate-900 tracking-tight">
            Quem já executa projeto com a <br /><span className="text-[#22AE84]">Innovatis fala por nós</span>
          </h2>
          <p className="text-slate-600 text-lg font-medium max-w-2xl mx-auto">
            Depoimentos reais de quem já transformou seu projeto conosco
          </p>
          <div className="mt-8 flex justify-center">
            <div className="h-1.5 w-20 bg-[#5EBFED] rounded-full opacity-20"></div>
          </div>
        </div>

        {/* Grid de Depoimentos */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {testimonials.map((testimonial, index) => (
            <div
              key={index}
              className="relative bg-gradient-to-br from-[#121826]/90 to-[#0F172A]/95 backdrop-blur-sm rounded-2xl p-6 border border-[#1E293B] hover:border-[#334155] transition-all duration-300 hover:transform hover:scale-105"
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
                  <div className="w-20 h-20 rounded-full overflow-hidden ring-2 ring-[#5EBFED]/30 ring-offset-2 ring-offset-gray-800/50">
                    <Image
                      src={testimonial.avatar}
                      alt={testimonial.name}
                      width={80}
                      height={80}
                      className={`w-full h-full object-cover ${index === 1 ? 'object-[80%_center]' : 'object-center'}`}
                    />
                  </div>
                  {/* Badge de verificação */}
                  <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-[#5EBFED] rounded-full flex items-center justify-center border-2 border-gray-800">
                    <svg className="w-3.5 h-3.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                </div>

                {/* Ícone de Aspas */}
                <Quote className="w-8 h-8 text-[#5EBFED] opacity-30 flex-shrink-0" />
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
    </section >
  )
}
