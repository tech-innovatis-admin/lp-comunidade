# Painel Admin de Propostas do Edital PPI — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a password-protected `/admin` section that lists submitted Edital PPI proposals and shows full detail (answers, documents, photos) per proposal, and lock down the two public document-link redirect routes behind the same session.

**Architecture:** A shared-password login (`ADMIN_PASSWORD`) issues an HMAC-signed session cookie (mirrors the existing `lib/edital-auth.ts` pattern). Two new React Server Components (`/admin/editais`, `/admin/editais/[id]`) query Postgres directly via `lib/db.ts` — no separate JSON API for reads. The two existing document-link routes (`/api/editais/documento/[id]/link`, `/api/editais/certificado/[registrationId]/link`) gain the same session check they're missing today.

**Tech Stack:** Next.js 15 App Router (Server Components + Route Handlers), Node `crypto` (HMAC-SHA256, no new dependency), `pg` via `lib/db.ts`, Tailwind (existing dark theme: `bg-slate-900/40`, `border-slate-800`, accent `#22AE84`).

## Global Constraints

- No automated test framework exists in this repo (confirmed in `CLAUDE.md`: "There is no test suite in this repo"). Every task's verification step is a **manual check**: a throwaway `tsx` script (written, run, then deleted — same pattern used repeatedly earlier in this project's session history) for pure logic, or `curl`/browser against the running `npm run dev` server for HTTP-facing behavior. Do not introduce Jest/Vitest — that would be inconsistent with the rest of the codebase.
- All new admin auth logic funnels through exactly one function, `verifyAdminSessionToken()` in `lib/admin-auth.ts` — every protected page and route calls it directly (no wrapper/middleware layer). This is a deliberate spec decision so a future swap to the real cross-platform "hub" auth only touches this one file.
- `middleware.ts` is **not** modified — it runs on the Edge runtime (only uses `crypto.randomUUID()`), and HMAC verification needs Node's `crypto` module, which isn't available there by default.
- Match existing code conventions: Portuguese for UI copy, comments, and error messages; `applyNoStore()` on JSON API responses; `isTrustedOrigin()` + `enforceRateLimit()` on any route that accepts a password/credential.
- Session TTL: 7 days.

---

### Task 1: Admin session token library

**Files:**
- Create: `lib/admin-auth.ts`
- Modify: `.env`, `env.example`

**Interfaces:**
- Produces: `ADMIN_SESSION_COOKIE_NAME: string` (constant), `createAdminSessionToken(): string`, `verifyAdminSessionToken(token: string | undefined | null): boolean`

- [ ] **Step 1: Write `lib/admin-auth.ts`**

```typescript
/**
 * Token assinado (HMAC-SHA256) para a sessão do painel admin.
 * Placeholder de autenticação por senha única compartilhada — quando a
 * integração com o hub de plataformas (banco de usuários + tag "edital")
 * estiver pronta, só esta função e o fluxo de login em
 * app/api/admin/login/route.ts precisam mudar. Nenhuma página ou rota
 * protegida sabe como a sessão é validada por trás de verifyAdminSessionToken().
 */

import * as crypto from 'crypto';

export const ADMIN_SESSION_COOKIE_NAME = 'admin_session';

interface AdminTokenPayload {
  iat: number;
  exp: number;
}

const TOKEN_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 dias
const DEV_FALLBACK_SECRET = 'dev-only-insecure-admin-secret-do-not-use-in-production';

function getSecret(): string {
  const secret = process.env.ADMIN_TOKEN_SECRET;

  if (secret) {
    return secret;
  }

  if (process.env.NODE_ENV === 'production') {
    throw new Error('ADMIN_TOKEN_SECRET não configurado em produção');
  }

  console.warn(
    '[admin-auth] ADMIN_TOKEN_SECRET ausente — usando segredo inseguro de desenvolvimento. ' +
    'Configure ADMIN_TOKEN_SECRET antes de ir para produção.'
  );
  return DEV_FALLBACK_SECRET;
}

function sign(encodedPayload: string): string {
  return crypto.createHmac('sha256', getSecret()).update(encodedPayload).digest('base64url');
}

export function createAdminSessionToken(): string {
  const now = Math.floor(Date.now() / 1000);
  const payload: AdminTokenPayload = {
    iat: now,
    exp: now + TOKEN_TTL_SECONDS,
  };

  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = sign(encodedPayload);
  return `${encodedPayload}.${signature}`;
}

export function verifyAdminSessionToken(token: string | undefined | null): boolean {
  if (!token || typeof token !== 'string') {
    return false;
  }

  const parts = token.split('.');
  if (parts.length !== 2) {
    return false;
  }

  const [encodedPayload, signature] = parts;
  const expectedSignature = sign(encodedPayload);

  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);

  if (signatureBuffer.length !== expectedBuffer.length) {
    return false;
  }

  if (!crypto.timingSafeEqual(signatureBuffer, expectedBuffer)) {
    return false;
  }

  let payload: AdminTokenPayload;
  try {
    payload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf-8'));
  } catch {
    return false;
  }

  if (typeof payload.exp !== 'number') {
    return false;
  }

  const now = Math.floor(Date.now() / 1000);
  return payload.exp >= now;
}
```

