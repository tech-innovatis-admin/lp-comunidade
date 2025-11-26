'use client'

import { useState } from 'react'
import { X } from 'lucide-react'

interface TermsModalProps {
  isOpen: boolean
  onClose: () => void
  onAccept: () => void
  isAccepted: boolean
  termsContent?: string
  isLoading?: boolean
}

export default function TermsModal({ isOpen, onClose, onAccept, isAccepted, termsContent, isLoading = false }: TermsModalProps) {
  const [modalAccepted, setModalAccepted] = useState(false)

  if (!isOpen) return null

  const handleAccept = () => {
    setModalAccepted(true)
    onAccept()
  }

  const handleClose = () => {
    setModalAccepted(false)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-gradient-to-br from-white to-gray-50 rounded-2xl max-w-4xl w-full max-h-[75vh] overflow-hidden border border-gray-300 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-3 border-b border-gray-300">
          <h2 className="text-lg font-bold text-gray-900">
            Termo de Adesão, Reciprocidade e Compromisso de Repasse
          </h2>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
            aria-label="Fechar modal"
          >
            <X className="w-5 h-5 text-gray-600 hover:text-gray-900" />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(75vh-140px)] p-8">
          <div className="prose max-w-none">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-8 h-8 border-4 border-[#25D366] border-t-transparent rounded-full animate-spin"></div>
                <span className="ml-3 text-gray-600">Carregando termos...</span>
              </div>
            ) : termsContent ? (
              <div 
                className="text-gray-900 space-y-3 font-normal leading-relaxed text-sm"
                dangerouslySetInnerHTML={{ __html: termsContent }}
              />
            ) : (
              <div className="text-gray-900 space-y-3 font-normal leading-relaxed text-sm">
                <p className="text-center text-red-600">
                  Erro ao carregar os termos de uso. Por favor, recarregue a página.
                </p>
              </div>
            )}

            {/* Checkbox dentro do modal */}
            <div className="mt-3 pt-3 border-t border-gray-300">
              <div className="flex items-start gap-2">
                <div className="relative flex items-center">
                  <input
                    type="checkbox"
                    id="modal-terms"
                    checked={modalAccepted}
                    onChange={() => setModalAccepted(!modalAccepted)}
                    className="w-4 h-4 rounded border-gray-400 bg-white text-[#25D366] focus:ring-2 focus:ring-[#25D366] cursor-pointer"
                  />
                </div>
                <label htmlFor="modal-terms" className="flex-1 text-xs text-gray-700 cursor-pointer font-normal">
                  Aceito os <span className="text-[#25D366] font-medium">Termos de Adesão, Reciprocidade e Compromisso de Repasse</span>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-3 border-t border-gray-300">
          <button
            onClick={handleClose}
            className="px-6 py-1.5 bg-gray-200 hover:bg-gray-300 text-gray-900 rounded-lg transition-colors font-semibold"
          >
            Fechar
          </button>
          <button
            onClick={handleAccept}
            disabled={!modalAccepted}
            className={`
              px-6 py-1.5 rounded-lg font-semibold transition-all duration-300
              ${modalAccepted
                ? 'bg-[#25D366] hover:bg-[#20BA5A] text-white shadow-xl shadow-[#25D366]/30'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }
            `}
          >
            Confirmar
          </button>
        </div>
      </div>
    </div>
  )
}
