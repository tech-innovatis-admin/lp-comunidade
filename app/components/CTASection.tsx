'use client'

import WhatsAppButton from './WhatsAppButton'
import { whatsappConfig } from '../config/whatsapp'

export default function CTASection() {
  return (
    <section className="relative py-16 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-gradient-to-br from-[#25D366]/5 via-[#25D366]/5 to-transparent rounded-3xl p-8 sm:p-12 border border-[#25D366]/20 backdrop-blur-sm">
          <div className="text-center space-y-6">
            {/* Título */}
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold">
              Pronto Para <span className="text-[#25D366] font-bold">Transformar</span> Seus Projetos em Realidade?
            </h2>

            {/* Descrição */}
            <p className="text-lg sm:text-xl text-gray-300 max-w-2xl mx-auto font-normal">
              Seja você uma instituição acadêmica, órgão governamental ou entidade privada, apoiamos a captação e a gestão estratégica dos seus projetos. Entre em contato conosco.
            </p>

            {/* CTA Button */}
            <div className="pt-4">
              <WhatsAppButton 
                phoneNumber={whatsappConfig.phoneNumber} 
                message={whatsappConfig.messages.cta}
                variant="inline"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

