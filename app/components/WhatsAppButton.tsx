'use client'

import { MessageCircle } from 'lucide-react'
import { useState, useEffect } from 'react'

interface WhatsAppButtonProps {
  phoneNumber: string
  message?: string
  className?: string
  variant?: 'floating' | 'inline'
}

export default function WhatsAppButton({ 
  phoneNumber, 
  message = 'Olá! Gostaria de saber mais informações.',
  className = '',
  variant = 'floating'
}: WhatsAppButtonProps) {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    setIsVisible(true)
  }, [])

  const handleClick = () => {
    const encodedMessage = encodeURIComponent(message)
    const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodedMessage}`
    window.open(whatsappUrl, '_blank')
  }

  if (variant === 'floating') {
    return (
      <button
        onClick={handleClick}
        className={`
          fixed bottom-6 right-6 z-50
          bg-[#25D366] hover:bg-[#20BA5A]
          text-white font-semibold
          px-6 py-4 rounded-full
          shadow-2xl shadow-[#25D366]/50
          flex items-center gap-3
          transition-all duration-300
          transform hover:scale-110 active:scale-95
          ${isVisible ? 'animate-fadeIn' : 'opacity-0'}
          ${className}
        `}
        aria-label="Falar no WhatsApp"
      >
        <MessageCircle className="w-6 h-6" />
        <span className="hidden sm:inline">Falar no WhatsApp</span>
        <span className="sm:hidden">WhatsApp</span>
      </button>
    )
  }

  return (
    <button
      onClick={handleClick}
      className={`
        bg-[#25D366] hover:bg-[#20BA5A]
        text-white font-semibold
        px-8 py-4 rounded-full
        shadow-xl shadow-[#25D366]/30
        flex items-center justify-center gap-3
        transition-all duration-300
        transform hover:scale-105 active:scale-95
        w-full sm:w-auto mx-auto
        text-lg
        ${className}
      `}
      aria-label="Falar no WhatsApp"
    >
      <MessageCircle className="w-6 h-6" />
      Falar no WhatsApp Agora
    </button>
  )
}

