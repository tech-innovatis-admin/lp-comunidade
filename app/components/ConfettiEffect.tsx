'use client'

import { useEffect, useState, useRef } from 'react'

interface ConfettiEffectProps {
  trigger: boolean
  onComplete?: () => void
}

export default function ConfettiEffect({ trigger, onComplete }: ConfettiEffectProps) {
  const [isActive, setIsActive] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const hasTriggeredRef = useRef(false)
  const [particles, setParticles] = useState<Array<{
    id: number
    left: number
    delay: number
    duration: number
    rotation: number
    color: string
    shape: 'square' | 'circle' | 'triangle'
    size: number
  }>>([])

  // Detecta se é mobile
  useEffect(() => {
    if (typeof window === 'undefined') return
    
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768 || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent))
    }
    
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  useEffect(() => {
    // Só executa se trigger for true e ainda não foi acionado
    if (trigger && !hasTriggeredRef.current) {
      hasTriggeredRef.current = true
      setIsActive(true)
      
      // Reduz partículas em mobile para melhor performance
      const particleCount = isMobile ? 60 : 150
      
      // Gera partículas únicas
      const newParticles = Array.from({ length: particleCount }).map((_, i) => ({
        id: i,
        left: Math.random() * 100,
        delay: Math.random() * 0.3,
        duration: isMobile ? 2 + Math.random() * 1 : 2.5 + Math.random() * 1.5,
        rotation: Math.random() * 720,
        color: ['#25D366', '#ffffff', '#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#FF69B4', '#9B59B6'][Math.floor(Math.random() * 10)],
        shape: ['square', 'circle', 'triangle'][Math.floor(Math.random() * 3)] as 'square' | 'circle' | 'triangle',
        size: isMobile ? 6 + Math.random() * 6 : 8 + Math.random() * 8
      }))
      setParticles(newParticles)

      const timer = setTimeout(() => {
        setIsActive(false)
        setParticles([])
        hasTriggeredRef.current = false
        onComplete?.()
      }, isMobile ? 3000 : 4000) // Duração menor em mobile

      return () => clearTimeout(timer)
    }
    
    // Reset quando trigger volta para false
    if (!trigger) {
      hasTriggeredRef.current = false
      setIsActive(false)
      setParticles([])
    }
  }, [trigger, onComplete, isMobile])

  if (!isActive || particles.length === 0) return null

  return (
    <>
      <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
        {particles.map((particle) => {
          const shapeStyles = {
            square: {
              borderRadius: '2px',
            },
            circle: {
              borderRadius: '50%',
            },
            triangle: {
              width: 0,
              height: 0,
              backgroundColor: 'transparent',
              borderLeft: `${particle.size / 2}px solid transparent`,
              borderRight: `${particle.size / 2}px solid transparent`,
              borderBottom: `${particle.size}px solid ${particle.color}`,
            }
          }

          return (
            <div
              key={particle.id}
              className={`absolute top-0 confetti-piece ${isMobile ? 'confetti-mobile' : ''}`}
              style={{
                left: `${particle.left}%`,
                backgroundColor: particle.shape !== 'triangle' ? particle.color : 'transparent',
                width: particle.shape !== 'triangle' ? `${particle.size}px` : '0',
                height: particle.shape !== 'triangle' ? `${particle.size}px` : '0',
                animationDelay: `${particle.delay}s`,
                animationDuration: `${particle.duration}s`,
                transform: `rotate(${particle.rotation}deg)`,
                ...shapeStyles[particle.shape]
              }}
            />
          )
        })}
      </div>
    </>
  )
}