- [ ] **Step 2: Add env vars**

Add to `.env` (after the existing `AWS_*` block, before the Google Sheets block):

```
# Painel admin (placeholder — senha única compartilhada, ver lib/admin-auth.ts)
ADMIN_PASSWORD=troque-esta-senha
ADMIN_TOKEN_SECRET=troque-por-um-segredo-aleatorio-forte-admin
```

Add the same two lines to `env.example`, matching the existing style (placeholder values, not real secrets):

```
# Painel admin (placeholder — senha única compartilhada, ver lib/admin-auth.ts)
ADMIN_PASSWORD=your-admin-password
ADMIN_TOKEN_SECRET=troque-por-um-segredo-aleatorio-forte-admin
```

- [ ] **Step 3: Manual verification script**

Create a throwaway file `_test-admin-auth.ts` at the project root:

```typescript
import 'dotenv/config';
import { createAdminSessionToken, verifyAdminSessionToken } from './lib/admin-auth';

const token = createAdminSessionToken();
console.log('Token gerado:', token.slice(0, 20) + '...');
console.log('Token válido deve ser true:', verifyAdminSessionToken(token));
console.log('Token vazio deve ser false:', verifyAdminSessionToken(''));
console.log('Token undefined deve ser false:', verifyAdminSessionToken(undefined));
console.log('Token adulterado deve ser false:', verifyAdminSessionToken(token.slice(0, -2) + 'xx'));
console.log('Token malformado (sem ponto) deve ser false:', verifyAdminSessionToken('naoehum.token.valido'));
```

Run: `npx tsx _test-admin-auth.ts`

Expected output: token válido → `true`; os outros quatro casos → `false`.

- [ ] **Step 4: Delete the throwaway script**

```bash
rm _test-admin-auth.ts
```

- [ ] **Step 5: Commit**

```bash
git add lib/admin-auth.ts .env env.example
git commit -m "feat: adiciona biblioteca de sessão admin (token HMAC, placeholder de senha única)"
```

---

### Task 2: Login and logout API routes

**Files:**
- Create: `app/api/admin/login/route.ts`
- Create: `app/api/admin/logout/route.ts`

**Interfaces:**
- Consumes: `createAdminSessionToken()`, `ADMIN_SESSION_COOKIE_NAME` (Task 1); `enforceRateLimit`, `isTrustedOrigin`, `applyNoStore` from `lib/security.ts`
- Produces: `POST /api/admin/login` (body `{ password: string }`, sets cookie on success, 200/401/429/403), `POST /api/admin/logout` (clears cookie, 200)

- [ ] **Step 1: Write `app/api/admin/login/route.ts`**

