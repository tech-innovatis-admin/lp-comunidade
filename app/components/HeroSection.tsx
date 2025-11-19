'use client'

import Image from 'next/image'

export default function HeroSection() {
  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center px-4 py-16 pt-2">
      {/* Conteúdo Principal */}
      <div className="max-w-4xl mx-auto text-center z-10 space-y-8">
        {/* Logo */}
        <div
          className="-mb-20 opacity-0 animate-fadeIn"
          style={{ animationDelay: '0.2s' }}
        >
          <Image 
            src="/logo_InnovaNation/logo_innovanation4.png" 
            alt="Innovatis Logo"
            width={200}
            height={60}
            className="h-100 w-auto mx-auto"
            priority
          />
        </div>

        {/* Título Principal */}
        <h1 
          className="text-4xl sm:text-5xl md:text-6xl font-extrabold leading-tight opacity-0 animate-fadeIn"
          style={{ animationDelay: '0.4s' }}
        >
          <span className="block mb-2 text-[#22AE84] font-extrabold">
            Captação e Gestão de Projetos
          </span>
          <span className="block bg-gradient-to-r from-white via-gray-200 to-white bg-clip-text text-transparent mt-2 text-2xl sm:text-3xl md:text-4xl font-semibold">
            Conectando Academia, Governo e Mercado
          </span>
        </h1>

        {/* Subtítulo */}
        <p 
          className="text-lg sm:text-xl text-gray-300 max-w-3xl mx-auto leading-relaxed opacity-0 animate-fadeIn font-light"
          style={{ animationDelay: '0.6s' }}
        >
          Atuamos como elo fundamental entre instituições acadêmicas, fundações, órgãos governamentais e entidades públicas e privadas, transformando ideias que mudem a realidade do nosso país.
        </p>

        {/* Indicador de Scroll */}
        <div 
          className="pt-2 opacity-0 animate-fadeIn"
          style={{ animationDelay: '1s' }}
        >
          <div className="animate-bounce">
            <svg 
              className="w-6 h-6 mx-auto text-gray-400" 
              fill="none" 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth="2" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path d="M19 14l-7 7m0 0l-7-7m7 7V3"></path>
            </svg>
          </div>
        </div>
      </div>
    </section>
  )
}

