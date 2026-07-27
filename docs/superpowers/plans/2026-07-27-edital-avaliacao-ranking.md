# Avaliação e Ranking de Propostas do Edital PPI — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let the internal team score submitted Edital PPI proposals against the official 7-criteria rubric, see a ranking sorted by score, disqualify/reject a proposal with a reason (reversible), and replace the placeholder single-password admin login with real per-user login against the shared Innovatis `users` table.

**Architecture:** Evaluation/disqualification data lives as nullable columns directly on `edital_submissions` (no new `status` value) — the three admin-panel tabs (Sem avaliação / Ranking / Rejeitadas) are pure `WHERE`-clause derivations of those columns. Three new admin-session-gated API routes (`avaliacao`, `desqualificar`, `requalificar`) do the writes; a single client component (`SubmissionActions`) on the detail page owns both action buttons and their modals. Separately, `lib/admin-auth.ts`'s session token grows an embedded, signed identity (`{userId, username, name}`) sourced at login time from a **second, read-only** Postgres connection (`lib/platforms-db.ts`) to the shared `users` table (same RDS instance, different database) — this is what lets `evaluated_by`/`disqualified_by` be pulled from the session instead of typed free text.

**Tech Stack:** Next.js 15 App Router, Postgres (`pg`, two pools: `lib/db.ts` existing + `lib/platforms-db.ts` new), `bcryptjs` (new dependency, pure JS — no native binary, same reasoning as this project's earlier `pdf-to-img` choice re: Docker Alpine/arm64 compatibility).

## Global Constraints

- No automated test framework exists in this repo (documented, intentional convention). Every task's verification step is a **manual check**: a throwaway `tsx` script (written, run, then deleted) for pure logic, or `curl`/browser against the running `npm run dev` server for HTTP-facing behavior.
- Do **not** modify `lib/security-headers.ts` or `middleware.ts`.
- The 7 evaluation criteria, their codes, labels, and max points (summing to 100) are fixed by the edital and must match exactly — see Task 1.
- Approval threshold from the edital: 70 points. This is used **only** as a visual indicator in the ranking (a green badge) — never as an automatic approve/reject gate. Final approval is a human decision outside this system.
- `edital_submissions.status` (`DRAFT`/`SUBMITTED`) must **not** change meaning or gain new values — other code (the draft-lock in `rascunho`) depends on it staying exactly as-is. Tab membership is derived from the new evaluation/disqualification columns instead.
- **The shared `users` table (`PLATFORMS_DB_*`) is a live production system used by other Innovatis platforms (innovacoin, financeiro, powerbi, etc.) — this project only ever reads from it.** No task in this plan writes to it. In particular: do **not** add or remove the `edital-admin` tag from any real account's `platforms` array yourself, even temporarily for testing — that decision belongs to the human running this plan. Task 4 explicitly defers positive-path login testing for this reason; Task 10's full end-to-end walkthrough requires a human to have granted the tag first.
- `.env` already has real, working `PLATFORMS_DB_HOST/PORT/NAME/USER/PASSWORD/SSL` values filled in (confirmed working during planning — the shared database was inspected read-only to learn its schema). `env.example` needs the same variables as a documented template with placeholder values.
- Match existing Portuguese UI copy and code-comment conventions, and the dark-theme Tailwind palette already used throughout `/admin/*` (`bg-slate-900/40`, `border-slate-800`, accent `#22AE84`).
- This is a new feature, not a continuation of an already-open PR (the prior admin-panel PRs #10 and #11 are both merged) — start from a fresh branch/worktree off current `develop`.

---

### Task 1: Evaluation criteria constants + validation helper

**Files:**
- Create: `lib/edital-evaluation.ts`

**Interfaces:**
- Produces: `EDITAL_EVALUATION_CRITERIA: EditalEvaluationCriterion[]`, `EDITAL_EVALUATION_MAX_TOTAL: number`, `EDITAL_APPROVAL_MIN_SCORE: number`, `validateEvaluationScores(scores: Record<string, unknown>): { valid: boolean; total: number; error?: string }`

- [ ] **Step 1: Write the file**

```typescript
/**
 * Critérios oficiais de avaliação do Edital PPI (item 10.2 do edital), usados
 * tanto no modal de avaliação do painel admin (client) quanto na validação
 * da rota que salva a nota (server) — por isso este arquivo não importa nada
 * específico de servidor (banco, fs, etc), só dados e uma função pura.
 */

export interface EditalEvaluationCriterion {
  code: string;
  label: string;
  maxPoints: number;
}

export const EDITAL_EVALUATION_CRITERIA: EditalEvaluationCriterion[] = [
  { code: 'clareza_diagnostico', label: 'Clareza do diagnóstico e da necessidade apresentada', maxPoints: 15 },
  { code: 'potencial_impacto', label: 'Potencial de impacto acadêmico, educacional, social, tecnológico ou institucional', maxPoints: 20 },
  { code: 'viabilidade_tecnica', label: 'Viabilidade técnica, operacional e financeira da proposta', maxPoints: 20 },
  { code: 'coerencia_plano', label: 'Coerência do Plano de Aplicação dos recursos', maxPoints: 20 },
  { code: 'sustentabilidade', label: 'Sustentabilidade da melhoria após o patrocínio', maxPoints: 10 },
  { code: 'potencial_visibilidade', label: 'Potencial de visibilidade institucional e qualidade da contrapartida de divulgação', maxPoints: 10 },
  { code: 'aderencia_missao', label: 'Aderência à missão, valores e áreas de atuação da Innovatis', maxPoints: 5 },
];

export const EDITAL_EVALUATION_MAX_TOTAL = EDITAL_EVALUATION_CRITERIA.reduce(
  (sum, criterion) => sum + criterion.maxPoints,
  0
);

export const EDITAL_APPROVAL_MIN_SCORE = 70;

export interface EvaluationValidationResult {
  valid: boolean;
  total: number;
  error?: string;
}

export function validateEvaluationScores(scores: Record<string, unknown>): EvaluationValidationResult {
  let total = 0;

  for (const criterion of EDITAL_EVALUATION_CRITERIA) {
    const value = scores[criterion.code];

    if (typeof value !== 'number' || !Number.isInteger(value)) {
      return { valid: false, total: 0, error: `Nota inválida para "${criterion.label}"` };
    }

    if (value < 0 || value > criterion.maxPoints) {
      return {
        valid: false,
        total: 0,
        error: `A nota de "${criterion.label}" deve estar entre 0 e ${criterion.maxPoints}`,
      };
    }

    total += value;
  }

  return { valid: true, total };
}
```

- [ ] **Step 2: Manual verification**

Create a throwaway file `_test-evaluation.ts` at the project root:

```typescript
import { EDITAL_EVALUATION_CRITERIA, EDITAL_EVALUATION_MAX_TOTAL, validateEvaluationScores } from './lib/edital-evaluation';

console.log('Total de critérios (deve ser 7):', EDITAL_EVALUATION_CRITERIA.length);
console.log('Soma máxima (deve ser 100):', EDITAL_EVALUATION_MAX_TOTAL);

const allMax = Object.fromEntries(EDITAL_EVALUATION_CRITERIA.map((c) => [c.code, c.maxPoints]));
console.log('Todas no máximo:', validateEvaluationScores(allMax));

const missing = { clareza_diagnostico: 10 };
console.log('Critério faltando (valid deve ser false):', validateEvaluationScores(missing));

const outOfRange = { ...allMax, clareza_diagnostico: 999 };
console.log('Fora do intervalo (valid deve ser false):', validateEvaluationScores(outOfRange));

const notInteger = { ...allMax, clareza_diagnostico: 3.5 };
console.log('Não inteiro (valid deve ser false):', validateEvaluationScores(notInteger));
```

Run: `npx tsx _test-evaluation.ts`

Expected: `7`, `100`, `{ valid: true, total: 100 }`, then three `{ valid: false, ... }` results with descriptive `error` messages.

- [ ] **Step 3: Delete the throwaway script**

```bash
rm _test-evaluation.ts
```

- [ ] **Step 4: Commit**

```bash
git add lib/edital-evaluation.ts
git commit -m "feat: adiciona criterios de avaliacao do edital PPI"
```

---

### Task 2: Database migration for evaluation and disqualification

**Files:**
- Create: `database/migrations/012_add_edital_evaluation.sql`
- Modify: `run-migration.js`

**Interfaces:**
- Produces: `edital_submissions.evaluation_scores` (JSONB), `evaluation_total_score` (SMALLINT), `evaluated_by` (VARCHAR), `evaluated_at` (TIMESTAMPTZ), `disqualified_at` (TIMESTAMPTZ), `disqualified_reason` (TEXT), `disqualified_by` (VARCHAR) — all nullable

- [ ] **Step 1: Write the migration**

```sql
-- Migration: Avaliação e desqualificação de propostas do Edital PPI
-- Data: 2026-07-27
-- Descrição: colunas para registrar a avaliação interna (nota por critério,
-- nota final) e a desqualificação manual (com motivo) de cada proposta.
-- Não introduz um novo valor de status — a aba/classificação de cada
-- proposta no painel admin é derivada destas colunas (ver CLAUDE.md).

ALTER TABLE edital_submissions ADD COLUMN IF NOT EXISTS evaluation_scores JSONB;
ALTER TABLE edital_submissions ADD COLUMN IF NOT EXISTS evaluation_total_score SMALLINT;
ALTER TABLE edital_submissions ADD COLUMN IF NOT EXISTS evaluated_by VARCHAR(255);
ALTER TABLE edital_submissions ADD COLUMN IF NOT EXISTS evaluated_at TIMESTAMPTZ;
ALTER TABLE edital_submissions ADD COLUMN IF NOT EXISTS disqualified_at TIMESTAMPTZ;
ALTER TABLE edital_submissions ADD COLUMN IF NOT EXISTS disqualified_reason TEXT;
ALTER TABLE edital_submissions ADD COLUMN IF NOT EXISTS disqualified_by VARCHAR(255);

CREATE INDEX IF NOT EXISTS idx_edital_submissions_evaluation_total_score ON edital_submissions(evaluation_total_score);
CREATE INDEX IF NOT EXISTS idx_edital_submissions_disqualified_at ON edital_submissions(disqualified_at);

COMMENT ON COLUMN edital_submissions.evaluation_scores IS 'Notas por critério de avaliação (item 10.2 do edital), objeto JSON {codigo_criterio: nota}. NULL até a primeira avaliação.';
COMMENT ON COLUMN edital_submissions.evaluation_total_score IS 'Soma das notas em evaluation_scores (0-100), persistida separadamente para permitir ORDER BY no ranking sem calcular o JSONB.';
COMMENT ON COLUMN edital_submissions.evaluated_by IS 'Nome de quem registrou a avaliação (da sessão do painel admin, tabela users compartilhada).';
COMMENT ON COLUMN edital_submissions.disqualified_at IS 'Quando a proposta foi desqualificada manualmente pelo time. NULL se nunca foi desqualificada ou se a desqualificação foi revertida.';
COMMENT ON COLUMN edital_submissions.disqualified_reason IS 'Motivo informado ao desqualificar. Obrigatório no momento da desqualificação, mas limpo ao reverter.';
COMMENT ON COLUMN edital_submissions.disqualified_by IS 'Nome de quem desqualificou a proposta (da sessão do painel admin).';
```

- [ ] **Step 2: Add it to `run-migration.js`**

In `run-migration.js`, add the new file to the `migrations` array (after the existing last entry):

```javascript
    const migrations = [
      'database/migrations/008_add_extra_legal_fields.sql',
      'database/migrations/008_add_address_fields.sql',
      'database/migrations/009_create_edital_submissions.sql',
      'database/migrations/010_add_community_certificate_to_registrations.sql',
      'database/migrations/011_add_thumbnail_support.sql',
      'database/migrations/012_add_edital_evaluation.sql'
    ];
```

- [ ] **Step 3: Apply the migration**

This project's migrations are applied by hand (no migration-state tracking, per `CLAUDE.md`). Run this against the connected database directly, since `npm run migrate` would fail by trying to re-run the already-applied earlier migrations in the list:

```bash
node -e "
require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
(async () => {
  const sql = fs.readFileSync('database/migrations/012_add_edital_evaluation.sql', 'utf8');
  await pool.query(sql);
  console.log('Migration 012 aplicada com sucesso.');
  await pool.end();
})().catch(e => { console.error('Erro:', e.message); process.exit(1); });
"
```

- [ ] **Step 4: Verify the columns exist**

```bash
node -e "
require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
(async () => {
  const res = await pool.query(\"SELECT column_name FROM information_schema.columns WHERE table_name='edital_submissions' AND column_name IN ('evaluation_scores','evaluation_total_score','evaluated_by','evaluated_at','disqualified_at','disqualified_reason','disqualified_by') ORDER BY column_name\");
  console.table(res.rows);
  await pool.end();
})();
"
```

Expected: 7 rows returned.

- [ ] **Step 5: Commit**

```bash
git add database/migrations/012_add_edital_evaluation.sql run-migration.js
git commit -m "feat: adiciona colunas de avaliacao e desqualificacao de propostas"
```

---

### Task 3: Read-only connection to the shared platforms database

**Files:**
- Create: `lib/platforms-db.ts`

**Interfaces:**
- Produces: `findPlatformUserByUsername(username: string): Promise<PlatformUserRow | null>`, `interface PlatformUserRow { id: number; username: string | null; name: string; hash: string; platforms: string[] | null }`

- [ ] **Step 1: Write the file**

```typescript
/**
 * Pool de conexão somente-leitura para o banco compartilhado de
 * usuários/plataformas da Innovatis (mesmo RDS deste projeto, database
 * separado — ver PLATFORMS_DB_* no .env). Usado só pelo login do painel
 * admin (app/api/admin/login/route.ts) para checar usuário/senha/tag de
 * acesso — este projeto nunca escreve na tabela `users`.
 */

import { Pool } from 'pg';

const platformsPool = new Pool({
  host: process.env.PLATFORMS_DB_HOST,
  port: parseInt(process.env.PLATFORMS_DB_PORT || '5432'),
  database: process.env.PLATFORMS_DB_NAME,
  user: process.env.PLATFORMS_DB_USER,
  password: process.env.PLATFORMS_DB_PASSWORD,
  ssl: process.env.PLATFORMS_DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  max: 5,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

platformsPool.on('error', (err) => {
  console.error('❌ Erro inesperado no pool do banco de plataformas:', err);
});

export interface PlatformUserRow {
  id: number;
  username: string | null;
  name: string;
  hash: string;
  platforms: string[] | null;
}

export async function findPlatformUserByUsername(username: string): Promise<PlatformUserRow | null> {
  const result = await platformsPool.query<PlatformUserRow>(
    `SELECT id, username, name, hash, platforms
     FROM users
     WHERE LOWER(username) = LOWER($1)
     LIMIT 1`,
    [username]
  );

  return result.rows[0] || null;
}
```

Note the `connectionTimeoutMillis: 10000` (not the default): this connects to the same remote RDS host as `lib/db.ts`, which was found during planning to have noticeable latency from a local dev machine — `lib/db.ts` was bumped to the same value for the same reason.

- [ ] **Step 2: Manual verification**

First, find a real username to test with (any row in the table works):

```bash
node -e "
require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ host: process.env.PLATFORMS_DB_HOST, port: parseInt(process.env.PLATFORMS_DB_PORT), database: process.env.PLATFORMS_DB_NAME, user: process.env.PLATFORMS_DB_USER, password: process.env.PLATFORMS_DB_PASSWORD, ssl: process.env.PLATFORMS_DB_SSL === 'true' ? { rejectUnauthorized: false } : false });
(async () => {
  const res = await pool.query('SELECT username FROM users LIMIT 1');
  console.log('username de teste:', res.rows[0].username);
  await pool.end();
})();
"
```

Then create a throwaway file `_test-platforms-db.ts` at the project root, replacing `SEU_USERNAME_DE_TESTE` with the value just printed:

```typescript
import { findPlatformUserByUsername } from './lib/platforms-db';

(async () => {
  const user = await findPlatformUserByUsername('SEU_USERNAME_DE_TESTE');
  console.log('Usuário encontrado:', user ? { id: user.id, name: user.name, platforms: user.platforms } : null);

  const missing = await findPlatformUserByUsername('usuario-que-nao-existe-123456');
  console.log('Usuário inexistente deve ser null:', missing);
})().catch((e) => {
  console.error('FALHOU:', e);
  process.exit(1);
});
```

Run: `npx tsx _test-platforms-db.ts`

Expected: first line shows real `id`/`name`/`platforms` (an array of strings); second line shows `null`. **Do not print or paste the `hash` value anywhere** — it's a real password hash, even though bcrypt hashes aren't reversible, treat it as sensitive.

- [ ] **Step 3: Delete the throwaway script**

```bash
rm _test-platforms-db.ts
```

- [ ] **Step 4: Commit**

```bash
git add lib/platforms-db.ts
git commit -m "feat: adiciona conexao somente leitura ao banco de usuarios compartilhado"
```

---

### Task 4: Real per-user admin sessions (replaces the single shared password)

**Files:**
- Modify: `lib/admin-auth.ts`
- Modify: `app/api/admin/login/route.ts`
- Modify: `app/admin/login/page.tsx`
- Modify: `env.example`
- Modify: `.env`
- Modify: `package.json` (add `bcryptjs`, `@types/bcryptjs`)

**Interfaces:**
- Consumes: `findPlatformUserByUsername` (Task 3)
- Produces: `AdminSessionIdentity { userId: number; username: string; name: string }`, `createAdminSessionToken(identity: AdminSessionIdentity): string`, `verifyAdminSessionToken(token: string | undefined | null): AdminSessionIdentity | null` (was `boolean` — every existing caller only ever does `if (!verifyAdminSessionToken(token))`, which behaves identically for `null` as it did for `false`, so no other file needs to change for this alone)

- [ ] **Step 1: Install dependencies**

```bash
npm install bcryptjs
npm install -D @types/bcryptjs
```

- [ ] **Step 2: Rewrite `lib/admin-auth.ts`**

```typescript
/**
 * Token assinado (HMAC-SHA256) para a sessão do painel admin, carregando a
 * identidade de quem logou (id/username/name da tabela `users` compartilhada
 * — ver lib/platforms-db.ts). Antes, este token não carregava identidade e
 * validava só uma senha única (ADMIN_PASSWORD); esse esquema foi removido.
 */

import * as crypto from 'crypto';

export const ADMIN_SESSION_COOKIE_NAME = 'admin_session';

export interface AdminSessionIdentity {
  userId: number;
  username: string;
  name: string;
}

interface AdminTokenPayload extends AdminSessionIdentity {
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

export function createAdminSessionToken(identity: AdminSessionIdentity): string {
  const now = Math.floor(Date.now() / 1000);
  const payload: AdminTokenPayload = {
    ...identity,
    iat: now,
    exp: now + TOKEN_TTL_SECONDS,
  };

  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = sign(encodedPayload);
  return `${encodedPayload}.${signature}`;
}

export function verifyAdminSessionToken(token: string | undefined | null): AdminSessionIdentity | null {
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

  let payload: AdminTokenPayload;
  try {
    payload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf-8'));
  } catch {
    return null;
  }

  if (
    typeof payload.exp !== 'number' ||
    typeof payload.userId !== 'number' ||
    typeof payload.name !== 'string'
  ) {
    return null;
  }

  const now = Math.floor(Date.now() / 1000);
  if (payload.exp < now) {
    return null;
  }

  return { userId: payload.userId, username: payload.username, name: payload.name };
}
```

- [ ] **Step 3: Rewrite `app/api/admin/login/route.ts`**

```typescript
/**
 * POST /api/admin/login
 * Autentica o time interno no painel admin contra a tabela `users`
 * compartilhada entre plataformas Innovatis (lib/platforms-db.ts) — só
 * usuários com a tag "edital-admin" em `platforms` entram.
 */

import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { applyNoStore, enforceRateLimit, isTrustedOrigin } from '@/lib/security';
import { createAdminSessionToken, ADMIN_SESSION_COOKIE_NAME } from '@/lib/admin-auth';
import { findPlatformUserByUsername } from '@/lib/platforms-db';

const REQUIRED_PLATFORM_TAG = 'edital-admin';

function jsonResponse(body: unknown, init?: ResponseInit) {
  return applyNoStore(NextResponse.json(body, init));
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

    let body: { username?: unknown; password?: unknown };
    try {
      body = await request.json();
    } catch {
      return jsonResponse({ error: 'Requisição inválida' }, { status: 400 });
    }

    const username = typeof body.username === 'string' ? body.username.trim() : '';
    const password = typeof body.password === 'string' ? body.password : '';

    if (!username || !password) {
      return jsonResponse({ error: 'Credenciais inválidas ou sem acesso a este painel' }, { status: 401 });
    }

    const genericError = () =>
      jsonResponse({ error: 'Credenciais inválidas ou sem acesso a este painel' }, { status: 401 });

    const user = await findPlatformUserByUsername(username);
    if (!user || !(user.platforms || []).includes(REQUIRED_PLATFORM_TAG)) {
      return genericError();
    }

    const passwordMatches = await bcrypt.compare(password, user.hash);
    if (!passwordMatches) {
      return genericError();
    }

    const token = createAdminSessionToken({
      userId: user.id,
      username: user.username || username,
      name: user.name,
    });
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

- [ ] **Step 4: Rewrite `app/admin/login/page.tsx`**

```typescript
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { User, Lock, Loader2, AlertCircle } from 'lucide-react'

export default function AdminLoginPage() {
  const router = useRouter()
  const [username, setUsername] = useState('')
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
        body: JSON.stringify({ username, password }),
      })

      if (response.status === 401) {
        setError('Usuário, senha ou permissão de acesso inválidos.')
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
        <p className="text-slate-400 mb-8">Entre com seu usuário da Innovatis para acessar o painel do Edital PPI.</p>

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

        {error && (
          <div className="mt-4 flex items-center gap-2 text-sm text-red-400 font-medium">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <button
          type="submit"
          disabled={loading || username.length === 0 || password.length === 0}
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

- [ ] **Step 5: Remove `ADMIN_PASSWORD`**

In `.env`, delete the `ADMIN_PASSWORD=...` line (keep `ADMIN_TOKEN_SECRET`).

In `env.example`, delete the `ADMIN_PASSWORD=your-admin-password` line (keep `ADMIN_TOKEN_SECRET` and its comment, just drop the `ADMIN_PASSWORD` line and update the remaining comment above it to no longer describe a "senha única compartilhada").

- [ ] **Step 6: Confirm no other file needs changes**

```bash
grep -rn "ADMIN_PASSWORD" --include="*.ts" --include="*.tsx" .
grep -rn "verifyAdminSessionToken" --include="*.ts" --include="*.tsx" app lib
```

Expected: first command returns nothing. Second command's results are all of the form `if (!verifyAdminSessionToken(token))` — if any result assigns the return value to a variable typed/used as a plain `boolean` elsewhere, that file needs a small follow-up fix (unlikely — verified during planning that none currently do).

- [ ] **Step 7: Type-check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 8: Manual verification of the negative paths**

With `npm run dev` running, test the paths that don't require a real `edital-admin`-tagged account (find a real username first the same way as Task 3's Step 2, or reuse the one you already found):

```bash
curl -s -o /dev/null -w "usuario inexistente: %{http_code}\n" -X POST http://localhost:3000/api/admin/login \
  -H "Content-Type: application/json" -H "Origin: http://localhost:3000" \
  -d '{"username":"usuario-que-nao-existe-123456","password":"qualquer"}'

curl -s -o /dev/null -w "senha errada: %{http_code}\n" -X POST http://localhost:3000/api/admin/login \
  -H "Content-Type: application/json" -H "Origin: http://localhost:3000" \
  -d '{"username":"SEU_USERNAME_DE_TESTE","password":"senha-errada-de-proposito"}'
```

Expected: both `401`. **Do not attempt to test the success path here** — per Global Constraints, no account has the `edital-admin` tag yet, and adding it yourself to test isn't this task's call. That verification happens in Task 10, after a human has granted the tag. Also open `/admin/login` in a browser and confirm it now shows both a "Usuário" and a "Senha" field.

- [ ] **Step 9: Commit**

```bash
git add lib/admin-auth.ts "app/api/admin/login/route.ts" app/admin/login/page.tsx env.example package.json package-lock.json
git commit -m "feat: substitui login por senha unica por login individual via tabela users"
```

(`.env` is gitignored — no need to add it, but confirm you actually edited the real local file, not just `env.example`.)

---

### Task 5: Evaluation API route

**Files:**
- Create: `app/api/admin/editais/[id]/avaliacao/route.ts`

**Interfaces:**
- Consumes: `verifyAdminSessionToken`, `ADMIN_SESSION_COOKIE_NAME` (`lib/admin-auth.ts`); `validateEvaluationScores` (Task 1); `query`, `queryOne` (`lib/db.ts`); `isTrustedOrigin`, `enforceRateLimit`, `applyNoStore` (`lib/security.ts`)
- Produces: `POST /api/admin/editais/[id]/avaliacao` — body `{ scores: Record<string, number> }`, 200 `{ ok: true, total: number }` on success; 400 invalid scores/body; 401 unauthenticated; 403 untrusted origin; 404 unknown submission; 429 rate-limited; 500 unexpected error

- [ ] **Step 1: Write the route**

```typescript
/**
 * POST /api/admin/editais/:id/avaliacao
 * Registra (ou atualiza) a avaliação interna de uma proposta do Edital PPI:
 * uma nota por critério (item 10.2 do edital) e a nota final calculada no
 * servidor. Quem avaliou vem da sessão logada, não do corpo da requisição.
 */

import { NextRequest, NextResponse } from 'next/server';
import { applyNoStore, enforceRateLimit, isTrustedOrigin } from '@/lib/security';
import { query, queryOne } from '@/lib/db';
import { verifyAdminSessionToken, ADMIN_SESSION_COOKIE_NAME } from '@/lib/admin-auth';
import { validateEvaluationScores } from '@/lib/edital-evaluation';

function jsonResponse(body: unknown, init?: ResponseInit) {
  return applyNoStore(NextResponse.json(body, init));
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!isTrustedOrigin(request)) {
      return jsonResponse({ error: 'Origem não autorizada' }, { status: 403 });
    }

    const token = request.cookies.get(ADMIN_SESSION_COOKIE_NAME)?.value;
    const session = verifyAdminSessionToken(token);
    if (!session) {
      return jsonResponse({ error: 'Não autorizado' }, { status: 401 });
    }

    const rateLimit = enforceRateLimit(request, 'admin-editais-avaliacao', 30, 10 * 60 * 1000);
    if (!rateLimit.allowed) {
      return jsonResponse(
        { error: 'Muitas tentativas. Tente novamente em alguns minutos.' },
        { status: 429, headers: { 'Retry-After': rateLimit.retryAfterSeconds.toString() } }
      );
    }

    const { id } = await params;
    const submissionId = Number.parseInt(id, 10);
    if (!Number.isFinite(submissionId)) {
      return jsonResponse({ error: 'Proposta inválida' }, { status: 400 });
    }

    const existing = await queryOne<{ id: number }>(
      `SELECT id FROM edital_submissions WHERE id = $1 LIMIT 1`,
      [submissionId]
    );
    if (!existing) {
      return jsonResponse({ error: 'Proposta não encontrada' }, { status: 404 });
    }

    let body: { scores?: unknown };
    try {
      body = await request.json();
    } catch {
      return jsonResponse({ error: 'Requisição inválida' }, { status: 400 });
    }

    if (!body.scores || typeof body.scores !== 'object') {
      return jsonResponse({ error: 'Notas ausentes' }, { status: 400 });
    }

    const result = validateEvaluationScores(body.scores as Record<string, unknown>);
    if (!result.valid) {
      return jsonResponse({ error: result.error }, { status: 400 });
    }

    await query(
      `UPDATE edital_submissions
       SET evaluation_scores = $1,
           evaluation_total_score = $2,
           evaluated_by = $3,
           evaluated_at = NOW()
       WHERE id = $4`,
      [JSON.stringify(body.scores), result.total, session.name, submissionId]
    );

    return jsonResponse({ ok: true, total: result.total });
  } catch (error) {
    console.error('[admin-editais-avaliacao] Erro ao salvar avaliação:', error);
    return jsonResponse({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```

Expected: no errors. (Full end-to-end verification, including a real logged-in session, happens once Task 7's UI can drive this route — checking it in isolation via curl would require a session cookie that Task 4 deliberately couldn't produce yet.)

- [ ] **Step 3: Commit**

```bash
git add "app/api/admin/editais/[id]/avaliacao/route.ts"
git commit -m "feat: adiciona rota de avaliacao de proposta do edital"
```

---

### Task 6: Disqualify and requalify API routes

**Files:**
- Create: `app/api/admin/editais/[id]/desqualificar/route.ts`
- Create: `app/api/admin/editais/[id]/requalificar/route.ts`

**Interfaces:**
- Consumes: same as Task 5, minus `validateEvaluationScores`
- Produces: `POST /api/admin/editais/[id]/desqualificar` — body `{ reason: string }`, 200 `{ ok: true }`; 400 empty reason; `POST /api/admin/editais/[id]/requalificar` — no body, 200 `{ ok: true }`. Both share the same 401/403/404/429/500 contract as Task 5.

- [ ] **Step 1: Write the desqualificar route**

```typescript
/**
 * POST /api/admin/editais/:id/desqualificar
 * Desqualifica manualmente uma proposta do Edital PPI, com motivo
 * obrigatório. Reversível via POST .../requalificar. Quem desqualificou vem
 * da sessão logada.
 */

import { NextRequest, NextResponse } from 'next/server';
import { applyNoStore, enforceRateLimit, isTrustedOrigin } from '@/lib/security';
import { query, queryOne } from '@/lib/db';
import { verifyAdminSessionToken, ADMIN_SESSION_COOKIE_NAME } from '@/lib/admin-auth';

function jsonResponse(body: unknown, init?: ResponseInit) {
  return applyNoStore(NextResponse.json(body, init));
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!isTrustedOrigin(request)) {
      return jsonResponse({ error: 'Origem não autorizada' }, { status: 403 });
    }

    const token = request.cookies.get(ADMIN_SESSION_COOKIE_NAME)?.value;
    const session = verifyAdminSessionToken(token);
    if (!session) {
      return jsonResponse({ error: 'Não autorizado' }, { status: 401 });
    }

    const rateLimit = enforceRateLimit(request, 'admin-editais-desqualificar', 30, 10 * 60 * 1000);
    if (!rateLimit.allowed) {
      return jsonResponse(
        { error: 'Muitas tentativas. Tente novamente em alguns minutos.' },
        { status: 429, headers: { 'Retry-After': rateLimit.retryAfterSeconds.toString() } }
      );
    }

    const { id } = await params;
    const submissionId = Number.parseInt(id, 10);
    if (!Number.isFinite(submissionId)) {
      return jsonResponse({ error: 'Proposta inválida' }, { status: 400 });
    }

    const existing = await queryOne<{ id: number }>(
      `SELECT id FROM edital_submissions WHERE id = $1 LIMIT 1`,
      [submissionId]
    );
    if (!existing) {
      return jsonResponse({ error: 'Proposta não encontrada' }, { status: 404 });
    }

    let body: { reason?: unknown };
    try {
      body = await request.json();
    } catch {
      return jsonResponse({ error: 'Requisição inválida' }, { status: 400 });
    }

    const reason = typeof body.reason === 'string' ? body.reason.trim() : '';
    if (!reason) {
      return jsonResponse({ error: 'Informe o motivo da desqualificação' }, { status: 400 });
    }

    await query(
      `UPDATE edital_submissions
       SET disqualified_at = NOW(),
           disqualified_reason = $1,
           disqualified_by = $2
       WHERE id = $3`,
      [reason, session.name, submissionId]
    );

    return jsonResponse({ ok: true });
  } catch (error) {
    console.error('[admin-editais-desqualificar] Erro ao desqualificar:', error);
    return jsonResponse({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
```

- [ ] **Step 2: Write the requalificar route**

```typescript
/**
 * POST /api/admin/editais/:id/requalificar
 * Reverte a desqualificação de uma proposta do Edital PPI (limpa os campos
 * de desqualificação). Não recupera o motivo anterior.
 */

import { NextRequest, NextResponse } from 'next/server';
import { applyNoStore, enforceRateLimit, isTrustedOrigin } from '@/lib/security';
import { query, queryOne } from '@/lib/db';
import { verifyAdminSessionToken, ADMIN_SESSION_COOKIE_NAME } from '@/lib/admin-auth';

function jsonResponse(body: unknown, init?: ResponseInit) {
  return applyNoStore(NextResponse.json(body, init));
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!isTrustedOrigin(request)) {
      return jsonResponse({ error: 'Origem não autorizada' }, { status: 403 });
    }

    const token = request.cookies.get(ADMIN_SESSION_COOKIE_NAME)?.value;
    const session = verifyAdminSessionToken(token);
    if (!session) {
      return jsonResponse({ error: 'Não autorizado' }, { status: 401 });
    }

    const rateLimit = enforceRateLimit(request, 'admin-editais-requalificar', 30, 10 * 60 * 1000);
    if (!rateLimit.allowed) {
      return jsonResponse(
        { error: 'Muitas tentativas. Tente novamente em alguns minutos.' },
        { status: 429, headers: { 'Retry-After': rateLimit.retryAfterSeconds.toString() } }
      );
    }

    const { id } = await params;
    const submissionId = Number.parseInt(id, 10);
    if (!Number.isFinite(submissionId)) {
      return jsonResponse({ error: 'Proposta inválida' }, { status: 400 });
    }

    const existing = await queryOne<{ id: number }>(
      `SELECT id FROM edital_submissions WHERE id = $1 LIMIT 1`,
      [submissionId]
    );
    if (!existing) {
      return jsonResponse({ error: 'Proposta não encontrada' }, { status: 404 });
    }

    await query(
      `UPDATE edital_submissions
       SET disqualified_at = NULL,
           disqualified_reason = NULL,
           disqualified_by = NULL
       WHERE id = $1`,
      [submissionId]
    );

    return jsonResponse({ ok: true });
  } catch (error) {
    console.error('[admin-editais-requalificar] Erro ao reverter desqualificação:', error);
    return jsonResponse({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
```

- [ ] **Step 3: Type-check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add "app/api/admin/editais/[id]/desqualificar/route.ts" "app/api/admin/editais/[id]/requalificar/route.ts"
git commit -m "feat: adiciona rotas de desqualificacao e reversao de proposta do edital"
```

---

### Task 7: Evaluation and disqualification UI (modals + buttons)

**Files:**
- Create: `app/components/admin/SubmissionActions.tsx`

**Interfaces:**
- Consumes: `EDITAL_EVALUATION_CRITERIA`, `EDITAL_APPROVAL_MIN_SCORE`, `validateEvaluationScores` (Task 1); `POST /api/admin/editais/[id]/avaliacao` (Task 5), `POST /api/admin/editais/[id]/desqualificar`, `POST /api/admin/editais/[id]/requalificar` (Task 6)
- Produces: `<SubmissionActions submissionId={number} evaluation={EvaluationData | null} disqualification={DisqualificationData | null} />` (default export, client component) where `EvaluationData = { scores: Record<string, number>; total: number; evaluatedBy: string; evaluatedAt: string }` and `DisqualificationData = { reason: string; disqualifiedBy: string; disqualifiedAt: string }`

- [ ] **Step 1: Write the component**

```typescript
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, AlertCircle } from 'lucide-react'
import { EDITAL_EVALUATION_CRITERIA, EDITAL_APPROVAL_MIN_SCORE, validateEvaluationScores } from '@/lib/edital-evaluation'

interface EvaluationData {
  scores: Record<string, number>
  total: number
  evaluatedBy: string
  evaluatedAt: string
}

interface DisqualificationData {
  reason: string
  disqualifiedBy: string
  disqualifiedAt: string
}

interface SubmissionActionsProps {
  submissionId: number
  evaluation: EvaluationData | null
  disqualification: DisqualificationData | null
}

function initialScores(evaluation: EvaluationData | null): Record<string, number> {
  const scores: Record<string, number> = {}
  for (const criterion of EDITAL_EVALUATION_CRITERIA) {
    scores[criterion.code] = evaluation?.scores[criterion.code] ?? 0
  }
  return scores
}

export default function SubmissionActions({ submissionId, evaluation, disqualification }: SubmissionActionsProps) {
  const router = useRouter()
  const [showEvaluationModal, setShowEvaluationModal] = useState(false)
  const [showDisqualifyModal, setShowDisqualifyModal] = useState(false)
  const [scores, setScores] = useState<Record<string, number>>(() => initialScores(evaluation))
  const [reason, setReason] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const openEvaluationModal = () => {
    setScores(initialScores(evaluation))
    setError('')
    setShowEvaluationModal(true)
  }

  const openDisqualifyModal = () => {
    setReason('')
    setError('')
    setShowDisqualifyModal(true)
  }

  const validation = validateEvaluationScores(scores)

  const handleSaveEvaluation = async () => {
    if (!validation.valid) {
      setError(validation.error || 'Notas inválidas')
      return
    }

    setSaving(true)
    setError('')

    try {
      const response = await fetch(`/api/admin/editais/${submissionId}/avaliacao`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scores }),
      })

      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        setError(data.error || 'Não foi possível salvar a avaliação.')
        setSaving(false)
        return
      }

      setShowEvaluationModal(false)
      setSaving(false)
      router.refresh()
    } catch {
      setError('Não foi possível salvar a avaliação.')
      setSaving(false)
    }
  }

  const handleDisqualify = async () => {
    if (!reason.trim()) {
      setError('Informe o motivo da desqualificação')
      return
    }

    setSaving(true)
    setError('')

    try {
      const response = await fetch(`/api/admin/editais/${submissionId}/desqualificar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      })

      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        setError(data.error || 'Não foi possível desqualificar a proposta.')
        setSaving(false)
        return
      }

      setShowDisqualifyModal(false)
      setSaving(false)
      router.refresh()
    } catch {
      setError('Não foi possível desqualificar a proposta.')
      setSaving(false)
    }
  }

  const handleRequalify = async () => {
    if (!window.confirm('Reverter a desqualificação desta proposta?')) {
      return
    }

    setSaving(true)

    try {
      const response = await fetch(`/api/admin/editais/${submissionId}/requalificar`, { method: 'POST' })
      if (!response.ok) {
        setSaving(false)
        return
      }
      router.refresh()
    } catch {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-wrap gap-3">
      <button
        type="button"
        onClick={openEvaluationModal}
        className="px-5 py-3 bg-[#22AE84] hover:bg-[#1C8C6A] text-white rounded-xl font-bold transition-all text-sm"
      >
        {evaluation ? 'Editar avaliação' : 'Fazer avaliação'}
      </button>

      {disqualification ? (
        <button
          type="button"
          onClick={handleRequalify}
          disabled={saving}
          className="px-5 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold transition-all text-sm disabled:opacity-50"
        >
          Reverter desqualificação
        </button>
      ) : (
        <button
          type="button"
          onClick={openDisqualifyModal}
          className="px-5 py-3 bg-red-900/40 hover:bg-red-900/60 border border-red-800/50 text-red-300 rounded-xl font-bold transition-all text-sm"
        >
          Desqualificar
        </button>
      )}

      {showEvaluationModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-8">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold text-white mb-6">Avaliação da proposta</h2>

            <div className="space-y-4">
              {EDITAL_EVALUATION_CRITERIA.map((criterion) => (
                <div key={criterion.code}>
                  <label htmlFor={`score-${criterion.code}`} className="block text-sm text-slate-300 mb-1">
                    {criterion.label} <span className="text-slate-500">(máx. {criterion.maxPoints})</span>
                  </label>
                  <input
                    id={`score-${criterion.code}`}
                    type="number"
                    min={0}
                    max={criterion.maxPoints}
                    step={1}
                    value={scores[criterion.code]}
                    onChange={(e) => {
                      const value = Number.parseInt(e.target.value, 10)
                      setScores((prev) => ({ ...prev, [criterion.code]: Number.isFinite(value) ? value : 0 }))
                    }}
                    className="w-full px-4 py-2 bg-slate-900/60 border border-slate-700/50 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-[#22AE84]/30 focus:border-[#22AE84]"
                  />
                </div>
              ))}
            </div>

            <div className="mt-6 flex items-center justify-between border-t border-slate-800 pt-4">
              <span className="text-slate-300 font-medium">Nota final</span>
              <span className={`text-2xl font-bold ${validation.total >= EDITAL_APPROVAL_MIN_SCORE ? 'text-[#22AE84]' : 'text-slate-200'}`}>
                {validation.total} / 100
              </span>
            </div>

            {error && (
              <div className="mt-4 flex items-center gap-2 text-sm text-red-400 font-medium">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => setShowEvaluationModal(false)}
                disabled={saving}
                className="flex-1 px-5 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold transition-all text-sm disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveEvaluation}
                disabled={saving}
                className="flex-1 px-5 py-3 bg-[#22AE84] hover:bg-[#1C8C6A] text-white rounded-xl font-bold transition-all text-sm disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}

      {showDisqualifyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-8">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8">
            <h2 className="text-lg font-bold text-white mb-4">Desqualificar proposta</h2>
            <label htmlFor="disqualify-reason" className="block text-sm text-slate-300 mb-2">
              Motivo
            </label>
            <textarea
              id="disqualify-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={4}
              className="w-full px-4 py-3 bg-slate-900/60 border border-slate-700/50 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-[#22AE84]/30 focus:border-[#22AE84]"
            />

            {error && (
              <div className="mt-4 flex items-center gap-2 text-sm text-red-400 font-medium">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => setShowDisqualifyModal(false)}
                disabled={saving}
                className="flex-1 px-5 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold transition-all text-sm disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleDisqualify}
                disabled={saving}
                className="flex-1 px-5 py-3 bg-red-900/60 hover:bg-red-900/80 text-white rounded-xl font-bold transition-all text-sm disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```

Expected: no errors. (This component has no caller yet — Task 8 wires it in and is where real visual/functional verification happens.)

- [ ] **Step 3: Commit**

```bash
git add app/components/admin/SubmissionActions.tsx
git commit -m "feat: adiciona componente de avaliacao e desqualificacao de proposta"
```

---

### Task 8: Wire evaluation/disqualification into the detail page

**Files:**
- Modify: `app/admin/editais/[id]/page.tsx`

**Interfaces:**
- Consumes: `SubmissionActions` (Task 7); `EDITAL_APPROVAL_MIN_SCORE` (Task 1); new columns from Task 2

- [ ] **Step 1: Replace the full file content**

```typescript
import { cookies } from 'next/headers'
import { redirect, notFound } from 'next/navigation'
import { Users, Building2, FileText, Camera, FileCheck, Award } from 'lucide-react'
import { query, queryOne } from '@/lib/db'
import { verifyAdminSessionToken, ADMIN_SESSION_COOKIE_NAME } from '@/lib/admin-auth'
import { EDITAL_DOCUMENT_LABELS, EDITAL_STEP_BY_DOCUMENT_CODE } from '@/lib/edital-completeness'
import { EDITAL_REQUIRED_DOCUMENT_CODES, EDITAL_PHOTO_DOCUMENT_CODE } from '@/lib/edital-requirements'
import { EDITAL_APPROVAL_MIN_SCORE } from '@/lib/edital-evaluation'
import ThumbnailCard from '@/app/components/admin/ThumbnailCard'
import SubmissionActions from '@/app/components/admin/SubmissionActions'

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
  evaluation_scores: Record<string, number> | null
  evaluation_total_score: number | null
  evaluated_by: string | null
  evaluated_at: string | null
  disqualified_at: string | null
  disqualified_reason: string | null
  disqualified_by: string | null
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
            s.technical_justification, s.expected_results, s.submitted_at,
            s.evaluation_scores, s.evaluation_total_score, s.evaluated_by, s.evaluated_at,
            s.disqualified_at, s.disqualified_reason, s.disqualified_by
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

function getDocumentCodesForStep(step: string): string[] {
  return EDITAL_REQUIRED_DOCUMENT_CODES.filter((code) => EDITAL_STEP_BY_DOCUMENT_CODE[code] === step)
}

function Block({
  title,
  icon,
  children,
}: {
  title: string
  icon: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <section className="bg-slate-900/30 border border-slate-800 rounded-3xl p-6 sm:p-8">
      <h2 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
        <span className="text-[#22AE84]">{icon}</span>
        {title}
      </h2>
      {children}
    </section>
  )
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-sm text-slate-400">{label}</dt>
      <dd className="text-slate-200 whitespace-pre-wrap">{value}</dd>
    </div>
  )
}

function DocumentGrid({
  codes,
  documentsByCode,
}: {
  codes: string[]
  documentsByCode: Map<string, DocumentRow[]>
}) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6">
      {codes.map((code) => {
        const doc = (documentsByCode.get(code) || [])[0]
        const label = EDITAL_DOCUMENT_LABELS[code]

        if (!doc) {
          return (
            <div
              key={code}
              className="aspect-[3/4] rounded-xl border border-dashed border-slate-700/50 flex items-center justify-center p-3"
            >
              <span className="text-xs text-slate-500 text-center">Não enviado</span>
            </div>
          )
        }

        return (
          <ThumbnailCard
            key={code}
            thumbnailUrl={`/api/editais/documento/${doc.id}/thumbnail`}
            openUrl={`/api/editais/documento/${doc.id}/link`}
            label={label}
          />
        )
      })}
    </div>
  )
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

  const evaluation =
    submission.evaluation_total_score !== null &&
    submission.evaluation_scores &&
    submission.evaluated_by &&
    submission.evaluated_at
      ? {
          scores: submission.evaluation_scores,
          total: submission.evaluation_total_score,
          evaluatedBy: submission.evaluated_by,
          evaluatedAt: submission.evaluated_at,
        }
      : null

  const disqualification =
    submission.disqualified_at && submission.disqualified_reason && submission.disqualified_by
      ? {
          reason: submission.disqualified_reason,
          disqualifiedBy: submission.disqualified_by,
          disqualifiedAt: submission.disqualified_at,
        }
      : null

  return (
    <main className="flex-1 relative z-10 min-h-screen px-4 py-16">
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">{submission.full_name}</h1>
          <p className="text-slate-400">
            CPF {submission.cpf} · Enviada em {new Date(submission.submitted_at).toLocaleString('pt-BR')}
          </p>

          {evaluation && (
            <p className="mt-3 text-sm">
              <span
                className={`inline-block px-3 py-1 rounded-full font-bold ${
                  evaluation.total >= EDITAL_APPROVAL_MIN_SCORE
                    ? 'bg-[#22AE84]/20 text-[#22AE84]'
                    : 'bg-slate-800 text-slate-400'
                }`}
              >
                Nota: {evaluation.total} / 100
              </span>
              <span className="text-slate-500 ml-2">
                avaliado por {evaluation.evaluatedBy} em {new Date(evaluation.evaluatedAt).toLocaleString('pt-BR')}
              </span>
            </p>
          )}

          {disqualification && (
            <div className="mt-3 bg-red-900/20 border border-red-800/40 rounded-xl px-4 py-3">
              <p className="text-red-300 font-bold text-sm">Proposta desqualificada</p>
              <p className="text-red-300/80 text-sm mt-1">{disqualification.reason}</p>
              <p className="text-red-300/60 text-xs mt-1">
                por {disqualification.disqualifiedBy} em {new Date(disqualification.disqualifiedAt).toLocaleString('pt-BR')}
              </p>
            </div>
          )}

          <div className="mt-4">
            <SubmissionActions submissionId={submission.id} evaluation={evaluation} disqualification={disqualification} />
          </div>
        </div>

        <Block title="Equipe" icon={<Users className="w-5 h-5" />}>
          <dl className="space-y-4">
            <Field label="Descrição da equipe" value={submission.team_description || '—'} />
          </dl>
          <DocumentGrid codes={getDocumentCodesForStep('equipe')} documentsByCode={documentsByCode} />
        </Block>

        <Block title="Instituição" icon={<Building2 className="w-5 h-5" />}>
          <dl className="space-y-4">
            <Field
              label="Instituição"
              value={`${submission.institution_name || '—'} (${submission.institution_cnpj || 'CNPJ não informado'})`}
            />
            <Field label="Laboratório" value={`${submission.lab_name || '—'} — ${submission.lab_area || '—'}`} />
            <Field label="Público atendido pelo laboratório" value={submission.lab_served_public || '—'} />
          </dl>
          <DocumentGrid codes={getDocumentCodesForStep('instituicao')} documentsByCode={documentsByCode} />
        </Block>

        <Block title="Proposta" icon={<FileText className="w-5 h-5" />}>
          <dl className="space-y-4">
            <Field label="Justificativa técnica" value={submission.technical_justification || '—'} />
            <Field label="Resultados esperados" value={submission.expected_results || '—'} />
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
        </Block>

        <Block title="Fotos do laboratório" icon={<Camera className="w-5 h-5" />}>
          <DocumentGrid codes={getDocumentCodesForStep('fotos')} documentsByCode={documentsByCode} />
          {photos.length === 0 ? (
            <p className="text-slate-500 mt-4">Nenhuma foto enviada</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
              {photos.map((photo) => (
                <ThumbnailCard
                  key={photo.id}
                  thumbnailUrl={`/api/editais/documento/${photo.id}/thumbnail`}
                  openUrl={`/api/editais/documento/${photo.id}/link`}
                  label={photo.original_filename || 'Foto do laboratório'}
                  aspectClassName="aspect-square"
                />
              ))}
            </div>
          )}
        </Block>

        <Block title="Declarações" icon={<FileCheck className="w-5 h-5" />}>
          <DocumentGrid codes={getDocumentCodesForStep('declaracoes')} documentsByCode={documentsByCode} />
        </Block>

        <Block title="Certificado de inscrição na comunidade" icon={<Award className="w-5 h-5" />}>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <ThumbnailCard
              thumbnailUrl={`/api/editais/certificado/${submission.registration_id}/thumbnail`}
              openUrl={`/api/editais/certificado/${submission.registration_id}/link`}
              label="Certificado de inscrição"
            />
          </div>
        </Block>
      </div>
    </main>
  )
}
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```

Expected: no errors. (Real functional verification — actually saving an evaluation, seeing the badge appear, disqualifying, reverting — needs a logged-in session and happens in Task 10, once a human has granted the `edital-admin` tag to a test account.)

- [ ] **Step 3: Commit**

```bash
git add "app/admin/editais/[id]/page.tsx"
git commit -m "feat: adiciona avaliacao e desqualificacao a pagina de detalhe da proposta"
```

---

### Task 9: Tabs on the proposals list page

**Files:**
- Modify: `app/admin/editais/page.tsx`

**Interfaces:**
- Consumes: `EDITAL_APPROVAL_MIN_SCORE` (Task 1); new columns from Task 2

- [ ] **Step 1: Replace the full file content**

```typescript
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { query } from '@/lib/db'
import { verifyAdminSessionToken, ADMIN_SESSION_COOKIE_NAME } from '@/lib/admin-auth'
import { EDITAL_APPROVAL_MIN_SCORE } from '@/lib/edital-evaluation'

type Tab = 'pendentes' | 'ranking' | 'rejeitadas'

interface PendingRow {
  id: number
  full_name: string
  institution_name: string | null
  submitted_at: string
}

interface RankingRow {
  id: number
  full_name: string
  institution_name: string | null
  evaluation_total_score: number
}

interface RejectedRow {
  id: number
  full_name: string
  institution_name: string | null
  disqualified_reason: string
  disqualified_at: string
}

async function loadPending(): Promise<PendingRow[]> {
  return query<PendingRow>(
    `SELECT s.id, r.full_name, s.institution_name, s.submitted_at
     FROM edital_submissions s
     INNER JOIN registrations r ON r.id = s.registration_id
     WHERE s.status = 'SUBMITTED' AND s.disqualified_at IS NULL AND s.evaluation_total_score IS NULL
     ORDER BY s.submitted_at DESC`
  )
}

async function loadRanking(): Promise<RankingRow[]> {
  return query<RankingRow>(
    `SELECT s.id, r.full_name, s.institution_name, s.evaluation_total_score
     FROM edital_submissions s
     INNER JOIN registrations r ON r.id = s.registration_id
     WHERE s.status = 'SUBMITTED' AND s.disqualified_at IS NULL AND s.evaluation_total_score IS NOT NULL
     ORDER BY s.evaluation_total_score DESC, s.submitted_at ASC`
  )
}

async function loadRejected(): Promise<RejectedRow[]> {
  return query<RejectedRow>(
    `SELECT s.id, r.full_name, s.institution_name, s.disqualified_reason, s.disqualified_at
     FROM edital_submissions s
     INNER JOIN registrations r ON r.id = s.registration_id
     WHERE s.disqualified_at IS NOT NULL
     ORDER BY s.disqualified_at DESC`
  )
}

function CardShell({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-4 bg-slate-900/40 hover:bg-slate-900/60 border border-slate-800 hover:border-[#22AE84]/40 rounded-2xl p-6 transition-all"
    >
      {children}
      <ChevronRight className="w-5 h-5 text-slate-600 group-hover:text-[#22AE84] transition-colors flex-shrink-0" />
    </Link>
  )
}

function Avatar({ name }: { name: string }) {
  return (
    <div className="flex-shrink-0 w-12 h-12 rounded-full bg-[#22AE84]/10 flex items-center justify-center text-[#22AE84] font-bold text-lg">
      {name.charAt(0).toUpperCase()}
    </div>
  )
}

const TABS: Array<{ key: Tab; label: string }> = [
  { key: 'pendentes', label: 'Sem avaliação' },
  { key: 'ranking', label: 'Ranking' },
  { key: 'rejeitadas', label: 'Rejeitadas' },
]

async function PendingList() {
  const submissions = await loadPending()

  if (submissions.length === 0) {
    return <p className="text-slate-400">Nenhuma proposta aguardando avaliação.</p>
  }

  return (
    <div className="space-y-3">
      {submissions.map((submission) => (
        <CardShell key={submission.id} href={`/admin/editais/${submission.id}`}>
          <Avatar name={submission.full_name} />
          <div className="flex-1 min-w-0">
            <p className="text-white font-bold truncate">{submission.full_name}</p>
            <p className="text-sm text-slate-400 truncate">
              {submission.institution_name || 'Sem instituição informada'}
            </p>
          </div>
          <p className="text-xs text-slate-500 flex-shrink-0">
            {new Date(submission.submitted_at).toLocaleString('pt-BR')}
          </p>
        </CardShell>
      ))}
    </div>
  )
}

async function RankingList() {
  const submissions = await loadRanking()

  if (submissions.length === 0) {
    return <p className="text-slate-400">Nenhuma proposta avaliada ainda.</p>
  }

  return (
    <div className="space-y-3">
      {submissions.map((submission, index) => (
        <CardShell key={submission.id} href={`/admin/editais/${submission.id}`}>
          <div className="flex-shrink-0 w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center text-slate-300 font-bold text-lg">
            #{index + 1}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white font-bold truncate">{submission.full_name}</p>
            <p className="text-sm text-slate-400 truncate">
              {submission.institution_name || 'Sem instituição informada'}
            </p>
          </div>
          <span
            className={`px-3 py-1 rounded-full text-xs font-bold flex-shrink-0 ${
              submission.evaluation_total_score >= EDITAL_APPROVAL_MIN_SCORE
                ? 'bg-[#22AE84]/20 text-[#22AE84]'
                : 'bg-slate-800 text-slate-400'
            }`}
          >
            {submission.evaluation_total_score} / 100
          </span>
        </CardShell>
      ))}
    </div>
  )
}

async function RejectedList() {
  const submissions = await loadRejected()

  if (submissions.length === 0) {
    return <p className="text-slate-400">Nenhuma proposta rejeitada.</p>
  }

  return (
    <div className="space-y-3">
      {submissions.map((submission) => (
        <CardShell key={submission.id} href={`/admin/editais/${submission.id}`}>
          <Avatar name={submission.full_name} />
          <div className="flex-1 min-w-0">
            <p className="text-white font-bold truncate">{submission.full_name}</p>
            <p className="text-sm text-red-300/80 truncate">{submission.disqualified_reason}</p>
          </div>
          <p className="text-xs text-slate-500 flex-shrink-0">
            {new Date(submission.disqualified_at).toLocaleString('pt-BR')}
          </p>
        </CardShell>
      ))}
    </div>
  )
}

export default async function AdminEditaisPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>
}) {
  const cookieStore = await cookies()
  const token = cookieStore.get(ADMIN_SESSION_COOKIE_NAME)?.value

  if (!verifyAdminSessionToken(token)) {
    redirect('/admin/login')
  }

  const { tab: tabParam } = await searchParams
  const tab: Tab = tabParam === 'ranking' || tabParam === 'rejeitadas' ? tabParam : 'pendentes'

  return (
    <main className="flex-1 relative z-10 min-h-screen px-4 py-16">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-white mb-2">Propostas do Edital PPI</h1>

        <div className="flex gap-2 mb-8 border-b border-slate-800">
          {TABS.map((item) => (
            <Link
              key={item.key}
              href={`/admin/editais?tab=${item.key}`}
              className={`px-4 py-3 text-sm font-bold border-b-2 transition-colors ${
                tab === item.key
                  ? 'border-[#22AE84] text-[#22AE84]'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              {item.label}
            </Link>
          ))}
        </div>

        {tab === 'pendentes' && <PendingList />}
        {tab === 'ranking' && <RankingList />}
        {tab === 'rejeitadas' && <RejectedList />}
      </div>
    </main>
  )
}
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add app/admin/editais/page.tsx
git commit -m "feat: adiciona abas de pendentes, ranking e rejeitadas na lista de propostas"
```

---

### Task 10: CLAUDE.md update + full end-to-end verification

**Files:**
- Modify: `CLAUDE.md`

**Interfaces:**
- Consumes: everything from Tasks 1-9

- [ ] **Step 1: Stop and get a real `edital-admin`-tagged test account**

Everything up to this point has been verified except the actual login success path and the full evaluate/rank/disqualify/revert flow, because no account has the `edital-admin` tag yet — and per Global Constraints, this project never writes to the shared `users` table itself. **Before continuing, ask the human running this plan to add `"edital-admin"` to the `platforms` array of one real test account** (their own, most likely) directly in the shared database, and to confirm the plaintext password they'll use to log in. Do not proceed to Step 2 until this is done.

- [ ] **Step 2: Full manual walkthrough in the browser**

With `npm run dev` running:

1. Go to `/admin/login`, log in with the now-tagged account's username/password. Confirm it redirects to `/admin/editais` showing the "Sem avaliação" tab by default.
2. Confirm the three tabs (Sem avaliação / Ranking / Rejeitadas) render and switching between them updates the URL (`?tab=...`) and the list.
3. Open a real `SUBMITTED` proposal (e.g. submission `#1`) from the "Sem avaliação" tab. Confirm the "Fazer avaliação" and "Desqualificar" buttons are both visible, with no evaluation/disqualification banner yet.
4. Click "Fazer avaliação". Fill in all 7 criteria with values within their max, watch the "Nota final" update live as you type, save. Confirm the modal closes, the page refreshes, and a green score badge + "avaliado por [seu nome]" now shows under the header, and the button now reads "Editar avaliação".
5. Go back to `/admin/editais?tab=ranking`. Confirm the proposal now appears there with `#1` and the correct score, and no longer appears under "Sem avaliação".
6. Reopen the proposal, click "Editar avaliação", change one score, save. Confirm the total and the badge update accordingly.
7. Click "Desqualificar", try submitting with an empty reason (confirm it's rejected client-side), then fill in a reason and confirm. Confirm the button becomes "Reverter desqualificação", a red "Proposta desqualificada" banner appears with the reason and your name, and the proposal now shows under `/admin/editais?tab=rejeitadas` (with its score from step 4 still intact) and no longer under "Ranking".
8. Click "Reverter desqualificação", confirm the browser confirmation dialog, confirm it. Confirm the proposal is back under "Ranking" (since it still has a score) and the red banner is gone.
9. Log out (`/api/admin/logout` via the existing logout affordance, if the UI has one — otherwise `curl -X POST http://localhost:3000/api/admin/logout`) and confirm `/admin/editais` redirects to `/admin/login` again.

If anything in this walkthrough fails, fix it before continuing — this is the first point any of Tasks 4-9 have been exercised together with a real session.

- [ ] **Step 3: Update `CLAUDE.md`**

In `CLAUDE.md`, find this paragraph in the "### Admin panel (Edital submissions)" section:

```
`/admin/login` → `/admin/editais` (list of `SUBMITTED` proposals) → `/admin/editais/[id]` (full detail: answers, inline document/photo preview). Protected by a **placeholder** shared-password session (`ADMIN_PASSWORD` + `ADMIN_TOKEN_SECRET`, HMAC-signed cookie via `lib/admin-auth.ts` — same pattern as `lib/edital-auth.ts`). Every protected page/route calls `verifyAdminSessionToken()` directly; there's no middleware-based gate (`middleware.ts` runs on the Edge runtime, which can't use Node's `crypto` module for HMAC verification). This placeholder is meant to be swapped for the Innovatis cross-platform user/tag system later — that swap is expected to mostly live in `lib/admin-auth.ts` and the login route, though `verifyAdminSessionToken` is currently synchronous and identity-free, so a real per-user check will likely need to become async, which would touch every call site (`app/admin/editais/page.tsx`, `app/admin/editais/[id]/page.tsx`, and both `/link` routes) to add `await`.
```

Replace it with:

```
`/admin/login` → `/admin/editais` (tabs: Sem avaliação / Ranking / Rejeitadas) → `/admin/editais/[id]` (full detail: answers, inline document/photo preview, evaluation + disqualification actions). Protected by an individual-login session (`lib/admin-auth.ts`, HMAC-signed cookie carrying `{userId, username, name}`) authenticated against the `users` table in a **separate, shared** Postgres database (`PLATFORMS_DB_*` env vars — same RDS instance as this project's own database, different `database` name, used by other Innovatis platforms too) via `lib/platforms-db.ts`, read-only. Access to this panel requires the logged-in user's `platforms` array to contain the tag `edital-admin` — granted by editing that row directly in the shared database, outside this project. This replaced the earlier single-shared-password placeholder (`ADMIN_PASSWORD`, now removed). Every protected page/route still calls `verifyAdminSessionToken()` directly, same as before; no middleware-based gate (`middleware.ts` runs on the Edge runtime, which can't use Node's `crypto` module for HMAC verification).

Internal evaluation: proposals are scored manually against the 7 official criteria from the edital (item 10.2, 100 points total, `lib/edital-evaluation.ts`) via a modal on the detail page (`SubmissionActions` component). The tab a proposal appears under is derived from `edital_submissions` columns, not a new `status` value: no `evaluation_total_score` and no `disqualified_at` → Sem avaliação; has a score and not disqualified → Ranking (sorted by score); `disqualified_at IS NOT NULL` → Rejeitadas, regardless of score. Disqualification requires a reason and is reversible (editing/reverting overwrites, no history kept). `evaluated_by`/`disqualified_by` come from the logged-in session's `name`, not free text.
```

- [ ] **Step 4: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: documenta avaliacao de propostas e login individual do painel admin"
```

---

## Self-Review Notes

- **Spec coverage:** manual per-criteria scoring with live-computed 0-100 total ✅ (Tasks 1, 5, 7); editable evaluation ✅ (Task 7's "Editar avaliação" path, Task 5's upsert-by-`UPDATE`); reversible disqualification with required reason ✅ (Task 6, Task 7); three-tab list derived from columns, not a new status ✅ (Task 2, Task 9); real per-user login replacing the shared password, sourced from the shared `users` table with the `edital-admin` tag gate ✅ (Tasks 3, 4); `evaluated_by`/`disqualified_by` from session identity, not free text ✅ (Tasks 5, 6 read `session.name`); CLAUDE.md updated ✅ (Task 10). Out-of-scope items from the spec (multi-evaluator averaging, evaluation history, a "contemplada" status, Sheets/n8n propagation, `security-headers.ts`/`middleware.ts` changes) are correctly absent from every task.
- **Placeholder scan:** no TBD/TODO; every code block is complete. The one deliberately deferred check (login success path, full flow) is explicit about *why* (shared production table, human-only write) and *when* it gets verified (Task 10), not a vague "test later."
- **Type consistency:** `EDITAL_EVALUATION_CRITERIA`/`EDITAL_APPROVAL_MIN_SCORE`/`validateEvaluationScores` (Task 1) are imported with identical names in Tasks 5, 7, 8, 9. `AdminSessionIdentity`/`createAdminSessionToken`/`verifyAdminSessionToken` (Task 4) match their usage in Tasks 5 and 6 (`session.name`). `PlatformUserRow`/`findPlatformUserByUsername` (Task 3) match their one call site in Task 4. `SubmissionActions`'s props (`submissionId`, `evaluation`, `disqualification`, with the exact `EvaluationData`/`DisqualificationData` shapes) match exactly between its definition (Task 7) and its one call site (Task 8). Confirmed via `grep` during planning that all 6 existing `verifyAdminSessionToken` call sites use the `if (!verifyAdminSessionToken(token))` pattern exclusively, so the `boolean` → `AdminSessionIdentity | null` return-type change (Task 4) requires no edits to those files — this was verified against the actual current codebase, not assumed.
