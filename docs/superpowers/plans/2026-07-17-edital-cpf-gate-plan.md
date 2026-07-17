# Gate de validação de CPF para o Edital PPI — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the entry gate at `/edital` that validates a visitor's CPF against confirmed `registrations` rows before letting them proceed to the (future) Edital PPI submission form, issuing a short-lived signed token + prefill data on success.

**Architecture:** A new POST API route (`/api/editais/validar-cpf`) queries the existing `registrations` table (no new table), reusing `lib/security.ts` helpers for origin/rate-limit checks. On match it mints an HMAC-signed token via a new `lib/edital-auth.ts` module (no new dependency — native `crypto`, same style as `lib/utils.ts`). A new client-only route `/edital` renders a CPF-only form (`EditalCpfGate.tsx`) that calls the endpoint through a thin `lib/edital-api.ts` client, storing the token + prefill in `sessionStorage` on success or showing a blocking screen on 404.

**Tech Stack:** Next.js 15 App Router, TypeScript, `pg` via existing `lib/db.ts`, Node's native `crypto`, Tailwind (existing dark theme, `#22AE84` accent). No new npm dependencies.

**Source spec:** `docs/superpowers/specs/2026-07-15-edital-cpf-gate-design.md`

## Global Constraints

- No new database table or migration — query the existing `registrations` table only.
- Do not modify `/api/inscricoes` or its existing behavior.
- No new npm dependency — token signing uses Node's native `crypto` module (`createHmac`, `timingSafeEqual`), matching the style already used in `lib/utils.ts`.
- Reuse `lib/security.ts` helpers (`isTrustedOrigin`, `enforceRateLimit`, `applyNoStore`) instead of reimplementing origin/rate-limit checks.
- Rate limit for the new endpoint: bucket name `'edital-validar-cpf'`, **5 requests / 15 minutes** (stricter than `/api/inscricoes`'s 8/10min — this endpoint returns PII keyed by CPF, a higher-risk target for enumeration).
- Token TTL: **3600 seconds (1h)**.
- Client persists `{ token, prefill }` in `sessionStorage` (never `localStorage`) under key `'edital_session'`.
- API success/error responses never include CPF, document data/hash, fingerprint, IP, or user-agent from the original registration.
- `EDITAL_TOKEN_SECRET` must throw in production if unset; in development, fall back to a fixed insecure value with `console.warn`.
- **This repo has no automated test suite** (confirmed in `CLAUDE.md`). Every task's "test" steps are manual: `tsc --noEmit`, `npm run lint`, direct script execution via `npx tsx`, and manual `curl`/`Invoke-RestMethod`/browser verification — following the existing convention of `scripts/test-webhook.js` (a committed manual verification script, not an automated test).

---

### Task 1: Signed token module (`lib/edital-auth.ts`)

**Files:**
- Create: `lib/edital-auth.ts`
- Create: `scripts/test-edital-token.ts` (manual verification script, committed — same convention as `scripts/test-webhook.js`)
- Modify: `env.example` (add `EDITAL_TOKEN_SECRET`)
- Modify: `docker-compose.yml:38-39` (pass `EDITAL_TOKEN_SECRET` through to the container)

**Interfaces:**
- Produces: `createEditalToken(registrationId: number): string`
- Produces: `verifyEditalToken(token: string): number | null` — returns the `registrationId` on success, `null` on any failure (bad format, bad signature, expired, malformed payload). Never throws for malformed input.

- [ ] **Step 1: Write `lib/edital-auth.ts`**

```typescript
/**
 * Token assinado (HMAC-SHA256) para a sessão do gate de validação do Edital PPI.
 * Sem dependência nova: usa crypto nativo do Node, no mesmo estilo de lib/utils.ts.
 */

import * as crypto from 'crypto';

export interface EditalTokenPayload {
  registrationId: number;
  iat: number;
  exp: number;
}

const TOKEN_TTL_SECONDS = 60 * 60; // 1h
const DEV_FALLBACK_SECRET = 'dev-only-insecure-edital-secret-do-not-use-in-production';

function getSecret(): string {
  const secret = process.env.EDITAL_TOKEN_SECRET;

  if (secret) {
    return secret;
  }

  if (process.env.NODE_ENV === 'production') {
    throw new Error('EDITAL_TOKEN_SECRET não configurado em produção');
  }

  console.warn(
    '[edital-auth] EDITAL_TOKEN_SECRET ausente — usando segredo inseguro de desenvolvimento. ' +
    'Configure EDITAL_TOKEN_SECRET antes de ir para produção.'
  );
  return DEV_FALLBACK_SECRET;
}

function sign(encodedPayload: string): string {
  return crypto.createHmac('sha256', getSecret()).update(encodedPayload).digest('base64url');
}

export function createEditalToken(registrationId: number): string {
  const now = Math.floor(Date.now() / 1000);
  const payload: EditalTokenPayload = {
    registrationId,
    iat: now,
    exp: now + TOKEN_TTL_SECONDS,
  };

  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = sign(encodedPayload);
  return `${encodedPayload}.${signature}`;
}

export function verifyEditalToken(token: string): number | null {
  if (!token || typeof token !== 'string') {
    return null;
  }

  const parts = token.split('.');
  if (parts.length !== 2) {
    return null;
  }

  const [encodedPayload, signature] = parts;
  const expectedSignature = sign(encodedPayload);

  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);

  if (signatureBuffer.length !== expectedBuffer.length) {
    return null;
  }

  if (!crypto.timingSafeEqual(signatureBuffer, expectedBuffer)) {
    return null;
  }

  let payload: EditalTokenPayload;
  try {
    payload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf-8'));
  } catch {
    return null;
  }

  if (typeof payload.registrationId !== 'number' || typeof payload.exp !== 'number') {
    return null;
  }

  const now = Math.floor(Date.now() / 1000);
  if (payload.exp < now) {
    return null;
  }

  return payload.registrationId;
}
```

- [ ] **Step 2: Write the manual verification script `scripts/test-edital-token.ts`**

```typescript
/**
 * Script para testar o módulo lib/edital-auth.ts
 * Executar com: npx tsx scripts/test-edital-token.ts
 */

import { createEditalToken, verifyEditalToken } from '../lib/edital-auth';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ FALHOU: ${message}`);
    process.exitCode = 1;
    return;
  }
  console.log(`✅ ${message}`);
}

