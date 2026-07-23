# Redesenho Visual do Painel Admin + Miniaturas Reais — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign `/admin/editais` (list) and `/admin/editais/[id]` (detail) with a more polished visual treatment, organize the detail page into vertical blocks matching the original wizard's categories, and replace the plain text links for documents/photos/certificate with real content thumbnails (PDF page 1 rendered as an image; photos resized) — without touching the site's global CSP.

**Architecture:** Two new same-origin thumbnail routes (`/api/editais/documento/[id]/thumbnail`, `/api/editais/certificado/[registrationId]/thumbnail`) generate a thumbnail on first request, cache it in S3, and stream the bytes back directly from our own domain — this satisfies `img-src 'self'` with zero CSP changes. PDF rasterization uses `pdf-to-img` (already verified in this session: installs cleanly, no native/canvas dependency, renders correctly against this project's generated PDFs). A new reusable `ThumbnailCard` client component renders the `<img>` with an `onError` fallback to a generic icon card, so a failed generation never breaks the page.

**Tech Stack:** Next.js 15 App Router, `pdf-to-img` (new dependency, pure JS/WASM — no native canvas, verified compatible with this project during planning), `sharp` (already a dependency, used for resizing/compression), AWS S3 (`lib/s3.ts`), Postgres (`lib/db.ts`).

## Global Constraints

- No automated test framework exists in this repo (documented, intentional convention). Every task's verification step is a **manual check**: a throwaway `tsx` script (written, run, then deleted) for pure logic, or `curl`/browser against the running `npm run dev` server for HTTP-facing behavior.
- Do **not** modify `lib/security-headers.ts` or `middleware.ts` in this plan — the whole point of the thumbnail-route architecture is to avoid touching the global CSP.
- Thumbnails are JPEG, resized to 400px width, quality 80 (validated during planning: produces ~20KB files from a full A4 page render, fully legible).
- Thumbnail generation is lazy (on first admin request) and cached permanently in S3 + a `thumbnail_s3_key` column — never regenerated once cached.
- If thumbnail generation fails for any reason, the affected card must fall back to a generic icon card — the page must never break or show a broken-image icon.
- This work continues on the existing branch `feature/edital-admin-panel` (PR #10, not yet merged) — all tasks commit directly to that branch, no new worktree/branch needed.
- Match existing Portuguese UI copy and code-comment conventions, and the dark-theme Tailwind palette already used throughout `/admin/*` (`bg-slate-900/40`, `border-slate-800`, accent `#22AE84`).

---

### Task 1: Thumbnail generation library + S3 byte-fetch helper

**Files:**
- Create: `lib/thumbnail.ts`
- Modify: `lib/s3.ts`
- Modify: `package.json` (add `pdf-to-img` dependency)

**Interfaces:**
- Produces: `generateThumbnailFromPdf(pdfBuffer: Buffer): Promise<Buffer>`, `generateThumbnailFromImage(imageBuffer: Buffer): Promise<Buffer>` (both in `lib/thumbnail.ts`); `getFileBytes(filePath: string): Promise<Buffer>` (added to `lib/s3.ts`)

- [ ] **Step 1: Install the dependency**

```bash
npm install pdf-to-img
```

- [ ] **Step 2: Add `getFileBytes` to `lib/s3.ts`**

Add this function to `lib/s3.ts`, immediately after the existing `getSignedFileUrl` function:

```typescript
export async function getFileBytes(filePath: string): Promise<Buffer> {
  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: filePath,
  });

  const response = await s3Client.send(command);
  const bytes = await response.Body?.transformToByteArray();

  if (!bytes) {
    throw new Error(`Arquivo vazio ou não encontrado no S3: ${filePath}`);
  }

  return Buffer.from(bytes);
}
```

- [ ] **Step 3: Write `lib/thumbnail.ts`**

```typescript
/**
 * Gera miniaturas (JPEG, ~400px de largura) para preview no painel admin.
 * PDFs: renderiza a 1ª página via pdf-to-img (sem dependência nativa de
 * canvas — importante pro build Docker Alpine/arm64 do projeto) e comprime
 * com sharp. Imagens: só redimensiona/comprime com sharp.
 */

import sharp from 'sharp';
import { pdf } from 'pdf-to-img';

const THUMBNAIL_WIDTH = 400;
const THUMBNAIL_QUALITY = 80;

export async function generateThumbnailFromPdf(pdfBuffer: Buffer): Promise<Buffer> {
  const document = await pdf(pdfBuffer, { scale: 1.5 });
  const firstPage = await document.getPage(1);

  return sharp(firstPage)
    .resize({ width: THUMBNAIL_WIDTH })
    .jpeg({ quality: THUMBNAIL_QUALITY })
    .toBuffer();
}

export async function generateThumbnailFromImage(imageBuffer: Buffer): Promise<Buffer> {
  return sharp(imageBuffer)
    .resize({ width: THUMBNAIL_WIDTH })
    .jpeg({ quality: THUMBNAIL_QUALITY })
    .toBuffer();
}
```

- [ ] **Step 4: Manual verification script**

Create a throwaway file `_test-thumbnail.ts` at the project root:

```typescript
import { generateCommunityCertificatePdf } from './lib/community-certificate-pdf';
import { generateThumbnailFromPdf, generateThumbnailFromImage } from './lib/thumbnail';
import { writeFileSync } from 'fs';

(async () => {
  const pdfBuffer = await generateCommunityCertificatePdf({
    fullName: 'Teste Verificação',
    cpf: '12345678900',
    registrationId: 1,
    registrationDate: new Date(),
  });

  const pdfThumb = await generateThumbnailFromPdf(pdfBuffer);
  writeFileSync('_verify-pdf-thumb.jpg', pdfThumb);
  console.log('Miniatura de PDF gerada:', pdfThumb.length, 'bytes (deve ser bem menor que', pdfBuffer.length, ')');

  // 1x1 PNG vermelho, só pra validar o caminho de imagem sem depender de um arquivo externo
  const tinyPng = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
    'base64'
  );
  const imageThumb = await generateThumbnailFromImage(tinyPng);
  console.log('Miniatura de imagem gerada:', imageThumb.length, 'bytes');
})().catch((e) => {
  console.error('FALHOU:', e);
  process.exit(1);
});
```

Run: `npx tsx _test-thumbnail.ts`

Expected output: two success lines, no errors. `_verify-pdf-thumb.jpg` should be roughly 15-30KB (open it to confirm it's a legible rendering of the certificate's first page — text and the Innovatis letterhead should be visible).

- [ ] **Step 5: Delete the throwaway script and its output**

```bash
rm _test-thumbnail.ts _verify-pdf-thumb.jpg
```

- [ ] **Step 6: Commit**

```bash
git add lib/thumbnail.ts lib/s3.ts package.json package-lock.json
git commit -m "feat: adiciona geracao de miniatura de PDF e imagem para o painel admin"
```

---

### Task 2: Database migration for thumbnail storage

**Files:**
- Create: `database/migrations/011_add_thumbnail_support.sql`
- Modify: `run-migration.js`

**Interfaces:**
- Produces: `edital_submission_documents.thumbnail_s3_key` (TEXT, nullable), `registrations.community_certificate_thumbnail_s3_key` (TEXT, nullable)

- [ ] **Step 1: Write the migration**

```sql
-- Migration: Suporte a miniaturas no painel admin
-- Data: 2026-07-23
-- Descrição: colunas para cachear a miniatura (1ª página renderizada, para
-- PDFs; versão redimensionada, para fotos/certificado) gerada sob demanda
-- na primeira visualização de cada documento no painel admin.

ALTER TABLE edital_submission_documents ADD COLUMN IF NOT EXISTS thumbnail_s3_key TEXT;
ALTER TABLE registrations ADD COLUMN IF NOT EXISTS community_certificate_thumbnail_s3_key TEXT;

COMMENT ON COLUMN edital_submission_documents.thumbnail_s3_key IS 'Chave S3 da miniatura (JPEG, ~400px) gerada sob demanda na primeira visualização do documento no painel admin. NULL até a primeira geração.';
COMMENT ON COLUMN registrations.community_certificate_thumbnail_s3_key IS 'Chave S3 da miniatura (JPEG, ~400px) do Certificado de Inscrição na Comunidade, gerada sob demanda na primeira visualização no painel admin. NULL até a primeira geração.';
```

- [ ] **Step 2: Add it to `run-migration.js`**

In `run-migration.js`, add the new file to the `migrations` array (after the existing last entry):

```javascript
    const migrations = [
      'database/migrations/008_add_extra_legal_fields.sql',
      'database/migrations/008_add_address_fields.sql',
      'database/migrations/009_create_edital_submissions.sql',
      'database/migrations/010_add_community_certificate_to_registrations.sql',
      'database/migrations/011_add_thumbnail_support.sql'
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
  const sql = fs.readFileSync('database/migrations/011_add_thumbnail_support.sql', 'utf8');
  await pool.query(sql);
  console.log('Migration 011 aplicada com sucesso.');
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
  const res = await pool.query(\"SELECT column_name FROM information_schema.columns WHERE (table_name='edital_submission_documents' AND column_name='thumbnail_s3_key') OR (table_name='registrations' AND column_name='community_certificate_thumbnail_s3_key')\");
  console.table(res.rows);
  await pool.end();
})();
"
```

Expected: 2 rows returned.

- [ ] **Step 5: Commit**

```bash
git add database/migrations/011_add_thumbnail_support.sql run-migration.js
git commit -m "feat: adiciona colunas de cache de miniatura no banco"
```

---

### Task 3: Document thumbnail route

**Files:**
- Create: `app/api/editais/documento/[id]/thumbnail/route.ts`

**Interfaces:**
- Consumes: `verifyAdminSessionToken`, `ADMIN_SESSION_COOKIE_NAME` (from `lib/admin-auth.ts`); `getFileBytes`, `uploadFileToKey` (from `lib/s3.ts`); `generateThumbnailFromPdf`, `generateThumbnailFromImage` (Task 1); `query`, `queryOne` (from `lib/db.ts`)
- Produces: `GET /api/editais/documento/[id]/thumbnail` — 200 with `image/jpeg` bytes on success, 401 unauthenticated, 404 unknown document, 500 on generation failure

- [ ] **Step 1: Write the route**

```typescript
/**
 * GET /api/editais/documento/:id/thumbnail
 * Serve a miniatura (JPEG) de um documento do Edital PPI, gerando e
 * cacheando no S3 na primeira visita. Servido pelo próprio domínio (sem
 * redirect para o S3) para satisfazer o img-src 'self' do CSP sem precisar
 * allowlistar o bucket. Protegido pela mesma sessão admin das rotas /link.
 */

import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db';
import { getFileBytes, uploadFileToKey } from '@/lib/s3';
import { verifyAdminSessionToken, ADMIN_SESSION_COOKIE_NAME } from '@/lib/admin-auth';
import { generateThumbnailFromPdf, generateThumbnailFromImage } from '@/lib/thumbnail';

interface DocumentRow {
  id: number;
  submission_id: number;
  s3_key: string;
  mime_type: string;
  thumbnail_s3_key: string | null;
}

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

    const document = await queryOne<DocumentRow>(
      `SELECT id, submission_id, s3_key, mime_type, thumbnail_s3_key
       FROM edital_submission_documents
       WHERE id = $1
       LIMIT 1`,
      [documentId]
    );

    if (!document) {
      return NextResponse.json({ error: 'Documento não encontrado' }, { status: 404 });
    }

    let thumbnailKey = document.thumbnail_s3_key;

    if (!thumbnailKey) {
      const originalBytes = await getFileBytes(document.s3_key);
      const thumbnailBuffer = document.mime_type === 'application/pdf'
        ? await generateThumbnailFromPdf(originalBytes)
        : await generateThumbnailFromImage(originalBytes);

      thumbnailKey = `edital-submissions/${document.submission_id}/thumbnails/${document.id}.jpg`;
      await uploadFileToKey(thumbnailBuffer, thumbnailKey, 'image/jpeg');

      await query(
        `UPDATE edital_submission_documents SET thumbnail_s3_key = $1 WHERE id = $2`,
        [thumbnailKey, documentId]
      );
    }

    const thumbnailBytes = await getFileBytes(thumbnailKey);

    return new NextResponse(thumbnailBytes, {
      status: 200,
      headers: {
        'Content-Type': 'image/jpeg',
        'Cache-Control': 'private, max-age=3600',
      },
    });
  } catch (error) {
    console.error('[editais-documento-thumbnail] Erro ao gerar miniatura:', error);
    return NextResponse.json({ error: 'Erro ao gerar miniatura' }, { status: 500 });
  }
}
```

- [ ] **Step 2: Manual verification against the running dev server**

Start `npm run dev` in the background if not already running. Log in first to get a session cookie (same pattern as prior tasks in this feature: `POST /api/admin/login` with the real `ADMIN_PASSWORD` from `.env`). Then, using document id `1` (a real `8.1.1` PDF from submission #1) and document id `8` (a real photo from the same submission):

```bash
curl -s -o /dev/null -w "sem sessao: %{http_code}\n" http://localhost:3000/api/editais/documento/1/thumbnail

curl -s -o /tmp/thumb-pdf-first.jpg -w "primeira vez (PDF): %{http_code}, %{size_download} bytes\n" --cookie "admin_session=<value>" http://localhost:3000/api/editais/documento/1/thumbnail

curl -s -o /tmp/thumb-pdf-cached.jpg -w "segunda vez, do cache (PDF): %{http_code}, %{size_download} bytes\n" --cookie "admin_session=<value>" http://localhost:3000/api/editais/documento/1/thumbnail

curl -s -o /tmp/thumb-photo.jpg -w "foto: %{http_code}, %{size_download} bytes\n" --cookie "admin_session=<value>" http://localhost:3000/api/editais/documento/8/thumbnail
```

Expected: first call `401`; the three authenticated calls all `200` with a non-trivial byte count (a few KB to a few dozen KB, not 0). Open `/tmp/thumb-pdf-first.jpg` to confirm it's a legible rendering. **Do not paste the raw `admin_session` cookie value into your report** — write `<redacted>` in its place; this was flagged as a real credential-leakage issue in earlier tasks of this same feature.

Stop the dev server when done.

- [ ] **Step 3: Commit**

```bash
git add "app/api/editais/documento/[id]/thumbnail/route.ts"
git commit -m "feat: adiciona rota de miniatura de documento do Edital"
```

---

### Task 4: Certificate thumbnail route

**Files:**
- Create: `app/api/editais/certificado/[registrationId]/thumbnail/route.ts`

**Interfaces:**
- Consumes: same as Task 3, but querying `registrations` instead of `edital_submission_documents`
- Produces: `GET /api/editais/certificado/[registrationId]/thumbnail` — same status-code contract as Task 3

- [ ] **Step 1: Write the route**

```typescript
/**
 * GET /api/editais/certificado/:registrationId/thumbnail
 * Serve a miniatura (JPEG) do Certificado de Inscrição na Comunidade,
 * gerando e cacheando no S3 na primeira visita. Mesmo padrão de
 * /api/editais/documento/[id]/thumbnail — servido pelo próprio domínio,
 * sem precisar allowlistar o S3 no CSP.
 */

import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db';
import { getFileBytes, uploadFileToKey } from '@/lib/s3';
import { verifyAdminSessionToken, ADMIN_SESSION_COOKIE_NAME } from '@/lib/admin-auth';
import { generateThumbnailFromPdf } from '@/lib/thumbnail';

interface RegistrationRow {
  id: number;
  community_certificate_s3_key: string | null;
  community_certificate_thumbnail_s3_key: string | null;
}

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

    const registration = await queryOne<RegistrationRow>(
      `SELECT id, community_certificate_s3_key, community_certificate_thumbnail_s3_key
       FROM registrations
       WHERE id = $1
       LIMIT 1`,
      [id]
    );

    if (!registration?.community_certificate_s3_key) {
      return NextResponse.json({ error: 'Certificado não encontrado' }, { status: 404 });
    }

    let thumbnailKey = registration.community_certificate_thumbnail_s3_key;

    if (!thumbnailKey) {
      const originalBytes = await getFileBytes(registration.community_certificate_s3_key);
      const thumbnailBuffer = await generateThumbnailFromPdf(originalBytes);

      thumbnailKey = `community-certificates/${id}-thumb.jpg`;
      await uploadFileToKey(thumbnailBuffer, thumbnailKey, 'image/jpeg');

      await query(
        `UPDATE registrations SET community_certificate_thumbnail_s3_key = $1 WHERE id = $2`,
        [thumbnailKey, id]
      );
    }

    const thumbnailBytes = await getFileBytes(thumbnailKey);

    return new NextResponse(thumbnailBytes, {
      status: 200,
      headers: {
        'Content-Type': 'image/jpeg',
        'Cache-Control': 'private, max-age=3600',
      },
    });
  } catch (error) {
    console.error('[editais-certificado-thumbnail] Erro ao gerar miniatura:', error);
    return NextResponse.json({ error: 'Erro ao gerar miniatura' }, { status: 500 });
  }
}
```

- [ ] **Step 2: Manual verification against the running dev server**

Same pattern as Task 3, using registration id `23` (has a real certificate already generated):

```bash
curl -s -o /dev/null -w "sem sessao: %{http_code}\n" http://localhost:3000/api/editais/certificado/23/thumbnail

curl -s -o /tmp/thumb-cert.jpg -w "certificado: %{http_code}, %{size_download} bytes\n" --cookie "admin_session=<value>" http://localhost:3000/api/editais/certificado/23/thumbnail
```

Expected: `401` then `200` with a non-trivial byte count. Cookie value redacted in your report, as in Task 3.

- [ ] **Step 3: Commit**

```bash
git add "app/api/editais/certificado/[registrationId]/thumbnail/route.ts"
git commit -m "feat: adiciona rota de miniatura do certificado de inscricao"
```

---

### Task 5: Reusable ThumbnailCard component

**Files:**
- Create: `app/components/admin/ThumbnailCard.tsx`

**Interfaces:**
- Produces: `<ThumbnailCard thumbnailUrl={string} openUrl={string} label={string} aspectClassName?={string} />` (default export, client component)

- [ ] **Step 1: Write the component**

```typescript
'use client'

import { useState } from 'react'
import { FileText } from 'lucide-react'

interface ThumbnailCardProps {
  thumbnailUrl: string
  openUrl: string
  label: string
  aspectClassName?: string
}

export default function ThumbnailCard({
  thumbnailUrl,
  openUrl,
  label,
  aspectClassName = 'aspect-[3/4]',
}: ThumbnailCardProps) {
  const [failed, setFailed] = useState(false)

  return (
    <a
      href={openUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={`group relative block ${aspectClassName} rounded-xl overflow-hidden border border-slate-700/50 bg-slate-900/60 hover:border-[#22AE84]/50 transition-colors`}
      title={label}
    >
      {failed ? (
        <div className="flex flex-col items-center justify-center gap-2 w-full h-full text-slate-500 p-3">
          <FileText className="w-8 h-8 flex-shrink-0" />
          <span className="text-xs font-medium text-center line-clamp-2">{label}</span>
        </div>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={thumbnailUrl}
          alt={label}
          onError={() => setFailed(true)}
          className="w-full h-full object-cover"
        />
      )}
      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors pointer-events-none" />
    </a>
  )
}
```

- [ ] **Step 2: Verify it compiles**

```bash
npx tsc --noEmit
```

Expected: no errors. (Full visual verification of this component happens in Task 7, once it's actually used on the detail page — a component with no caller can't be meaningfully checked in isolation beyond type-checking.)

- [ ] **Step 3: Commit**

```bash
git add app/components/admin/ThumbnailCard.tsx
git commit -m "feat: adiciona componente ThumbnailCard com fallback para o painel admin"
```

---

### Task 6: Redesign the proposals list page

**Files:**
- Modify: `app/admin/editais/page.tsx`

**Interfaces:**
- Consumes: unchanged (`verifyAdminSessionToken`, `ADMIN_SESSION_COOKIE_NAME`, `query`) — this task only changes the JSX returned, not the data-loading logic

- [ ] **Step 1: Replace the returned JSX**

Replace the full content of `app/admin/editais/page.tsx`:

```typescript
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
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
              className="group flex items-center gap-4 bg-slate-900/40 hover:bg-slate-900/60 border border-slate-800 hover:border-[#22AE84]/40 rounded-2xl p-6 transition-all"
            >
              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-[#22AE84]/10 flex items-center justify-center text-[#22AE84] font-bold text-lg">
                {submission.full_name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white font-bold truncate">{submission.full_name}</p>
                <p className="text-sm text-slate-400 truncate">
                  {submission.institution_name || 'Sem instituição informada'}
                </p>
              </div>
              <div className="text-right flex-shrink-0">
                <span className="inline-block px-3 py-1 bg-[#22AE84]/20 text-[#22AE84] rounded-full text-xs font-bold">
                  {submission.status}
                </span>
                <p className="text-xs text-slate-500 mt-2">
                  {new Date(submission.submitted_at).toLocaleString('pt-BR')}
                </p>
              </div>
              <ChevronRight className="w-5 h-5 text-slate-600 group-hover:text-[#22AE84] transition-colors flex-shrink-0" />
            </Link>
          ))}
        </div>
      </div>
    </main>
  )
}
```

- [ ] **Step 2: Manual verification**

Start `npm run dev`, log in, visit `/admin/editais` in a browser. Confirm: submission #1 shows as a card with a circular avatar initial ("T" for "Teste"), name, institution ("Teste"), a green `SUBMITTED` badge, formatted date, and a chevron on the right; hovering highlights the border and darkens the background slightly. Stop the dev server when done (or leave it running if you're about to start Task 7 — your choice, just note which in the report).

- [ ] **Step 3: Commit**

```bash
git add app/admin/editais/page.tsx
git commit -m "feat: redesenha a lista de propostas do painel admin"
```

---

### Task 7: Redesign the proposal detail page into blocks with thumbnails

**Files:**
- Modify: `app/admin/editais/[id]/page.tsx`

**Interfaces:**
- Consumes: `ThumbnailCard` (Task 5); `EDITAL_STEP_BY_DOCUMENT_CODE`, `EDITAL_DOCUMENT_LABELS` (from `lib/edital-completeness.ts`, already exist); `EDITAL_REQUIRED_DOCUMENT_CODES`, `EDITAL_PHOTO_DOCUMENT_CODE` (from `lib/edital-requirements.ts`, already exist)

- [ ] **Step 1: Replace the full file content**

```typescript
import { cookies } from 'next/headers'
import { redirect, notFound } from 'next/navigation'
import { Users, Building2, FileText, Camera, FileCheck, Award } from 'lucide-react'
import { query, queryOne } from '@/lib/db'
import { verifyAdminSessionToken, ADMIN_SESSION_COOKIE_NAME } from '@/lib/admin-auth'
import { EDITAL_DOCUMENT_LABELS, EDITAL_STEP_BY_DOCUMENT_CODE } from '@/lib/edital-completeness'
import { EDITAL_REQUIRED_DOCUMENT_CODES, EDITAL_PHOTO_DOCUMENT_CODE } from '@/lib/edital-requirements'
import ThumbnailCard from '@/app/components/admin/ThumbnailCard'

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

  return (
    <main className="flex-1 relative z-10 min-h-screen px-4 py-16">
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">{submission.full_name}</h1>
          <p className="text-slate-400">
            CPF {submission.cpf} · Enviada em {new Date(submission.submitted_at).toLocaleString('pt-BR')}
          </p>
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

- [ ] **Step 2: Manual verification in the browser**

Start `npm run dev`, log in, visit `/admin/editais/1`. Confirm:
- Six vertical blocks render in order: Equipe, Instituição, Proposta, Fotos do laboratório, Declarações, Certificado — each with an icon and title.
- Equipe block shows the team description text plus 4 document thumbnails (real rendered PDF-page images, not broken icons — since submission #1 has all 4 of those documents uploaded).
- Instituição block shows institution/lab text plus 3 document thumbnails.
- Proposta block shows technical justification, expected results, and the one budget item — no document grid (this block has none).
- Fotos block shows the floor-plan document thumbnail (`8.1.9`) plus a 4-photo grid, all with real image thumbnails.
- Declarações block shows 2 document thumbnails.
- Certificado block shows one thumbnail.
- Every thumbnail, when clicked, opens the real document/photo/certificate in a new tab (the existing `/link` route — unchanged by this task).
- Reload the page a second time and confirm it feels faster for documents you already viewed (cached thumbnails, no regeneration) — check server logs or just general responsiveness, no exact timing required.

Stop the dev server when done.

- [ ] **Step 3: Commit**

```bash
git add "app/admin/editais/[id]/page.tsx"
git commit -m "feat: redesenha o detalhe da proposta em blocos com miniaturas reais"
```

---

### Task 8: Fallback verification + CLAUDE.md update

**Files:**
- Modify: `CLAUDE.md`

**Interfaces:**
- Consumes: everything from Tasks 1-7

- [ ] **Step 1: Verify the fallback path actually works**

This is the one behavior no other task's happy-path check exercises: confirm a failed thumbnail generation degrades to the generic icon card instead of breaking the page.

Temporarily break one document's `s3_key` to force a generation failure, observe the fallback, then restore it:

```bash
node -e "
require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
(async () => {
  const before = await pool.query(\"SELECT s3_key FROM edital_submission_documents WHERE id = 1\");
  console.log('s3_key original:', before.rows[0].s3_key);
  await pool.query(\"UPDATE edital_submission_documents SET s3_key = 'chave-invalida-de-teste' WHERE id = 1\");
  console.log('s3_key temporariamente quebrada para o documento 1.');
  await pool.end();
})();
"
```

With `npm run dev` running and logged in, visit `/admin/editais/1` in a real browser (not curl — you need to see the rendered fallback UI, not just a status code) and confirm the first document card in the "Equipe" block shows the generic file icon + label instead of a broken image or a blank space. Then restore the original value:

```bash
node -e "
require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
(async () => {
  await pool.query(\"UPDATE edital_submission_documents SET s3_key = 'edital-submissions/1/c8dd1fd1-523c-43b9-b3b9-061bd30a4b9b-8.1.1' WHERE id = 1\");
  console.log('s3_key restaurada.');
  await pool.end();
})();
"
```

(The restore value above is the real, currently-known `s3_key` for document id 1 in this database, captured during earlier work on this feature — if the "s3_key original" printed by the first script differs from this, use the printed value instead, not the one hardcoded here.)

Also confirm the `thumbnail_s3_key` for document 1 was NOT set during this failed attempt (a failure must not poison the cache with a bad reference):

```bash
node -e "
require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
(async () => {
  const res = await pool.query(\"SELECT thumbnail_s3_key FROM edital_submission_documents WHERE id = 1\");
  console.log('thumbnail_s3_key:', res.rows[0].thumbnail_s3_key);
  await pool.end();
})();
"
```

Expected: `null` (or, if it was already cached from Task 3's earlier verification against a *working* `s3_key`, that's fine too — the important check is that a failed generation attempt itself never writes a bad key). If this test document happens to already have a cached thumbnail from Task 3's verification, use a different document id (e.g. `2`) for this failure test instead, so you're actually forcing a fresh generation attempt to fail.

- [ ] **Step 2: Add to `CLAUDE.md`**

In `CLAUDE.md`, in the existing "### Admin panel (Edital submissions)" section (added in the prior PR for this feature), add one paragraph after the existing content:

```markdown
Documents, photos, and the community certificate render as real content thumbnails (PDF first page rendered to an image via `pdf-to-img`; photos resized via `sharp`) rather than plain links — generated lazily on first admin view and cached permanently in S3 (`thumbnail_s3_key` on `edital_submission_documents`, `community_certificate_thumbnail_s3_key` on `registrations`), served through same-origin thumbnail routes (`/api/editais/documento/[id]/thumbnail`, `/api/editais/certificado/[registrationId]/thumbnail`) rather than a redirect to S3 — this is what lets them satisfy the site's `img-src 'self'` CSP without allowlisting the S3 bucket. `ThumbnailCard` (`app/components/admin/ThumbnailCard.tsx`) falls back to a generic icon card via an `onError` handler if generation fails, so a bad PDF never breaks the page.
```

- [ ] **Step 3: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: documenta as miniaturas do painel admin em CLAUDE.md"
```

---

## Self-Review Notes

- **Spec coverage:** lazy generation + S3 cache ✅ (Tasks 1, 3, 4), no CSP changes ✅ (same-origin streaming routes, explicitly called out in Global Constraints), migration for `thumbnail_s3_key` on both tables ✅ (Task 2), generic-icon fallback on failure ✅ (Task 5's `ThumbnailCard`, verified end-to-end in Task 8), list page redesign ✅ (Task 6), detail page redesigned into vertical blocks matching wizard categories (equipe/instituição/proposta/fotos/declarações/certificado) ✅ (Task 7, using the existing `EDITAL_STEP_BY_DOCUMENT_CODE` mapping rather than a new hardcoded grouping), CLAUDE.md updated ✅ (Task 8).
- **Placeholder scan:** no TBD/TODO; every code block is complete, and the PDF rendering approach was independently verified end-to-end during planning (not just assumed to work) — real output sizes and a rendered image were confirmed before this plan was written.
- **Type consistency:** `generateThumbnailFromPdf`/`generateThumbnailFromImage` (Task 1) are imported with identical signatures in Tasks 3 and 4. `getFileBytes` (Task 1) is used identically in Tasks 3 and 4. `ThumbnailCard`'s props (`thumbnailUrl`, `openUrl`, `label`, `aspectClassName`) match exactly between its definition (Task 5) and every call site (Task 7). `getDocumentCodesForStep` reuses the existing `EDITAL_STEP_BY_DOCUMENT_CODE` export rather than duplicating the equipe/instituicao/fotos/declaracoes grouping logic that already exists in `lib/edital-completeness.ts`.
