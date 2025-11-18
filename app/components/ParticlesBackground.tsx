'use client'
import { useCallback, useEffect, useState } from 'react'
import Particles from 'react-tsparticles'
import { Engine } from 'tsparticles-engine'
import { loadSlim } from 'tsparticles-slim'

export default function ParticlesBackground() {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  const init = useCallback(async (engine: Engine) => {
    await loadSlim(engine)
  }, [])

  // Configuração otimizada para mobile (menos partículas)
  const particleOptions = isMobile
    ? {
        background: { color: '#121826' },
        fpsLimit: 30, // Reduzido para mobile
        particles: {
          number: { value: 20, density: { enable: true, area: 800 } }, // Menos partículas
          color: { value: '#ffffff' },
          opacity: { value: 0.15 },
          size: { value: 1.5 },
          links: { enable: true, distance: 120, color: '#ffffff', opacity: 0.2, width: 0.5 },
          move: { enable: true, speed: 0.25, outModes: { default: 'out' as const } },
        },
        detectRetina: true,
      }
    : {
        background: { color: '#121826' },
        fpsLimit: 60,
        particles: {
          number: { value: 35, density: { enable: true, area: 800 } },
          color: { value: '#ffffff' },
          opacity: { value: 0.2 },
          size: { value: 2 },
          links: { enable: true, distance: 150, color: '#ffffff', opacity: 0.25, width: 1 },
          move: { enable: true, speed: 0.25, outModes: { default: 'out' as const } },
        },
        detectRetina: true,
      }

  return (
    <Particles
      id="tsparticles"
      init={init}
      className="absolute inset-0 -z-10"
      options={particleOptions}
    />
  )
}