// 1. Round-trip válido
const token = createEditalToken(42);
const decoded = verifyEditalToken(token);
assert(decoded === 42, 'token válido decodifica para o registrationId original');

// 2. Token adulterado (assinatura não bate)
const [payloadPart] = token.split('.');
const tamperedToken = `${payloadPart}.assinatura-invalida`;
assert(verifyEditalToken(tamperedToken) === null, 'token com assinatura adulterada é rejeitado');

// 3. Payload adulterado (muda o registrationId mas mantém a assinatura antiga)
const fakePayload = Buffer.from(JSON.stringify({ registrationId: 999, iat: 0, exp: 9999999999 })).toString('base64url');
const [, originalSignature] = token.split('.');
const forgedToken = `${fakePayload}.${originalSignature}`;
assert(verifyEditalToken(forgedToken) === null, 'payload adulterado com assinatura antiga é rejeitado');

// 4. Formato inválido
assert(verifyEditalToken('token-sem-ponto') === null, 'token sem separador "." é rejeitado');
assert(verifyEditalToken('') === null, 'string vazia é rejeitada');

// 5. Token expirado — avança o relógio 2h além do TTL de 1h e confere que o token deixa de ser válido
const realDateNow = Date.now.bind(Date);
const twoHoursMs = 2 * 60 * 60 * 1000;
Date.now = () => realDateNow() + twoHoursMs;
try {
  assert(verifyEditalToken(token) === null, 'token expira depois de passado o TTL de 1h');
} finally {
  Date.now = realDateNow;
}