```typescript
/**
 * POST /api/admin/login
 * Autentica o time interno no painel admin via senha única compartilhada
 * (placeholder — ver lib/admin-auth.ts para o plano de substituição).
 */

import { NextRequest, NextResponse } from 'next/server';
import * as crypto from 'crypto';
import { applyNoStore, enforceRateLimit, isTrustedOrigin } from '@/lib/security';
import { createAdminSessionToken, ADMIN_SESSION_COOKIE_NAME } from '@/lib/admin-auth';

function jsonResponse(body: unknown, init?: ResponseInit) {
  return applyNoStore(NextResponse.json(body, init));
}

function passwordMatches(candidate: string, expected: string): boolean {
  const candidateBuffer = Buffer.from(candidate);
  const expectedBuffer = Buffer.from(expected);

  if (candidateBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(candidateBuffer, expectedBuffer);
}

export async function POST(request: NextRequest) {
  try {
    if (!isTrustedOrigin(request)) {
      return jsonResponse({ error: 'Origem não autorizada' }, { status: 403 });
    }

    const rateLimit = enforceRateLimit(request, 'admin-login', 5, 15 * 60 * 1000);
    if (!rateLimit.allowed) {
      return jsonResponse(
        { error: 'Muitas tentativas. Tente novamente em alguns minutos.' },
        {
          status: 429,
          headers: { 'Retry-After': rateLimit.retryAfterSeconds.toString() },
        }
      );
    }

    let body: { password?: unknown };
    try {
      body = await request.json();
    } catch {
      return jsonResponse({ error: 'Requisição inválida' }, { status: 400 });
    }

    const password = typeof body.password === 'string' ? body.password : '';
    const expectedPassword = process.env.ADMIN_PASSWORD;

    if (!expectedPassword) {
      console.error('[admin-login] ADMIN_PASSWORD não configurada');
      return jsonResponse({ error: 'Erro interno do servidor' }, { status: 500 });
    }

    if (!password || !passwordMatches(password, expectedPassword)) {
      return jsonResponse({ error: 'Senha incorreta' }, { status: 401 });
    }

    const token = createAdminSessionToken();
    const response = jsonResponse({ ok: true });

    response.cookies.set(ADMIN_SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('[admin-login] Erro ao autenticar:', error);
    return jsonResponse({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
```

- [ ] **Step 2: Write `app/api/admin/logout/route.ts`**

```typescript
/**
 * POST /api/admin/logout
 * Limpa a sessão do painel admin.
 */

import { NextRequest, NextResponse } from 'next/server';
import { applyNoStore } from '@/lib/security';
import { ADMIN_SESSION_COOKIE_NAME } from '@/lib/admin-auth';

export async function POST(request: NextRequest) {
  const response = applyNoStore(NextResponse.json({ ok: true }));
  response.cookies.delete(ADMIN_SESSION_COOKIE_NAME);
  return response;
}
```

- [ ] **Step 3: Manual verification against the running dev server**

Ensure `npm run dev` is running, then confirm `ADMIN_PASSWORD` in `.env` has a real value (not the placeholder), restart the dev server if you just changed it.

```bash
# Senha errada -> 401
curl -s -o /dev/null -w "%{http_code}\n" -X POST http://localhost:3000/api/admin/login \
  -H "Content-Type: application/json" -H "Origin: http://localhost:3000" \
  -d '{"password":"errada"}'

# Senha certa -> 200 com Set-Cookie
curl -si -X POST http://localhost:3000/api/admin/login \
  -H "Content-Type: application/json" -H "Origin: http://localhost:3000" \
  -d '{"password":"<valor real de ADMIN_PASSWORD no .env>"}' | grep -i "set-cookie\|HTTP"
```

Expected: first call `401`; second call `200 OK` with a `Set-Cookie: admin_session=...` header.

- [ ] **Step 4: Commit**

```bash
git add app/api/admin/login/route.ts app/api/admin/logout/route.ts
git commit -m "feat: adiciona rotas de login e logout do painel admin"
```

---

### Task 3: Login page

**Files:**
- Create: `app/admin/login/page.tsx`

**Interfaces:**
- Consumes: `POST /api/admin/login` (Task 2)

- [ ] **Step 1: Write `app/admin/login/page.tsx`**

```typescript
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Lock, Loader2, AlertCircle } from 'lucide-react'

export default function AdminLoginPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })

      if (response.status === 401) {
        setError('Senha incorreta.')
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

      router.push('/admin/editais')
      router.refresh()
    } catch {
      setError('Não foi possível entrar agora. Tente novamente.')
      setLoading(false)
    }
  }

  return (
    <main className="flex-1 relative z-10 min-h-screen flex items-center justify-center px-4 py-16">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm bg-slate-900/40 backdrop-blur-xl rounded-[2.5rem] p-8 sm:p-12 border border-slate-800 shadow-2xl"
      >
        <h1 className="text-xl font-bold text-white mb-2">Painel Admin</h1>
        <p className="text-slate-400 mb-8">Informe a senha de acesso ao painel de propostas do Edital PPI.</p>

        <label htmlFor="password" className="block text-sm font-bold text-slate-100 mb-3 ml-1">
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
          autoFocus
          className="w-full px-6 py-4 bg-slate-900/60 border border-slate-700/50 rounded-2xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#22AE84]/30 focus:border-[#22AE84] transition-all font-medium"
        />

        {error && (
          <div className="mt-4 flex items-center gap-2 text-sm text-red-400 font-medium">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <button
          type="submit"
          disabled={loading || password.length === 0}
          className="mt-8 w-full px-6 py-4 bg-[#22AE84] hover:bg-[#1C8C6A] disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-2xl font-bold transition-all flex items-center justify-center gap-2"
        >
          {loading && <Loader2 className="w-5 h-5 animate-spin" />}
          {loading ? 'Entrando...' : 'Entrar'}
        </button>
      </form>
    </main>
  )
}
```

