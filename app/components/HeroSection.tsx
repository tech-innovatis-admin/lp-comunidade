'use client'

import Image from 'next/image'

export default function HeroSection() {
  return (
    <section className="relative min-h-[90vh] flex flex-col items-center justify-center px-4 py-20">
      {/* Conteúdo Principal */}
      <div className="max-w-5xl mx-auto text-center z-10 space-y-12">
        {/* Logo */}
        <div
          className="-mb-12 opacity-0 animate-fadeIn"
          style={{ animationDelay: '0.2s' }}
        >
          <Image
            src="/logo_InnovaNation/logo_innovanation4.png"
            alt="Innovatis Logo"
            width={240}
            height={72}
            className="h-auto w-auto mx-auto scale-110"
            priority
          />
        </div>

        {/* Título Principal */}
        <div className="space-y-6">
          <h1
            className="text-4xl sm:text-5xl md:text-6xl font-extrabold leading-tight opacity-0 animate-fadeIn tracking-tight"
            style={{ animationDelay: '0.4s' }}
          >
            <span className="block text-[#22AE84]">
              A maior comunidade de captação e gestão de projetos do Brasil
            </span>
            <span className="block bg-gradient-to-r from-white via-slate-200 to-white bg-clip-text text-transparent mt-4 text-2xl sm:text-3xl md:text-4xl font-bold max-w-4xl mx-auto">
              Onde pesquisadores, professores, extensionistas e startups estruturam, viabilizam e executam projetos de alto impacto.
            </span>
          </h1>
        </div>

        {/* Subtítulo */}
        <p
          className="text-lg sm:text-xl text-slate-300 max-w-4xl mx-auto leading-relaxed opacity-0 animate-fadeIn font-medium"
          style={{ animationDelay: '0.6s' }}
        >
          A InnovaNation conecta academia, governo e mercado em torno de oportunidades reais de captação e execução de projetos. Um ecossistema fechado para quem busca método, articulação e capacidade de entrega.
        </p>

        <div
          className="opacity-0 animate-fadeIn pt-4"
          style={{ animationDelay: '0.8s' }}
        >
          <a
            href="#formulario"
            className="inline-flex w-full sm:w-auto items-center justify-center rounded-full bg-[#EA5B0C] px-10 py-5 text-base font-bold text-white transition duration-300 ease-in-out hover:bg-[#D94F0A] shadow-lg shadow-orange-950/20 hover:shadow-orange-900/40 transform hover:scale-105"
          >
            QUERO FAZER PARTE DA INNOVANATION
          </a>
        </div>

        {/* Indicador de Scroll */}
        {/* <div 
          className="pt-2 opacity-0 animate-fadeIn"
          style={{ animationDelay: '1s' }}
        >
          <a
            href="#formulario"
            className="inline-flex items-center justify-center rounded-full p-2 text-gray-400 hover:text-white transition-colors"
            aria-label="Ir para o formulario"
          >
            <div className="animate-bounce">
              <svg 
                className="w-6 h-6 mx-auto" 
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
          </a>
        </div> */}
      </div>
    </section>
  )
}