console.log('\nVerificação concluída.');
```

- [ ] **Step 3: Run the verification script**

Run: `npx tsx scripts/test-edital-token.ts`

Expected output: six `✅` lines and no `❌` lines, ending with "Verificação concluída." (exit code 0). If any line prints `❌`, stop and fix `lib/edital-auth.ts` before continuing — do not proceed to Task 2 with a broken token module.

- [ ] **Step 4: Add `EDITAL_TOKEN_SECRET` to `env.example`**

Add this block right after the `PUBLIC_BASE_URL` line in `env.example`:

```
# Segredo usado para assinar o token de sessão do gate do Edital PPI (HMAC-SHA256)
# Gere um valor aleatório forte, ex: openssl rand -hex 32
EDITAL_TOKEN_SECRET=troque-por-um-segredo-aleatorio-forte
```

- [ ] **Step 5: Wire `EDITAL_TOKEN_SECRET` into `docker-compose.yml`**

In `docker-compose.yml`, inside the `environment:` block, add a new line after `- PUBLIC_BASE_URL=${PUBLIC_BASE_URL:-https://comunidade.innovatismc.com}`:

```yaml
      - EDITAL_TOKEN_SECRET=${EDITAL_TOKEN_SECRET}
```

- [ ] **Step 6: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add lib/edital-auth.ts scripts/test-edital-token.ts env.example docker-compose.yml
git commit -m "feat: adiciona módulo de token assinado para o gate do Edital PPI"
```

---

### Task 2: API endpoint (`POST /api/editais/validar-cpf`)

**Files:**
- Create: `app/api/editais/validar-cpf/route.ts`

**Interfaces:**
- Consumes: `createEditalToken(registrationId: number): string` from `lib/edital-auth.ts` (Task 1)
- Consumes: `isValidCPF(cpf: string): boolean`, `calculateHash(text: string): string` from `lib/utils.ts` (existing)
- Consumes: `isTrustedOrigin(request: NextRequest): boolean`, `enforceRateLimit(request, bucket, maxRequests, windowMs): { allowed: boolean; retryAfterSeconds: number }`, `applyNoStore<T extends NextResponse>(response: T): T` from `lib/security.ts` (existing)
- Consumes: `queryOne<T>(text: string, params?: any[]): Promise<T | null>` from `lib/db.ts` (existing)
- Produces (response shapes, consumed by Task 3's `lib/edital-api.ts`):
  - `200`: `{ ok: true, token: string, prefill: { fullName: string, email: string | null, phone: string | null, profession: string | null, organization: string | null, cep: string | null, logradouro: string | null, numero: string | null, bairro: string | null, cidade: string | null, estado: string | null } }`
  - `400`: `{ error: string }` (invalid CPF format/checksum)
  - `403`: `{ error: string }` (untrusted origin)
  - `404`: `{ error: 'not_found' }` (no confirmed registration for this CPF, or honeypot triggered)
  - `429`: `{ error: string }` + `Retry-After` header (seconds)
  - `500`: `{ error: string }` (generic, no detail leaked)

- [ ] **Step 1: Write `app/api/editais/validar-cpf/route.ts`**

```typescript
/**
 * POST /api/editais/validar-cpf
 * Valida se um CPF corresponde a uma inscrição confirmada na comunidade InnovaNation
 * (registrations.terms_accepted = TRUE) antes de liberar o formulário do Edital PPI.
 */

import { NextRequest, NextResponse } from 'next/server';
import { queryOne } from '@/lib/db';
import { calculateHash, isValidCPF } from '@/lib/utils';
import { applyNoStore, enforceRateLimit, isTrustedOrigin } from '@/lib/security';
import { createEditalToken } from '@/lib/edital-auth';

interface RegistrationRow {
  id: number;
  full_name: string;
  email: string | null;
  phone: string | null;
  profession: string | null;
  organization: string | null;
  address_zip: string | null;
  address_street: string | null;
  address_number: string | null;
  address_neighborhood: string | null;
  address_city: string | null;
  address_state: string | null;
}

function jsonResponse(body: unknown, init?: ResponseInit) {
  return applyNoStore(NextResponse.json(body, init));
}

export async function POST(request: NextRequest) {
  try {
    if (!isTrustedOrigin(request)) {
      return jsonResponse({ error: 'Origem não autorizada' }, { status: 403 });
    }

    const rateLimit = enforceRateLimit(request, 'edital-validar-cpf', 5, 15 * 60 * 1000);
    if (!rateLimit.allowed) {
      return jsonResponse(
        { error: 'Muitas tentativas. Tente novamente em alguns minutos.' },
        {
          status: 429,
          headers: {
            'Retry-After': rateLimit.retryAfterSeconds.toString(),
          },
        }
      );
    }

    let body: { cpf?: unknown; website?: unknown };
    try {
      body = await request.json();
    } catch {
      return jsonResponse({ error: 'CPF inválido' }, { status: 400 });
    }

    const website = typeof body.website === 'string' ? body.website : '';
    if (website.trim().length > 0) {
      console.warn('[edital-validar-cpf] honeypot acionado');
      return jsonResponse({ error: 'not_found' }, { status: 404 });
    }

    const cpf = typeof body.cpf === 'string' ? body.cpf : '';
    if (!isValidCPF(cpf)) {
      return jsonResponse({ error: 'CPF inválido' }, { status: 400 });
    }

    const cleanCpf = cpf.replace(/\D/g, '');

    const registration = await queryOne<RegistrationRow>(
      `SELECT id, full_name, email, phone, profession, organization,
              address_zip, address_street, address_number, address_neighborhood,
              address_city, address_state
       FROM registrations
       WHERE cpf = $1 AND terms_accepted = TRUE
       LIMIT 1`,
      [cleanCpf]
    );

    if (!registration) {
      console.warn('[edital-validar-cpf] CPF não encontrado', { cpfHash: calculateHash(cleanCpf) });
      return jsonResponse({ error: 'not_found' }, { status: 404 });
    }

    const token = createEditalToken(registration.id);

    return jsonResponse({
      ok: true,
      token,
      prefill: {
        fullName: registration.full_name,
        email: registration.email,
        phone: registration.phone,
        profession: registration.profession,
        organization: registration.organization,
        cep: registration.address_zip,
        logradouro: registration.address_street,
        numero: registration.address_number,
        bairro: registration.address_neighborhood,
        cidade: registration.address_city,
        estado: registration.address_state,
      },
    });
  } catch (error) {
    console.error('[edital-validar-cpf] Erro ao validar CPF:', error);
    return jsonResponse({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Start the dev server**

Run: `npm run dev` (leave it running in a separate terminal/background process; note the port, typically `3000`)

- [ ] **Step 4: Seed one test registration row**

You need a `registrations` row with `terms_accepted = TRUE` and a real `terms_id`. Connect to the dev database (`psql` or your usual client) and run:

```sql
INSERT INTO registrations (
  full_name, cpf, email, phone, profession, organization,
  address_zip, address_street, address_number, address_neighborhood, address_city, address_state,
  terms_id, terms_accepted_at
)
VALUES (
  'Teste Gate Edital', '11144477735', 'teste.gate@example.com', '11999999999', 'Desenvolvedor', 'Innovatis',
  '01310100', 'Av. Paulista', '1000', 'Bela Vista', 'São Paulo', 'SP',
  (SELECT id FROM terms_of_use WHERE is_active = TRUE LIMIT 1), NOW()
);
```

(`11144477735` / `111.444.777-35` is a checksum-valid test CPF — verify with `isValidCPF` in `lib/utils.ts` if in doubt.)

- [ ] **Step 5: Manually verify each response code**

The rate limiter keys on IP + User-Agent (see `enforceRateLimit` in `lib/security.ts`), so give each scenario below its **own distinct `User-Agent` header** — otherwise all your manual `curl` calls share one rate-limit bucket and you'll trip the 429 test early. Run these against the running dev server (adjust `http://localhost:3000` if your dev server uses a different port):

```bash
# 200 — CPF encontrado
curl -i -X POST http://localhost:3000/api/editais/validar-cpf \
  -H "Content-Type: application/json" \
  -H "Origin: http://localhost:3000" \
  -H "User-Agent: edital-test-200" \
  -d '{"cpf":"111.444.777-35"}'
# Espera: HTTP 200, body com ok:true, token e prefill.fullName == "Teste Gate Edital"

# 404 — CPF não cadastrado (mas com checksum válido)
curl -i -X POST http://localhost:3000/api/editais/validar-cpf \
  -H "Content-Type: application/json" \
  -H "Origin: http://localhost:3000" \
  -H "User-Agent: edital-test-404" \
  -d '{"cpf":"529.982.247-25"}'
# Espera: HTTP 404, body {"error":"not_found"}

# 400 — CPF com formato/checksum inválido
curl -i -X POST http://localhost:3000/api/editais/validar-cpf \
  -H "Content-Type: application/json" \
  -H "Origin: http://localhost:3000" \
  -H "User-Agent: edital-test-400" \
  -d '{"cpf":"123"}'
# Espera: HTTP 400, body {"error":"CPF inválido"}

# 404 via honeypot — mesmo com CPF válido, o campo website preenchido bloqueia
curl -i -X POST http://localhost:3000/api/editais/validar-cpf \
  -H "Content-Type: application/json" \
  -H "Origin: http://localhost:3000" \
  -H "User-Agent: edital-test-honeypot" \
  -d '{"cpf":"111.444.777-35","website":"http://spamsite.example"}'
# Espera: HTTP 404, body {"error":"not_found"}

# 403 — origem não confiável
curl -i -X POST http://localhost:3000/api/editais/validar-cpf \
  -H "Content-Type: application/json" \
  -H "Origin: http://evil.example.com" \
  -H "User-Agent: edital-test-403" \
  -d '{"cpf":"111.444.777-35"}'
# Espera: HTTP 403

# 429 — rate limit, usando um User-Agent dedicado que não foi usado em nenhum teste acima
for i in 1 2 3 4 5 6; do
  curl -s -o /dev/null -w "%{http_code}\n" -X POST http://localhost:3000/api/editais/validar-cpf \
    -H "Content-Type: application/json" \
    -H "Origin: http://localhost:3000" \
    -H "User-Agent: edital-test-ratelimit" \
    -d '{"cpf":"111.444.777-35"}'
done
# Espera: as 5 primeiras chamadas retornam 200, a 6ª retorna 429 (e o corpo, se checado com -i, traz o header Retry-After)
```

- [ ] **Step 6: Clean up the test row**

```sql
DELETE FROM registrations WHERE cpf = '11144477735';
```

- [ ] **Step 7: Commit**

```bash
git add app/api/editais/validar-cpf/route.ts
git commit -m "feat: adiciona endpoint POST /api/editais/validar-cpf"
```

---

### Task 3: Frontend gate (`/edital`)

**Files:**
- Create: `lib/edital-api.ts`
- Create: `app/components/EditalCpfGate.tsx`
- Create: `app/edital/page.tsx`

**Interfaces:**
- Consumes: `POST /api/editais/validar-cpf` (Task 2) — request `{ cpf: string, website: string }`, response shapes as documented in Task 2.
- Produces: `validateCpfForEdital(cpf: string): Promise<EditalValidationSuccess>` and `EditalValidationError` class, both exported from `lib/edital-api.ts`, consumed by `EditalCpfGate.tsx`.

- [ ] **Step 1: Write `lib/edital-api.ts`**

```typescript
/**
 * Cliente API para o gate de validação de CPF do Edital PPI
 */

export interface EditalPrefill {
  fullName: string;
  email: string | null;
  phone: string | null;
  profession: string | null;
  organization: string | null;
  cep: string | null;
  logradouro: string | null;
  numero: string | null;
  bairro: string | null;
  cidade: string | null;
  estado: string | null;
}

export interface EditalValidationSuccess {
  ok: true;
  token: string;
  prefill: EditalPrefill;
}

export type EditalValidationReason =
  | 'invalid_cpf'
  | 'forbidden'
  | 'rate_limited'
  | 'not_found'
  | 'server_error';

export class EditalValidationError extends Error {
  status: number;
  reason: EditalValidationReason;
  retryAfterSeconds?: number;

  constructor(status: number, reason: EditalValidationReason, message: string, retryAfterSeconds?: number) {
    super(message);
    this.status = status;
    this.reason = reason;
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

export async function validateCpfForEdital(cpf: string): Promise<EditalValidationSuccess> {
  const response = await fetch('/api/editais/validar-cpf', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ cpf, website: '' }),
  });

  if (response.status === 404) {
    throw new EditalValidationError(404, 'not_found', 'CPF não encontrado');
  }

  if (response.status === 429) {
    const retryAfter = Number.parseInt(response.headers.get('Retry-After') || '0', 10);
    throw new EditalValidationError(
      429,
      'rate_limited',
      'Muitas tentativas. Tente novamente em alguns minutos.',
      retryAfter
    );
  }

  if (response.status === 403) {
    throw new EditalValidationError(403, 'forbidden', 'Origem não autorizada');
  }

  if (response.status === 400) {
    throw new EditalValidationError(400, 'invalid_cpf', 'CPF inválido');
  }

  if (!response.ok) {
    throw new EditalValidationError(response.status, 'server_error', 'Erro interno do servidor');
  }

  return response.json();
}
```

- [ ] **Step 2: Write `app/components/EditalCpfGate.tsx`**

```tsx
'use client'

import { useState } from 'react'
import Link from 'next/link'
import { CreditCard, Loader2, CheckCircle2, AlertCircle } from 'lucide-react'
import { validateCpfForEdital, EditalValidationError } from '@/lib/edital-api'

type GateState = 'idle' | 'validating' | 'blocked' | 'granted'

const SESSION_KEY = 'edital_session'

export default function EditalCpfGate() {
  const [state, setState] = useState<GateState>('idle')
  const [cpf, setCpf] = useState('')
  const [website, setWebsite] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [welcomeName, setWelcomeName] = useState('')

  const formatCPF = (value: string) => {
    const numbers = value.replace(/\D/g, '')
    if (numbers.length <= 11) {
      if (numbers.length <= 3) return numbers
      if (numbers.length <= 6) return numbers.replace(/(\d{3})(\d+)/, '$1.$2')
      if (numbers.length <= 9) return numbers.replace(/(\d{3})(\d{3})(\d+)/, '$1.$2.$3')
      return numbers.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
    }
    return value
  }

  const handleCpfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCpf(formatCPF(e.target.value))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage('')
    setState('validating')

    try {
      const result = await validateCpfForEdital(cpf)
      sessionStorage.setItem(SESSION_KEY, JSON.stringify({ token: result.token, prefill: result.prefill }))
      setWelcomeName(result.prefill.fullName)
      setState('granted')
    } catch (error) {
      if (error instanceof EditalValidationError && error.reason === 'not_found') {
        setState('blocked')
        return
      }

      if (error instanceof EditalValidationError && error.reason === 'rate_limited') {
        setErrorMessage('Muitas tentativas. Tente novamente em alguns minutos.')
      } else if (error instanceof EditalValidationError && error.reason === 'invalid_cpf') {
        setErrorMessage('CPF inválido. Confira os números e tente novamente.')
      } else {
        setErrorMessage('Não foi possível validar seu CPF agora. Tente novamente em instantes.')
      }
      setState('idle')
    }
  }

  const handleTryAnotherCpf = () => {
    setCpf('')
    setErrorMessage('')
    setState('idle')
  }

  if (state === 'blocked') {
    return (
      <div className="bg-slate-900/40 backdrop-blur-xl rounded-[2.5rem] p-8 sm:p-12 border border-slate-800 shadow-2xl text-center">
        <AlertCircle className="w-12 h-12 text-amber-400 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-white mb-3">
          Não encontramos uma inscrição confirmada com esse CPF na comunidade InnovaNation
        </h2>
        <p className="text-slate-300 mb-8">
          Para submeter uma proposta ao Edital PPI, você precisa primeiro concluir sua inscrição
          na comunidade InnovaNation.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/#formulario"
            className="px-6 py-4 bg-[#22AE84] hover:bg-[#1C8C6A] text-white rounded-2xl font-bold transition-all text-center"
          >
            Fazer minha inscrição
          </Link>
          <button
            type="button"
            onClick={handleTryAnotherCpf}
            className="px-6 py-4 border border-slate-700/50 text-slate-200 rounded-2xl font-bold hover:border-[#22AE84] transition-all"
          >
            Tentar outro CPF
          </button>
        </div>
      </div>
    )
  }

  if (state === 'granted') {
    return (
      <div className="bg-slate-900/40 backdrop-blur-xl rounded-[2.5rem] p-8 sm:p-12 border border-slate-800 shadow-2xl text-center">
        <CheckCircle2 className="w-12 h-12 text-[#22AE84] mx-auto mb-4" />
        <h2 className="text-xl font-bold text-white mb-3">
          Bem-vindo(a), {welcomeName}!
        </h2>
        <p className="text-slate-300 mb-8">
          Seu cadastro na comunidade InnovaNation foi confirmado. As próximas etapas do
          formulário do Edital PPI estarão disponíveis em breve.
        </p>
        <button
          type="button"
          disabled
          className="px-6 py-4 bg-slate-700 text-slate-400 rounded-2xl font-bold cursor-not-allowed"
        >
          Continuar
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="bg-slate-900/40 backdrop-blur-xl rounded-[2.5rem] p-8 sm:p-12 border border-slate-800 shadow-2xl">
      <div className="hidden" aria-hidden="true">
        <label htmlFor="website">Website</label>
        <input
          type="text"
          id="website"
          name="website"
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
          tabIndex={-1}
          autoComplete="off"
        />
      </div>

      <h2 className="text-xl font-bold text-white mb-2">Edital PPI 2026</h2>
      <p className="text-slate-400 mb-8">
        Informe o CPF usado na sua inscrição da comunidade InnovaNation para continuar.
      </p>

      <label htmlFor="cpf" className="block text-sm font-bold text-slate-100 mb-3 ml-1">
        <CreditCard className="inline w-4 h-4 mr-2 text-[#22AE84]" />
        CPF
      </label>
      <input
        type="text"
        id="cpf"
        name="cpf"
        value={cpf}
        onChange={handleCpfChange}
        placeholder="000.000.000-00"
        maxLength={14}
        required
        className="w-full px-6 py-4 bg-slate-900/60 border border-slate-700/50 rounded-2xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#22AE84]/30 focus:border-[#22AE84] transition-all font-medium"
      />

      {errorMessage && (
        <p className="mt-4 text-sm text-red-400 font-medium">{errorMessage}</p>
      )}

      <button
        type="submit"
        disabled={state === 'validating' || cpf.replace(/\D/g, '').length !== 11}
        className="mt-8 w-full px-6 py-4 bg-[#22AE84] hover:bg-[#1C8C6A] disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-2xl font-bold transition-all flex items-center justify-center gap-2"
      >
        {state === 'validating' && <Loader2 className="w-5 h-5 animate-spin" />}
        {state === 'validating' ? 'Validando...' : 'Continuar'}
      </button>
    </form>
  )
}
```

- [ ] **Step 3: Write `app/edital/page.tsx`**

```tsx
import type { Metadata } from 'next'
import EditalCpfGate from '../components/EditalCpfGate'

export const metadata: Metadata = {
  title: 'Edital PPI 2026 | InnovaNation',
  description: 'Confirme sua inscrição na comunidade InnovaNation para submeter sua proposta ao Edital PPI.',
}

export default function EditalPage() {
  return (
    <main className="flex-1 relative z-10 min-h-screen flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-xl">
        <EditalCpfGate />
      </div>
    </main>
  )
}
```

- [ ] **Step 4: Type-check and lint**

Run: `npx tsc --noEmit`
Expected: no errors.

Run: `npm run lint`
Expected: no errors (warnings pre-existing elsewhere in the repo are fine, but nothing new from these 3 files).

- [ ] **Step 5: Manual browser verification**

With the dev server running (`npm run dev`) and the same test row from Task 2 Step 4 re-inserted (re-run that `INSERT` if you already cleaned it up):

1. Open `http://localhost:3000/edital`.
2. Type an invalid CPF (e.g. `123.456.789-00`) and submit — confirm the inline error "CPF inválido. Confira os números e tente novamente." appears and the form stays on the input screen.
3. Type a checksum-valid but unregistered CPF (e.g. `529.982.247-25`) and submit — confirm the screen switches to the blocked state with the message "Não encontramos uma inscrição confirmada com esse CPF na comunidade InnovaNation", a "Fazer minha inscrição" button linking to `/#formulario`, and a "Tentar outro CPF" button that returns to the input screen.
4. Type the test CPF `111.444.777-35` and submit — confirm the screen switches to "Bem-vindo(a), Teste Gate Edital!" and the "Continuar" button is visibly disabled.
5. Open browser DevTools → Application → Session Storage → `http://localhost:3000` → confirm a key `edital_session` exists with a JSON value containing `token` and `prefill.fullName == "Teste Gate Edital"`.
6. Close the tab and reopen `http://localhost:3000/edital` in a new tab — confirm `edital_session` is gone from Session Storage (proves it's tab/session-scoped, not `localStorage`).

- [ ] **Step 6: Clean up the test row again**

```sql
DELETE FROM registrations WHERE cpf = '11144477735';
```

- [ ] **Step 7: Commit**

```bash
git add lib/edital-api.ts app/components/EditalCpfGate.tsx app/edital/page.tsx
git commit -m "feat: adiciona rota /edital com gate de validação de CPF"
```

---

## Self-Review Notes

- **Spec coverage:** every section of `docs/superpowers/specs/2026-07-15-edital-cpf-gate-design.md` maps to a task — token design → Task 1; API contract, validation order, query, security mitigations → Task 2; front-end states/flow/sessionStorage → Task 3. The "Fora de escopo" section (steps 2..N of the Typeform, auto-generated "Termo de Comprovação", admin/homologação screens) is intentionally not covered by any task here.
- **Placeholder scan:** no TBD/TODO markers; every step has complete, runnable code or exact commands.
- **Type consistency:** `EditalPrefill` fields in `lib/edital-api.ts` (Task 3) match the `prefill` object shape returned by the route in Task 2 field-for-field (`fullName`, `email`, `phone`, `profession`, `organization`, `cep`, `logradouro`, `numero`, `bairro`, `cidade`, `estado`). `createEditalToken`/`verifyEditalToken` signatures in Task 1 match their usage in Task 2 (`createEditalToken(registration.id)`, no direct call to `verifyEditalToken` yet since token verification for subsequent steps is explicitly out of scope per the spec — only issuance is needed here).