- [ ] **Step 2: Manual verification in the browser**

With `npm run dev` running, open `http://localhost:3000/admin/login`. Type the wrong password, submit, confirm "Senha incorreta." appears. Type the real `ADMIN_PASSWORD` value, submit, confirm the browser navigates to `/admin/editais` (this will 404 or error until Task 4 lands — that's expected at this point; the important check here is that login succeeds and the redirect is attempted, and that dev tools' Application/Storage tab shows an `admin_session` cookie was set).

- [ ] **Step 3: Commit**

```bash
git add app/admin/login/page.tsx
git commit -m "feat: adiciona tela de login do painel admin"
```

---

### Task 4: Proposals list page

**Files:**
- Create: `app/admin/editais/page.tsx`

**Interfaces:**
- Consumes: `verifyAdminSessionToken`, `ADMIN_SESSION_COOKIE_NAME` (Task 1); `query` from `lib/db.ts`
- Produces: page rendered at `/admin/editais`, links to `/admin/editais/{id}`

- [ ] **Step 1: Write `app/admin/editais/page.tsx`**

```typescript
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { query } from '@/lib/db'
import { verifyAdminSessionToken, ADMIN_SESSION_COOKIE_NAME } from '@/lib/admin-auth'

interface SubmissionListRow {
  id: number
  full_name: string
  institution_name: string | null
  status: 'DRAFT' | 'SUBMITTED'
  submitted_at: string
}

async function loadSubmissions(): Promise<SubmissionListRow[]> {
  return query<SubmissionListRow>(
    `SELECT s.id, r.full_name, s.institution_name, s.status, s.submitted_at
     FROM edital_submissions s
     INNER JOIN registrations r ON r.id = s.registration_id
     WHERE s.status = 'SUBMITTED'
     ORDER BY s.submitted_at DESC`
  )
}

export default async function AdminEditaisPage() {
  const cookieStore = await cookies()
  const token = cookieStore.get(ADMIN_SESSION_COOKIE_NAME)?.value

  if (!verifyAdminSessionToken(token)) {
    redirect('/admin/login')
  }

  const submissions = await loadSubmissions()

  return (
    <main className="flex-1 relative z-10 min-h-screen px-4 py-16">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-white mb-2">Propostas do Edital PPI</h1>
        <p className="text-slate-400 mb-8">{submissions.length} proposta(s) enviada(s).</p>

        {submissions.length === 0 && (
          <p className="text-slate-400">Nenhuma proposta enviada ainda.</p>
        )}

        <div className="space-y-3">
          {submissions.map((submission) => (
            <Link
              key={submission.id}
              href={`/admin/editais/${submission.id}`}
              className="block bg-slate-900/40 hover:bg-slate-900/60 border border-slate-800 rounded-2xl p-6 transition-colors"
            >
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-white font-bold">{submission.full_name}</p>
                  <p className="text-sm text-slate-400">{submission.institution_name || 'Sem instituição informada'}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <span className="inline-block px-3 py-1 bg-[#22AE84]/20 text-[#22AE84] rounded-full text-xs font-bold">
                    {submission.status}
                  </span>
                  <p className="text-xs text-slate-500 mt-2">
                    {new Date(submission.submitted_at).toLocaleString('pt-BR')}
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </main>
  )
}
```

- [ ] **Step 2: Manual verification in the browser**

With `npm run dev` running, visit `http://localhost:3000/admin/editais` in a fresh/incognito browser with no `admin_session` cookie — confirm it redirects to `/admin/login`. Log in via `/admin/login`, confirm you land on `/admin/editais` and see a row for submission `#1` (`registration_id = 23`, the real submission from earlier testing), showing name, institution, `SUBMITTED`, and a formatted date.

- [ ] **Step 3: Commit**

