# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Next.js 15 landing page for **InnovaNation**, a community program run by Innovatis. It collects membership registrations (personal data + ID document upload) with legally-binding proof of consent (IP, user-agent, terms hash, document hash), stores everything in PostgreSQL, and syncs to Google Sheets + an n8n webhook. Currently in production at `https://comunidade.innovatismc.com`.

Portuguese (pt-BR) is the language of the UI, code comments, commit messages, and most documentation in this repo — match that when editing.

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

### Integrations

- **Google Sheets** (`lib/google-sheets.ts`): auth resolves in priority order — (1) service-account JSON fetched from an S3 bucket (`GOOGLE_CREDENTIALS_S3_BUCKET`/`_KEY`), (2) full JSON in `GOOGLE_SERVICE_ACCOUNT_JSON`, (3) individual `GOOGLE_SERVICE_ACCOUNT_EMAIL`/`GOOGLE_PRIVATE_KEY` vars. Sheet is resolved by `GOOGLE_SHEET_ID` (exact 44-char ID) or by name via the Drive API. Appends to the `Inscrições!A:L` range, falling back to the first sheet if that tab doesn't exist.
- **n8n webhook**: hardcoded URL in `sendToN8NWebhook` inside `app/api/inscricoes/route.ts` (not env-configured) — receives the full registration payload including document hash/size/mime and a permanent `document_view_url` pointing back at `/api/documents/[id]`.
- **AWS S3** (`lib/s3.ts`): used only for Google credential storage and (optionally) generic file upload/signed URLs — the actual ID documents go to Postgres BYTEA, not S3, despite `s3.ts` existing.
- Analytics: Google Analytics (`G-VXCKTGXVQ2`) and Meta/Facebook Pixel (`717814604097091`) are wired directly into `app/layout.tsx` via inline `<Script>` tags using the CSP nonce.

### Frontend structure

Single-page app: `app/page.tsx` composes section components from `app/components/` (Hero, Features, InnovaNation info, Testimonials, RegistrationForm, IdentityUpload, CTA, Navbar, MiniFooter, WhatsAppButton, ParticlesBackground, ConfettiEffect, TermsModal). `TermsModal` fetches live terms via `fetchActiveTerms()` (`lib/api.ts` → `GET /api/terms/active`) rather than hardcoding legal text. Fonts are self-hosted Poppins (`public/Poppins/*.ttf`, not Google Fonts) for CSP/perf reasons.

### Deployment

Docker image is built for **linux/arm64** (targets AWS EC2 t4g instances), `next.config.ts` uses `output: "standalone"`. `docker-compose.yml` maps all runtime config through environment variables (DB, S3, Google Sheets credentials location, `PUBLIC_BASE_URL`). PowerShell scripts in `ps1/` are for building/pushing from a Windows dev machine to ECR/EC2; bash scripts in `scripts/` run migrations, deploy, and manage the EC2 host itself. `MDs/` contains deeper docs per topic (`BACKEND.md`, `NGINX_PDFS.md` for a known Nginx PDF-truncation fix, `SEGURANCA_JURIDICA.md`, `CONFIGURACAO.md`).
