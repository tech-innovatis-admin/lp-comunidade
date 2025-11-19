'use client'

import { useState } from 'react'
import { X } from 'lucide-react'

interface TermsModalProps {
  isOpen: boolean
  onClose: () => void
  onAccept: () => void
  isAccepted: boolean
}

export default function TermsModal({ isOpen, onClose, onAccept, isAccepted }: TermsModalProps) {
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
            <div className="text-gray-900 space-y-3 font-normal leading-relaxed text-sm">
              <p className="text-sm font-semibold text-center mb-3">
                TERMO DE ADESÃO, RECIPROCIDADE E COMPROMISSO DE REPASSE
              </p>

              <p className="text-justify">
                Este Termo estabelece as condições de Adesão, Reciprocidade, Responsabilidade, Confidencialidade, Sigilo e Repasse de 
                Remuneração aplicáveis à participação e atuação do <strong>PARCEIRO</strong> (pessoa física ou jurídica) em projetos ou negócios prospectados 
                e/ou intermediados pela <strong>INNOVATIS GESTÃO & CONSULTORIA LTDA.</strong>, por meio da sua rede de comunicação (Comunidade 
                WhatsApp).
              </p>

              <p className="text-justify">
                Ao ingressar no grupo de comunicação e/ou aceitar participar de qualquer iniciativa de prospecção ou projeto intermediado pela 
                INNOVATIS, o PARCEIRO adere e concorda com as seguintes cláusulas:
              </p>

              <div className="space-y-3">
                <div>
                  <h3 className="text-base font-semibold mb-1.5">1. Do Objeto e Compromisso</h3>
                  <p className="text-justify">
                    O <strong>PARCEIRO</strong> se compromete a celebrar e executar projetos de Extensão, Pesquisa e Desenvolvimento, ou outros correlatos, que
                    tenham sido <strong>prospectados, captados ou intermediados</strong> pela <strong>INNOVATIS GESTÃO & CONSULTORIA LTDA.</strong>
                  </p>
                </div>

                <div>
                  <h3 className="text-base font-semibold mb-1.5">2. Do Repasse e Remuneração da INNOVATIS</h3>
                  <p className="mb-1.5 text-justify">
                    Em reconhecimento ao serviço de prospecção, captação e/ou intermediação de projetos prestado pela <strong>INNOVATIS</strong>, esta fará jus a
                    uma remuneração de sucesso (<strong>Success Fee</strong>), estabelecida da seguinte forma:
                  </p>

                  <div className="ml-4 space-y-1.5">
                    <div>
                      <h4 className="text-sm font-semibold mb-1">2.1. Percentual de Repasse:</h4>
                      <p className="text-justify">
                        O <strong>PARCEIRO</strong> se compromete a repassar à <strong>INNOVATIS GESTÃO & CONSULTORIA LTDA</strong> <strong>10% (dez por cento)</strong> do Valor 
                        Global Líquido de cada projeto efetivamente contratado e executado cuja origem ou intermediação tenha sido comprovadamente da 
                        <strong>INNOVATIS</strong>.
                      </p>
                    </div>

                    <div>
                      <h4 className="text-sm font-semibold mb-1">2.2. Base de Cálculo:</h4>
                      <p className="text-justify">
                        O <strong>Valor Global Líquido</strong> do projeto corresponde ao valor total do contrato/projeto recebido pelo <strong>PARCEIRO</strong>, excluindo-se 
                        impostos, taxas e custos operacionais que não componham a base de cálculo de remuneração do <strong>PARCEIRO</strong>.
                      </p>
                    </div>

                    <div>
                      <h4 className="text-sm font-semibold mb-1">2.3. Condição de Pagamento (Repasse):</h4>
                      <p className="text-justify">
                        O repasse dos 10% (dez por cento) para a <strong>INNOVATIS</strong> será efetuado em até <strong>5 (cinco) dias úteis</strong> após o recebimento dos valores 
                        (créditos) correspondentes ao projeto pelo <strong>PARCEIRO EXECUTOR</strong>, mediante apresentação da documentação fiscal pertinente 
                        (Nota Fiscal de Prestação de Serviços ou outro documento legalmente aceito) pela <strong>INNOVATIS GESTÃO & CONSULTORIA LTDA</strong>.
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-base font-semibold mb-1.5">3. Do Sigilo e da Confidencialidade</h3>
                  <p className="mb-1.5 text-justify">
                    O <strong>PARCEIRO</strong> reconhece que terá acesso a Informações Confidenciais, que incluem, mas não se limitam a:
                  </p>
                  <ul className="list-disc list-inside ml-4 space-y-0.5 mb-1.5">
                    <li>Dados e informações de prospecção, negociação e elaboração de projetos.</li>
                    <li>Estratégias de clientes, orçamentos e planos de trabalho.</li>
                    <li>Qualquer informação técnica, comercial, financeira ou de <em>know-how</em> da <strong>INNOVATIS</strong> GESTÃO & CONSULTORIA LTDA e de seus <strong>PARCEIRO s/clientes</strong>.</li>
                  </ul>
                  <p className="mb-1.5 text-justify">
                    O <strong>PARCEIRO</strong> se compromete a manter a mais completa confidencialidade e sigilo sobre quaisquer Informações Confidenciais 
                    obtidas, mesmo após o término da relação de parceria, sob pena de responsabilidade civil e criminal pelos danos causados.
                  </p>
                  <p className="text-justify">
                    Caso o <strong>PARCEIRO</strong> viole, total ou parcialmente, o dever de confidencialidade e sigilo estabelecido, divulgando ou utilizando 
                    indevidamente as informações confidenciais a que teve acesso, incorrerá em multa não compensatória no valor de <strong>R$ 1.000.000,00 
                    (um milhão)</strong>.
                  </p>
                </div>

                <div>
                  <h3 className="text-base font-semibold mb-1.5">4. Das Disposições Gerais</h3>
                  <div className="ml-4 space-y-1.5">
                    <div>
                      <h4 className="text-sm font-semibold mb-1">4.1. Inexistência de Vínculo:</h4>
                      <p className="text-justify">
                        Fica estabelecida a total inexistência de vínculo trabalhista entre as partes, não havendo qualquer relação de subordinação.
                      </p>
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold mb-1">4.2. Lei Aplicável e Foro:</h4>
                      <p className="text-justify">
                        Aplicam-se a este Termo as disposições do Código Civil Brasileiro. Fica eleito o foro de João Pessoa/PB para dirimir quaisquer 
                        conflitos.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

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