```bash
git add app/admin/editais/page.tsx
git commit -m "feat: adiciona listagem de propostas do Edital no painel admin"
```

---

### Task 5: Proposal detail page

**Files:**
- Create: `app/admin/editais/[id]/page.tsx`

**Interfaces:**
- Consumes: `verifyAdminSessionToken`, `ADMIN_SESSION_COOKIE_NAME` (Task 1); `query`, `queryOne` from `lib/db.ts`; `EDITAL_DOCUMENT_LABELS` from `lib/edital-completeness.ts`; `EDITAL_REQUIRED_DOCUMENT_CODES`, `EDITAL_PHOTO_DOCUMENT_CODE` from `lib/edital-requirements.ts`
- Produces: page rendered at `/admin/editais/[id]`, uses `/api/editais/documento/[id]/link` and `/api/editais/certificado/[registrationId]/link` (Task 6 adds auth to those)

- [ ] **Step 1: Write `app/admin/editais/[id]/page.tsx`**

```typescript
import { cookies } from 'next/headers'
import { redirect, notFound } from 'next/navigation'
import { query, queryOne } from '@/lib/db'
import { verifyAdminSessionToken, ADMIN_SESSION_COOKIE_NAME } from '@/lib/admin-auth'
import { EDITAL_DOCUMENT_LABELS } from '@/lib/edital-completeness'
import { EDITAL_REQUIRED_DOCUMENT_CODES, EDITAL_PHOTO_DOCUMENT_CODE } from '@/lib/edital-requirements'

interface SubmissionDetailRow {
  id: number
  registration_id: number
  status: 'DRAFT' | 'SUBMITTED'
  full_name: string
  cpf: string
  team_description: string | null
  institution_name: string | null
  institution_cnpj: string | null
  lab_name: string | null
  lab_area: string | null
  lab_served_public: string | null
  budget_items: Array<{ descricao: string; justificativa: string; valor_estimado: number }> | null
  technical_justification: string | null
  expected_results: string | null
  submitted_at: string
}

interface DocumentRow {
  id: number
  requirement_code: string
  original_filename: string | null
}

async function loadSubmission(id: number): Promise<SubmissionDetailRow | null> {
  return queryOne<SubmissionDetailRow>(
    `SELECT s.id, s.registration_id, s.status, r.full_name, r.cpf,
            s.team_description, s.institution_name, s.institution_cnpj,
            s.lab_name, s.lab_area, s.lab_served_public, s.budget_items,
            s.technical_justification, s.expected_results, s.submitted_at
     FROM edital_submissions s
     INNER JOIN registrations r ON r.id = s.registration_id
     WHERE s.id = $1 AND s.status = 'SUBMITTED'
     LIMIT 1`,
    [id]
  )
}

async function loadDocuments(submissionId: number): Promise<DocumentRow[]> {
  return query<DocumentRow>(
    `SELECT id, requirement_code, original_filename
     FROM edital_submission_documents
     WHERE submission_id = $1
     ORDER BY id`,
    [submissionId]
  )
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
}

export default async function AdminEditalDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const cookieStore = await cookies()
  const token = cookieStore.get(ADMIN_SESSION_COOKIE_NAME)?.value

  if (!verifyAdminSessionToken(token)) {
    redirect('/admin/login')
  }

  const { id } = await params
  const submissionId = Number.parseInt(id, 10)

  if (!Number.isFinite(submissionId)) {
    notFound()
  }

  const submission = await loadSubmission(submissionId)
  if (!submission) {
    notFound()
  }

  const documents = await loadDocuments(submission.id)
  const documentsByCode = new Map<string, DocumentRow[]>()
  for (const doc of documents) {
    const list = documentsByCode.get(doc.requirement_code) || []
    list.push(doc)
    documentsByCode.set(doc.requirement_code, list)
  }

  const photos = documentsByCode.get(EDITAL_PHOTO_DOCUMENT_CODE) || []

  return (
    <main className="flex-1 relative z-10 min-h-screen px-4 py-16">
      <div className="max-w-3xl mx-auto space-y-10">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">{submission.full_name}</h1>
          <p className="text-slate-400">
            CPF {submission.cpf} · Enviada em {new Date(submission.submitted_at).toLocaleString('pt-BR')}
          </p>
        </div>

        <section>
          <h2 className="text-lg font-bold text-white mb-4">Respostas</h2>
          <dl className="space-y-4">
            <div>
              <dt className="text-sm text-slate-400">Descrição da equipe</dt>
              <dd className="text-slate-200">{submission.team_description || '—'}</dd>
            </div>
            <div>
              <dt className="text-sm text-slate-400">Instituição</dt>
              <dd className="text-slate-200">
                {submission.institution_name || '—'} ({submission.institution_cnpj || 'CNPJ não informado'})
              </dd>
            </div>
            <div>
              <dt className="text-sm text-slate-400">Laboratório</dt>
              <dd className="text-slate-200">
                {submission.lab_name || '—'} — {submission.lab_area || '—'}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-slate-400">Público atendido pelo laboratório</dt>
              <dd className="text-slate-200">{submission.lab_served_public || '—'}</dd>
            </div>
            <div>
              <dt className="text-sm text-slate-400">Justificativa técnica</dt>
              <dd className="text-slate-200 whitespace-pre-wrap">{submission.technical_justification || '—'}</dd>
            </div>
            <div>
              <dt className="text-sm text-slate-400">Resultados esperados</dt>
              <dd className="text-slate-200 whitespace-pre-wrap">{submission.expected_results || '—'}</dd>
            </div>
            <div>
              <dt className="text-sm text-slate-400 mb-2">Itens de orçamento</dt>
              <dd>
                {!submission.budget_items || submission.budget_items.length === 0 ? (
                  <span className="text-slate-200">—</span>
                ) : (
                  <ul className="space-y-2">
                    {submission.budget_items.map((item, index) => (
                      <li key={index} className="bg-slate-900/40 rounded-xl p-3">
                        <p className="text-slate-200 font-medium">
                          {item.descricao} — {formatCurrency(item.valor_estimado)}
                        </p>
                        <p className="text-sm text-slate-400">{item.justificativa}</p>
                      </li>
                    ))}
                  </ul>
                )}
              </dd>
            </div>
          </dl>
        </section>

        <section>
          <h2 className="text-lg font-bold text-white mb-4">Documentos</h2>
          <ul className="space-y-3">
            {EDITAL_REQUIRED_DOCUMENT_CODES.map((code) => {
              const docsForCode = documentsByCode.get(code) || []
              const doc = docsForCode[0]
              return (
                <li key={code} className="bg-slate-900/40 rounded-xl p-4">
                  <p className="text-sm text-slate-400 mb-2">{EDITAL_DOCUMENT_LABELS[code]}</p>
                  {doc ? (
                    <iframe
                      src={`/api/editais/documento/${doc.id}/link`}
                      className="w-full h-64 rounded-lg border border-slate-700/50 bg-white"
                      title={EDITAL_DOCUMENT_LABELS[code]}
                    />
                  ) : (
                    <span className="text-slate-500">Não enviado</span>
                  )}
                </li>
              )
            })}
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-bold text-white mb-4">Fotos do laboratório</h2>
          {photos.length === 0 ? (
            <span className="text-slate-500">Não enviado</span>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {photos.map((photo) => (
                <a
                  key={photo.id}
                  href={`/api/editais/documento/${photo.id}/link`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block aspect-square rounded-xl overflow-hidden border border-slate-700/50"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`/api/editais/documento/${photo.id}/link`}
                    alt={photo.original_filename || 'Foto do laboratório'}
                    className="w-full h-full object-cover"
                  />
                </a>
              ))}
            </div>
          )}
        </section>

        <section>
          <h2 className="text-lg font-bold text-white mb-4">Certificado de inscrição na comunidade</h2>
          <a
            href={`/api/editais/certificado/${submission.registration_id}/link`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block px-6 py-3 bg-[#22AE84] hover:bg-[#1C8C6A] text-white rounded-2xl font-bold transition-all"
          >
            Ver certificado
          </a>
        </section>
      </div>
    </main>
  )
}
```

