'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { User, Lock, Loader2, AlertCircle, Shield } from 'lucide-react'

const DEFAULT_NEXT_PATH = '/admin/editais?tab=pendentes'

const SSO_ERROR_MESSAGES: Record<string, string> = {
  cognito_denied: 'Login SSO cancelado ou negado.',
  missing_code: 'Resposta SSO incompleta. Tente novamente.',
  missing_oauth_cookie: 'Sessão SSO expirou. Inicie o login de novo.',
  invalid_oauth_cookie: 'Sessão SSO inválida. Tente novamente.',
  state_mismatch: 'Falha de segurança no SSO (state). Tente novamente.',
  user_not_linked: 'Usuário sem acesso ao painel (tag edital-admin) ou não vinculado.',
  callback_failed: 'Falha ao concluir o SSO. Tente novamente.',
}

function getSafeNextPath(nextValue: string | null): string {
  if (!nextValue) {
    return DEFAULT_NEXT_PATH
  }

  try {
    const parsed = new URL(nextValue, 'http://local')
    if (parsed.origin !== 'http://local') {
      return DEFAULT_NEXT_PATH
    }

    const candidate = `${parsed.pathname}${parsed.search}${parsed.hash}`
    return candidate.startsWith('/') && !candidate.startsWith('//') ? candidate : DEFAULT_NEXT_PATH
  } catch {
    return DEFAULT_NEXT_PATH
  }
}

export default function AdminLoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const nextPath = getSafeNextPath(searchParams.get('next'))
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showCredentials, setShowCredentials] = useState(true)
  const [showSso, setShowSso] = useState(false)

  useEffect(() => {
    const ssoError = searchParams.get('sso_error')
    if (ssoError) {
      setError(SSO_ERROR_MESSAGES[ssoError] || `Erro SSO: ${ssoError}`)
    }

    let cancelled = false
    ;(async () => {
      try {
        const response = await fetch('/api/admin/auth-mode')
        if (!response.ok) return
        const data = (await response.json()) as {
          credentials?: boolean
          cognito?: boolean
        }
        if (!cancelled) {
          setShowCredentials(data.credentials !== false)
          setShowSso(Boolean(data.cognito))
        }
      } catch {
        // keep legacy defaults
      }
    })()

    return () => {
      cancelled = true
    }
  }, [searchParams])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      })

      if (response.status === 401) {
        setError('Usuário, senha ou permissão de acesso inválidos.')
        setLoading(false)
        return
      }

      if (response.status === 403) {
        setError('Login por senha desabilitado. Use SSO.')
        setLoading(false)
        return
      }

      if (response.status === 429) {
        setError('Muitas tentativas. Tente novamente em alguns minutos.')
        setLoading(false)
        return
      }

      if (!response.ok) {
        setError('Não foi possível entrar agora. Tente novamente.')
        setLoading(false)
        return
      }

      router.push(nextPath)
      router.refresh()
    } catch {
      setError('Não foi possível entrar agora. Tente novamente.')
      setLoading(false)
    }
  }

  return (
    <main className="flex-1 relative z-10 min-h-screen flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm bg-slate-900/40 backdrop-blur-xl rounded-[2.5rem] p-8 sm:p-12 border border-slate-800 shadow-2xl">
        <h1 className="text-xl font-bold text-white mb-2">Painel Admin</h1>
        <p className="text-slate-400 mb-8">Entre com seu usuário da Innovatis para acessar o painel do Edital PPI.</p>

        {error && (
          <div className="mb-4 flex items-center gap-2 text-sm text-red-400 font-medium">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {showSso && (
          <a
            href="/auth/login"
            className="mb-4 w-full px-6 py-4 border border-slate-600 hover:border-[#22AE84] text-white rounded-2xl font-bold transition-all flex items-center justify-center gap-2"
          >
            <Shield className="w-5 h-5 text-[#22AE84]" />
            Entrar com SSO
          </a>
        )}

        {showSso && showCredentials && (
          <p className="mb-4 text-center text-xs font-semibold uppercase tracking-wider text-slate-500">
            ou com senha
          </p>
        )}

        {showCredentials && (
          <form onSubmit={handleSubmit}>
            <label htmlFor="username" className="block text-sm font-bold text-slate-100 mb-3 ml-1">
              <User className="inline w-4 h-4 mr-2 text-[#22AE84]" />
              Usuário
            </label>
            <input
              type="text"
              id="username"
              name="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              autoFocus
              autoComplete="username"
              className="w-full px-6 py-4 bg-slate-900/60 border border-slate-700/50 rounded-2xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#22AE84]/30 focus:border-[#22AE84] transition-all font-medium"
            />

            <label htmlFor="password" className="block text-sm font-bold text-slate-100 mb-3 ml-1 mt-6">
              <Lock className="inline w-4 h-4 mr-2 text-[#22AE84]" />
              Senha
            </label>
            <input
              type="password"
              id="password"
              name="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              className="w-full px-6 py-4 bg-slate-900/60 border border-slate-700/50 rounded-2xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#22AE84]/30 focus:border-[#22AE84] transition-all font-medium"
            />

            <button
              type="submit"
              disabled={loading || username.length === 0 || password.length === 0}
              className="mt-8 w-full px-6 py-4 bg-[#22AE84] hover:bg-[#1C8C6A] disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-2xl font-bold transition-all flex items-center justify-center gap-2"
            >
              {loading && <Loader2 className="w-5 h-5 animate-spin" />}
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
          </form>
        )}
      </div>
    </main>
  )
}
