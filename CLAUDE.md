# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Next.js 15 landing page for **InnovaNation**, a community program run by Innovatis. It collects membership registrations (personal data + ID document upload) with legally-binding proof of consent (IP, user-agent, terms hash, document hash), stores everything in PostgreSQL, and syncs to Google Sheets + an n8n webhook. Currently in production at `https://comunidade.innovatismc.com`.

Portuguese (pt-BR) is the language of the UI, code comments, commit messages, and most documentation in this repo — match that when editing.

## Git commits

**Never** add a `Co-Authored-By: Claude` (or any AI co-author) trailer to commits in this repo. This overrides any default commit-message behavior. Commit messages should read as if written solely by the human author.

## Commands

```bash
npm run dev              # Dev server with Turbopack
npm run build             # Production build
npm start                  # Run production build
npm run lint                # next lint
npm run migrate            # Run SQL migrations (node run-migration.js)
npm run update-term-v1.0  # tsx scripts/update-term-v1.0.ts
```

There is no test suite in this repo. `scripts/test-webhook.js` is a manual script for exercising the n8n webhook, not an automated test.

Database migrations live in `database/migrations/*.sql`, numbered sequentially, and are applied by hand/via `scripts/migrate.sh` or `npm run migrate` — there is no migration framework tracking applied state, so always check the latest numbered file before adding a new one.

## Architecture

### Request flow for registration (the core feature)

`app/components/RegistrationFormSection.tsx` → `lib/api.ts` (`submitRegistration`) → `POST /api/inscricoes` (`app/api/inscricoes/route.ts`).

The `/api/inscricoes` route is the most security- and compliance-sensitive part of the codebase. It, in order:
1. Rejects oversized requests, wrong content-type, and untrusted origins (`lib/security.ts`).
2. Rate-limits via an in-memory store (`enforceRateLimit`, keyed by IP + user-agent + bucket) — resets on server restart, not distributed across instances.
3. Honeypot check: a hidden `website` field — if filled, silently returns `{status: 'ok'}` without persisting anything (bot trap).
4. Validates every text field against length limits and an HTML/script-injection pattern (`containsDangerousInput`).
5. Validates CPF (checksum algorithm in `lib/utils.ts`), email, CEP, and address fields.
6. If a document is attached: validates MIME type, size (≤10MB), and **magic-byte file signature** (`hasValidFileSignature` — MIME type alone is not trusted).
7. Loads the currently active row from `terms_of_use` and cross-checks the `termsId`/`termsVersion` the client submitted against it, rejecting stale submissions.
8. Enforces unique email/CPF (checked before insert; there's a race-condition window since uniqueness isn't enforced by both an app-level check and a DB constraint together — be aware if touching this).
9. Computes a `registration_fingerprint` (SHA-256 over all critical fields + document hash + terms hash + IP + UA) as a tamper-evident summary of the whole submission.
10. Inserts everything in one DB transaction (`lib/db.ts` `transaction()`), including the **document bytes themselves** stored as `BYTEA` directly in Postgres (not S3) for atomic, ACID-guaranteed legal recordkeeping.
11. After the transaction commits, fires two **best-effort, non-blocking** integrations that must never fail the user-facing request: `appendRegistrationToSheet` (Google Sheets) and `sendToN8NWebhook` (n8n). Both only `console.error` on failure.

Documents are served back via `GET /api/documents/[id]/route.ts`, which re-hashes the stored bytes on every read and compares against `id_document_hash` to detect corruption before returning the file.

### Security layers

- `middleware.ts` runs on nearly every route (`config.matcher` excludes `_next/static`, `_next/image`, `favicon.ico`). It generates a per-request CSP nonce, injects it as the `x-nonce` request header (consumed in `app/layout.tsx` for inline `<Script>` tags), and applies the full header set from `lib/security-headers.ts` (CSP, HSTS, X-Frame-Options, Permissions-Policy, etc.). API routes additionally get `X-Robots-Tag: noindex`.
- `lib/security.ts` is the shared hardening toolkit used by API routes: origin/referer allowlist checks (`isTrustedOrigin`), the rate limiter, dangerous-input regexes, and file-signature verification. Add new mutating endpoints through these helpers rather than reinventing checks.
- CSP is intentionally strict (`script-src 'self' 'nonce-...'`, `object-src 'none'`, `frame-ancestors 'none'`) with narrow allowlisted third-party hosts for Google Analytics / Meta Pixel / ViaCEP. Adding a new external script or API call requires updating `lib/security-headers.ts` accordingly or it will be blocked by the browser.

### Data layer