- [ ] **Step 2: Manual verification in the browser**

While logged in (cookie from Task 3/4), visit `http://localhost:3000/admin/editais/1` (submission `#1` from earlier real testing). Confirm: name/CPF/submitted date header render; all "Respostas" fields show real values (not `—`, since submission #1 has `Teste` in every field); the "Documentos" section shows an embedded PDF iframe for each of the 10 required codes (all present for submission #1); "Fotos do laboratório" shows a 4-photo thumbnail grid (submission #1 has 4 photos); clicking a photo opens it full-size in a new tab; "Ver certificado" opens the PDF in a new tab. Also visit `http://localhost:3000/admin/editais/99999` (nonexistent) and confirm Next's 404 page renders.

- [ ] **Step 3: Commit**

```bash
git add "app/admin/editais/[id]/page.tsx"
git commit -m "feat: adiciona detalhe de proposta no painel admin com preview de documentos e fotos"
```

---

### Task 6: Protect the document link routes with admin session

**Files:**
- Modify: `app/api/editais/documento/[id]/link/route.ts`
- Modify: `app/api/editais/certificado/[registrationId]/link/route.ts`

**Interfaces:**
- Consumes: `verifyAdminSessionToken`, `ADMIN_SESSION_COOKIE_NAME` (Task 1)

- [ ] **Step 1: Modify `app/api/editais/documento/[id]/link/route.ts`**

Replace the full file content:

```typescript
/**
 * GET /api/editais/documento/:id/link
 * Redirecionamento permanente para visualização de um documento do Edital PPI.
 * Gera uma URL assinada nova a cada acesso (nunca expira do ponto de vista de quem
 * usa o link), para uso em locais que precisam de um link estável — como o painel
 * admin e a planilha de acompanhamento do time interno. Protegido por sessão admin
 * (não pelo token do candidato — quem acessa aqui é o time revisando, não quem
 * submeteu a proposta).
 */

import { NextRequest, NextResponse } from 'next/server';
import { queryOne } from '@/lib/db';
import { getSignedFileUrl } from '@/lib/s3';
import { verifyAdminSessionToken, ADMIN_SESSION_COOKIE_NAME } from '@/lib/admin-auth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = request.cookies.get(ADMIN_SESSION_COOKIE_NAME)?.value;
    if (!verifyAdminSessionToken(token)) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { id } = await params;
    const documentId = Number.parseInt(id, 10);

    if (!Number.isFinite(documentId)) {
      return NextResponse.json({ error: 'Documento inválido' }, { status: 400 });
    }

    const document = await queryOne<{ s3_key: string }>(
      `SELECT s3_key
       FROM edital_submission_documents
       WHERE id = $1
       LIMIT 1`,
      [documentId]
    );

    if (!document) {
      return NextResponse.json({ error: 'Documento não encontrado' }, { status: 404 });
    }

    // Sem downloadFileName: abre em visualização inline no navegador (PDF/imagem),
    // já que este link é usado pelo time pra revisar o conteúdo, não pra baixar.
    const url = await getSignedFileUrl(document.s3_key, 300);

    return NextResponse.redirect(url, {
      status: 302,
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (error) {
    console.error('[editais-documento-link] Erro ao gerar link:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
```

- [ ] **Step 2: Modify `app/api/editais/certificado/[registrationId]/link/route.ts`**

Replace the full file content:

```typescript
/**
 * GET /api/editais/certificado/:registrationId/link
 * Redirecionamento permanente para o Certificado de Inscrição na Comunidade,
 * usado no painel admin e na planilha de acompanhamento do time interno.
 * Protegido por sessão admin.
 */

import { NextRequest, NextResponse } from 'next/server';
import { queryOne } from '@/lib/db';
import { getSignedFileUrl } from '@/lib/s3';
import { verifyAdminSessionToken, ADMIN_SESSION_COOKIE_NAME } from '@/lib/admin-auth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ registrationId: string }> }
) {
  try {
    const token = request.cookies.get(ADMIN_SESSION_COOKIE_NAME)?.value;
    if (!verifyAdminSessionToken(token)) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { registrationId } = await params;
    const id = Number.parseInt(registrationId, 10);

    if (!Number.isFinite(id)) {
      return NextResponse.json({ error: 'Cadastro inválido' }, { status: 400 });
    }

    const registration = await queryOne<{ community_certificate_s3_key: string | null }>(
      `SELECT community_certificate_s3_key
       FROM registrations
       WHERE id = $1
       LIMIT 1`,
      [id]
    );

    if (!registration?.community_certificate_s3_key) {
      return NextResponse.json({ error: 'Certificado não encontrado' }, { status: 404 });
    }

    const url = await getSignedFileUrl(registration.community_certificate_s3_key, 300);

    return NextResponse.redirect(url, {
      status: 302,
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (error) {
    console.error('[editais-certificado-link] Erro ao gerar link:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
```

- [ ] **Step 3: Manual verification against the running dev server**

```bash
# Sem cookie -> 401
curl -s -o /dev/null -w "sem sessao: %{http_code}\n" http://localhost:3000/api/editais/documento/1/link

# Com cookie de uma sessao admin valida -> 302
curl -s -o /dev/null -w "com sessao: %{http_code}\n" \
  --cookie "admin_session=<cole aqui o valor obtido no login do Task 2>" \
  http://localhost:3000/api/editais/documento/1/link
```

Expected: first call `401`; second call `302`. Also confirm in the browser (still logged into `/admin`) that the iframes/photos on `/admin/editais/1` (Task 5) still render correctly now that the routes require auth — same-browser cookie should carry over automatically.

- [ ] **Step 4: Commit**

```bash
git add "app/api/editais/documento/[id]/link/route.ts" "app/api/editais/certificado/[registrationId]/link/route.ts"
git commit -m "fix: exige sessao admin nas rotas publicas de link de documento do Edital"
```

---

### Task 7: End-to-end verification and CLAUDE.md update

**Files:**
- Modify: `CLAUDE.md`

**Interfaces:**
- Consumes: everything from Tasks 1–6

- [ ] **Step 1: Full manual walkthrough**

With `npm run dev` running and a fresh/incognito browser session:

1. Visit `/admin/editais` directly → redirected to `/admin/login`.
2. Log in with the wrong password → error shown, stays on page.
3. Log in with the correct `ADMIN_PASSWORD` → redirected to `/admin/editais`, submission `#1` listed.
4. Click into submission `#1` → detail page loads, all documents/photos/certificate render inline and open correctly.
5. `POST /api/admin/logout` (e.g. via a quick `fetch('/api/admin/logout', {method:'POST'})` in the browser console), then reload `/admin/editais` → redirected back to `/admin/login`.
6. Confirm `curl` (no cookie) against `/api/editais/documento/1/link` and `/api/editais/certificado/23/link` both return `401`.

- [ ] **Step 2: Add an "Admin panel" section to `CLAUDE.md`**

In `CLAUDE.md`, after the existing "### Edital (grant proposal) flow" section, add:

```markdown
### Admin panel (Edital submissions)

`/admin/login` → `/admin/editais` (list of `SUBMITTED` proposals) → `/admin/editais/[id]` (full detail: answers, inline document/photo preview). Protected by a **placeholder** shared-password session (`ADMIN_PASSWORD` + `ADMIN_TOKEN_SECRET`, HMAC-signed cookie via `lib/admin-auth.ts` — same pattern as `lib/edital-auth.ts`). Every protected page/route calls `verifyAdminSessionToken()` directly; there's no middleware-based gate (`middleware.ts` runs on the Edge runtime, which can't use Node's `crypto` module for HMAC verification). This placeholder is meant to be swapped for the Innovatis cross-platform user/tag system later — that swap only touches `lib/admin-auth.ts` and the login route.

The two document-link redirect routes (`/api/editais/documento/[id]/link`, `/api/editais/certificado/[registrationId]/link`) now require this same admin session — they were public before this feature, protected only by ID obscurity (matching `/api/documents/[id]`, which is *still* fully public — that asymmetry remains).
```

- [ ] **Step 3: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: documenta o painel admin do Edital em CLAUDE.md"
```

---

## Self-Review Notes

- **Spec coverage:** login/logout ✓ (Task 2), login page ✓ (Task 3), list page with name/institution/status/date ✓ (Task 4), detail page with all wizard fields + inline document/photo preview ✓ (Task 5), document routes gated ✓ (Task 6), 7-day TTL ✓ (Task 1), no middleware change ✓ (documented in Global Constraints), DRAFT submissions excluded from list and from direct detail access ✓ (both queries filter `status = 'SUBMITTED'`), "Não enviado" for missing documents/photos ✓ (Task 5).
- **Placeholder scan:** no TBD/TODO in any step; every code block is complete and runnable as written.
- **Type consistency:** `ADMIN_SESSION_COOKIE_NAME` and `verifyAdminSessionToken` (Task 1) are imported with identical names/signatures in Tasks 2, 4, 5, 6. `EDITAL_DOCUMENT_LABELS`, `EDITAL_REQUIRED_DOCUMENT_CODES`, `EDITAL_PHOTO_DOCUMENT_CODE` are imported from their real existing locations (`lib/edital-completeness.ts`, `lib/edital-requirements.ts`) with names matching current usage elsewhere in the codebase.
