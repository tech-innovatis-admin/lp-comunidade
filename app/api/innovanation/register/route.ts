import { NextResponse } from 'next/server'

// Função de validação de CPF (mesma do frontend)
function isValidCPF(raw: string): boolean {
  const cpf = raw.replace(/\D/g, '')

  if (cpf.length !== 11) return false

  if (/^(\d)\1{10}$/.test(cpf)) return false

  const calcDigit = (base: string, factorStart: number): number => {
    let sum = 0

    for (let i = 0; i < base.length; i++) {
      const digit = parseInt(base[i], 10)
      const factor = factorStart - i
      sum += digit * factor
    }

    const rest = sum % 11
    return rest < 2 ? 0 : 11 - rest
  }

  const base = cpf.slice(0, 9)
  const d1 = calcDigit(base, 10)
  const d2 = calcDigit(base + d1.toString(), 11)
  const cpfCalculated = base + d1.toString() + d2.toString()
  
  return cpf === cpfCalculated
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { nomeCompleto, profissao, empresa, cpf, telefone, email, endereco, projetos, terms, captchaToken } = body

    // 1. Validação do reCAPTCHA
    if (!captchaToken) {
      return NextResponse.json(
        { error: 'Token do reCAPTCHA não fornecido.' },
        { status: 400 }
      )
    }

    const verifyRes = await fetch('https://www.google.com/recaptcha/api/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        secret: process.env.RECAPTCHA_SECRET_KEY || '',
        response: captchaToken,
      }),
    })

    const verifyData = await verifyRes.json()

    if (!verifyData.success) {
      return NextResponse.json(
        { error: 'Falha na verificação do reCAPTCHA.' },
        { status: 400 }
      )
    }

    // 2. Validação dos dados do formulário
    if (!nomeCompleto || !nomeCompleto.trim()) {
      return NextResponse.json(
        { error: 'Nome completo é obrigatório.' },
        { status: 400 }
      )
    }

    if (!profissao || !profissao.trim()) {
      return NextResponse.json(
        { error: 'Profissão é obrigatória.' },
        { status: 400 }
      )
    }

    if (!cpf || !cpf.trim()) {
      return NextResponse.json(
        { error: 'CPF é obrigatório.' },
        { status: 400 }
      )
    }

    if (!isValidCPF(cpf)) {
      return NextResponse.json(
        { error: 'CPF inválido.' },
        { status: 400 }
      )
    }

    if (!telefone || telefone.replace(/\D/g, '').length < 10) {
      return NextResponse.json(
        { error: 'Telefone inválido.' },
        { status: 400 }
      )
    }

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { error: 'E-mail inválido.' },
        { status: 400 }
      )
    }

    if (!endereco || !endereco.trim()) {
      return NextResponse.json(
        { error: 'Endereço é obrigatório.' },
        { status: 400 }
      )
    }

    if (!terms || !terms.termoAdesao) {
      return NextResponse.json(
        { error: 'Você deve aceitar o Termo de Adesão, Reciprocidade e Compromisso de Repasse.' },
        { status: 400 }
      )
    }

    // 3. Aqui você pode:
    // - Salvar no banco de dados
    // - Enviar e-mail de confirmação
    // - Enviar notificação para WhatsApp
    // - Integrar com sistemas externos
    
    // Por enquanto, apenas retorna sucesso
    // TODO: Implementar persistência dos dados
    
    console.log('Inscrição recebida:', {
      nomeCompleto,
      profissao,
      empresa,
      cpf,
      telefone,
      email,
      endereco,
      projetos,
      terms,
    })

    return NextResponse.json(
      { 
        success: true,
        message: 'Inscrição realizada com sucesso!' 
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Erro ao processar inscrição:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor.' },
      { status: 500 }
    )
  }
}