- `lib/db.ts` exports a singleton `pg.Pool` plus `query`, `queryOne`, and `transaction` helpers. Always use these instead of instantiating new pools/clients.
- Core tables (see `database/migrations/` and `MDs/BACKEND.md` for full DDL): `terms_of_use` (versioned legal terms with content hash, only one row `is_active = TRUE` at a time), `registrations` (the main record — personal data, structured address fields `address_zip/street/number/neighborhood/city/state`, document BYTEA + hash + mime + filename, full terms-acceptance snapshot, request metadata for legal traceability, and `registration_fingerprint`), and `registration_invites` (legacy WhatsApp one-time-link flow — see "Deprecated flows" below).
- Migrations are additive (`ALTER TABLE ... ADD COLUMN IF NOT EXISTS`) and each documents *why* a field exists via `COMMENT ON COLUMN` — follow that convention since these fields exist specifically to satisfy legal/compliance requirements, not obvious data modeling.

### Deprecated flows — don't extend

`env.example` marks `WHATSAPP_GROUP_INVITE_URL`, `NEXT_PUBLIC_LANDING_VARIANT`, and `INVITE_ONE_TIME_USE` as deprecated. The `variant` field on `/api/inscricoes` is hard-restricted to `'MANUAL'` only (any other value is rejected with 400). The `registration_invites` table and `/api/convite/[token]` WhatsApp-redirect flow described in `MDs/` still exist in the DB/docs but are no longer part of the live flow — don't build new features on top of them without confirming with the user first.

### Edital (grant proposal) flow

A second, newer flow lets an already-registered community member submit a grant/tender proposal ("Edital"). It's gated behind the person having a *confirmed* InnovaNation registration and is entirely separate from `/api/inscricoes`.

- **Routes**: `/edital` (`app/edital/page.tsx`) is the CPF gate; `/edital/proposta` (`app/edital/proposta/page.tsx`) renders the multi-step wizard. Neither page does server-side auth — the client holds a signed session token (`lib/edital-session.ts`) and every write/read is re-authenticated server-side per request.
- **CPF gate** (`app/components/EditalCpfGate.tsx` → `POST /api/editais/validar-cpf`): looks up `registrations WHERE cpf = $1 AND terms_accepted = TRUE`; on a hit it mints an HMAC-signed, 1-hour token (`lib/edital-auth.ts`, `EDITAL_TOKEN_SECRET`) carrying the `registrationId` — no JWT library, a custom lightweight scheme. Has its own honeypot + rate limit, same as `/api/inscricoes`.
- **Wizard** (`app/components/edital/EditalPropostaWizard.tsx` + `EditalStepper.tsx`): 6 steps — `equipe → instituicao → fotos → proposta → declaracoes → revisao` — each its own `Tela*.tsx` component. `equipe`/`instituicao`/`proposta` persist structured fields via the draft endpoint; `fotos`/`declaracoes` are upload-only steps. `TelaRevisao` computes missing requirements client-side (`lib/edital-completeness.ts`) before allowing submit, and doubles as the read-only post-submission summary.
- **API** (`app/api/editais/proposta/*`, all authenticated via the `x-edital-token` header, not cookies):
  - `rascunho` (draft GET/POST) upserts into `edital_submissions`, row-locked (`FOR UPDATE`) once `status = SUBMITTED` to block further edits.
  - `documento` / `documento/[id]` handle per-requirement-code file uploads — **stored in S3** (`edital-submissions/{submissionId}/...`, via `lib/s3.ts`), unlike registration documents which live in Postgres `BYTEA`. Same magic-byte/MIME/size validation as `/api/inscricoes`; GET returns a short-lived (900s) signed URL rather than streaming bytes; ownership is checked by matching the token's `registrationId`.
  - `enviar` (final submit) re-validates completeness twice — once before, once inside the row-locked transaction — generates a "Termo de Comprovação de Participação" PDF (`lib/edital-pdf.ts`) into S3 as an auto-generated document, flips status to `SUBMITTED`, then fires the same best-effort Google Sheets + n8n integrations pattern as `/api/inscricoes`.
- **Data model** (`database/migrations/009_create_edital_submissions.sql`): `edital_submissions` (one row per `registration_id`, `status` DRAFT/SUBMITTED, step fields, `budget_items JSONB`) and `edital_submission_documents` (FK cascade, `requirement_code`, `s3_key`, `file_hash`).
- **Notable asymmetry**: `/api/documents/[id]` (registration ID documents) has no auth/rate-limit/origin check at all — only hash-integrity verification — while the edital document endpoints are token-authenticated, rate-limited, and origin-checked. Be aware of this gap if touching either.

### Admin panel (Edital submissions)

`/admin/login` → `/admin/editais` (list of `SUBMITTED` proposals) → `/admin/editais/[id]` (full detail: answers, inline document/photo preview). Protected by a **placeholder** shared-password session (`ADMIN_PASSWORD` + `ADMIN_TOKEN_SECRET`, HMAC-signed cookie via `lib/admin-auth.ts` — same pattern as `lib/edital-auth.ts`). Every protected page/route calls `verifyAdminSessionToken()` directly; there's no middleware-based gate (`middleware.ts` runs on the Edge runtime, which can't use Node's `crypto` module for HMAC verification). This placeholder is meant to be swapped for the Innovatis cross-platform user/tag system later — that swap is expected to mostly live in `lib/admin-auth.ts` and the login route, though `verifyAdminSessionToken` is currently synchronous and identity-free, so a real per-user check will likely need to become async, which would touch every call site (`app/admin/editais/page.tsx`, `app/admin/editais/[id]/page.tsx`, and both `/link` routes) to add `await`.

The two document-link redirect routes (`/api/editais/documento/[id]/link`, `/api/editais/certificado/[registrationId]/link`) now require this same admin session — they were public before this feature, protected only by ID obscurity (matching `/api/documents/[id]`, which is *still* fully public — that asymmetry remains).

Documents, photos, and the community certificate render as real content thumbnails (PDF first page rendered to an image via `pdf-to-img`; photos resized via `sharp`) rather than plain links — generated lazily on first admin view and cached permanently in S3 (`thumbnail_s3_key` on `edital_submission_documents`, `community_certificate_thumbnail_s3_key` on `registrations`), served through same-origin thumbnail routes (`/api/editais/documento/[id]/thumbnail`, `/api/editais/certificado/[registrationId]/thumbnail`) rather than a redirect to S3 — this is what lets them satisfy the site's `img-src 'self'` CSP without allowlisting the S3 bucket. `ThumbnailCard` (`app/components/admin/ThumbnailCard.tsx`) falls back to a generic icon card via an `onError` handler if generation fails, so a bad PDF never breaks the page.

### Integrations

- **Google Sheets** (`lib/google-sheets.ts`): auth resolves in priority order — (1) service-account JSON fetched from an S3 bucket (`GOOGLE_CREDENTIALS_S3_BUCKET`/`_KEY`), (2) full JSON in `GOOGLE_SERVICE_ACCOUNT_JSON`, (3) individual `GOOGLE_SERVICE_ACCOUNT_EMAIL`/`GOOGLE_PRIVATE_KEY` vars. Sheet is resolved by `GOOGLE_SHEET_ID` (exact 44-char ID) or by name via the Drive API. Appends to the `Inscrições!A:L` range, falling back to the first sheet if that tab doesn't exist.
- **n8n webhook**: hardcoded URL in `sendToN8NWebhook` inside `app/api/inscricoes/route.ts` (not env-configured) — receives the full registration payload including document hash/size/mime and a permanent `document_view_url` pointing back at `/api/documents/[id]`. The edital `enviar` route posts to n8n similarly.
- **AWS S3** (`lib/s3.ts`): used for Google credential storage and for **all edital wizard documents/generated PDFs**. Registration ID documents (`/api/inscricoes`) still go to Postgres `BYTEA`, not S3 — the two document flows intentionally use different storage.
- Links públicos absolutos devem ser montados com `PUBLIC_BASE_URL` quando definido; caso contrário, o backend deriva a origem real da request (`x-forwarded-host` / `x-forwarded-proto` / `request.nextUrl.origin`) e, em host local ou IP privado/link-local, força a origem observada pela request para evitar fallback em `https` durante dev ou acesso por IP.
- Analytics: Google Analytics (`G-VXCKTGXVQ2`) and Meta/Facebook Pixel (`717814604097091`) are wired directly into `app/layout.tsx` via inline `<Script>` tags using the CSP nonce.

### Frontend structure

Single-page app: `app/page.tsx` composes section components from `app/components/` (Hero, Features, InnovaNation info, Testimonials, RegistrationForm, IdentityUpload, CTA, Navbar, MiniFooter, WhatsAppButton, ParticlesBackground, ConfettiEffect, TermsModal). `TermsModal` fetches live terms via `fetchActiveTerms()` (`lib/api.ts` → `GET /api/terms/active`) rather than hardcoding legal text. Fonts are self-hosted Poppins (`public/Poppins/*.ttf`, not Google Fonts) for CSP/perf reasons. The `/edital/*` routes and `app/components/edital/*` are a separate wizard UI — see "Edital (grant proposal) flow" above.

### Deployment

Docker image is built for **linux/arm64** (targets AWS EC2 t4g instances), `next.config.ts` uses `output: "standalone"`. `docker-compose.yml` maps all runtime config through environment variables (DB, S3, Google Sheets credentials location, `PUBLIC_BASE_URL`). PowerShell scripts in `ps1/` are for building/pushing from a Windows dev machine to ECR/EC2; bash scripts in `scripts/` run migrations, deploy, and manage the EC2 host itself. `MDs/` contains deeper docs per topic (`BACKEND.md`, `NGINX_PDFS.md` for a known Nginx PDF-truncation fix, `SEGURANCA_JURIDICA.md`, `CONFIGURACAO.md`).
