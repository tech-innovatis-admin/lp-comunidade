# Edital Proposta Frontend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the `/edital/proposta` wizard (6 screens) that consumes the already-implemented backend (`docs/superpowers/plans/2026-07-17-edital-proposta-backend-plan.md`) to let a validated InnovaNation member submit a full Edital PPI sponsorship proposal.

**Architecture:** A container component (`EditalPropostaWizard`) owns all state (form data, uploaded documents, current step) and talks to the API; six screen components are pure presentation, receiving data and callbacks via props; two reusable upload components (`DocumentUploadSlot`, `PhotoGallerySlot`) each own their own upload/replace/remove cycle against the document endpoints. Design ref: `docs/superpowers/specs/2026-07-21-edital-proposta-frontend-design.md`.

**Tech Stack:** Next.js 15 App Router (client components, `useState`), React 19, Tailwind (no CSS-in-JS/utility lib), `lucide-react` icons. No new dependencies.

## Global Constraints

- Every call to `/api/editais/proposta/*` sends header `X-Edital-Token` (the token from `sessionStorage`, key `edital_session` — see `lib/edital-session.ts`, Task 1).
- Token TTL is 1h (`lib/edital-auth.ts`). Any `401 { error: 'token_expired' }` response, from any endpoint, at any time, means: clear the session (`clearEditalSession()`) and redirect to `/edital?expired=1`. Never retry with the same token.
- Backend endpoints and their exact response shapes (already implemented, do not modify unless a task explicitly says so):
  - `GET /api/editais/proposta/rascunho` → `200 { ok: true, submission: EditalSubmission | null }`. `EditalSubmission` fields: `id, registrationId, status ('DRAFT'|'SUBMITTED'), teamDescription, institutionName, institutionCnpj, labName, labArea, labServedPublic` (all `string | null`), `budgetItems: {descricao, valor_estimado, justificativa}[] | null`, `technicalJustification, expectedResults` (`string | null`), `createdAt, updatedAt, submittedAt` (`string | null`, ISO), `documents: {id, requirementCode, originalFilename, mimeType, sizeBytes, uploadedAt}[]`.
  - `POST /api/editais/proposta/rascunho` body `{ step: 'equipe'|'instituicao'|'proposta', data: {...} }` → `200 { ok: true, submissionId, updatedAt }`. `data` shape per step: `equipe` → `{ team_description }`; `instituicao` → `{ institution_name, institution_cnpj, lab_name, lab_area, lab_served_public }`; `proposta` → `{ budget_items, technical_justification, expected_results }`.
  - `POST /api/editais/proposta/documento` multipart (`requirementCode`, `file`) → `200 { ok: true, documentId, requirementCode, filename }`.
  - `GET /api/editais/proposta/documento/:id` → `200 { ok: true, url }` (short-lived signed URL).
  - `DELETE /api/editais/proposta/documento/:id` → `200 { ok: true }`.
  - `POST /api/editais/proposta/enviar` → `200 { ok: true, submittedAt }`.
  - Error bodies across all of the above: `401 { error: 'token_expired' }`, `409 { error: 'already_submitted' }`, `400 { error: 'incomplete', missing: MissingItem[] }` (enviar only) where `MissingItem = {type:'document', requirementCode} | {type:'photo', required, found} | {type:'field', field}`, `429` (rate limited, has `Retry-After` header), other `400`/`403`/`404`/`500` with `{ error: string }`.
- Required document codes for a complete submission (`getSubmissionRequiredDocumentCodes()`, `lib/edital-requirements.ts`): `8.1.1, 8.1.2, 8.1.3, 8.1.4, 8.1.5, 8.1.6, 8.1.7, 8.1.9, 8.1.15, 8.1.16` (10 codes — **not** 11; `8.1.8` was removed from this list on 2026-07-21 because it was never satisfiable, see note below). Photos use the separate repeatable code `EDITAL_PHOTO_DOCUMENT_CODE` (`'foto'`), minimum `EDITAL_MIN_PHOTO_COUNT` (3), maximum `EDITAL_MAX_PHOTO_COUNT` (8). Required text fields for submission: `institution_name, institution_cnpj, lab_name, lab_area, technical_justification, expected_results`.
- **Known-fixed bug, context only:** `EDITAL_REQUIRED_DOCUMENT_CODES` used to include `'8.1.8'` (the photographic-record item), which is conceptually satisfied by the `'foto'` gallery count, not a discrete upload — no route ever wrote a document with that literal code, so it could never be checked off. Fixed in `lib/edital-requirements.ts` before this plan was written (commit on `feature/edital-proposta-envio`). No task in this plan touches that file.
- Size/length limits (`lib/edital-requirements.ts`): `EDITAL_MAX_TEXT_LENGTH = 5000` (per long text field), `EDITAL_MAX_BUDGET_ITEMS = 20`, `EDITAL_MAX_BUDGET_DESCRIPTION_LENGTH = 200`, `EDITAL_MAX_BUDGET_JUSTIFICATION_LENGTH = 500`, `EDITAL_MAX_DOCUMENT_BYTES = 10MB`, `EDITAL_MAX_PHOTO_BYTES = 5MB`. These constants must be imported from `lib/edital-requirements.ts`, never re-declared as new magic numbers.
- Visual style: dark theme, brand green `#22AE84` (hover `#1C8C6A`). Reuse the exact class patterns already used in `app/components/EditalCpfGate.tsx`: card `bg-slate-900/40 backdrop-blur-xl rounded-[2.5rem] p-8 sm:p-12 border border-slate-800 shadow-2xl`; text input `w-full px-6 py-4 bg-slate-900/60 border border-slate-700/50 rounded-2xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#22AE84]/30 focus:border-[#22AE84] transition-all font-medium`; primary button `px-6 py-4 bg-[#22AE84] hover:bg-[#1C8C6A] disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-2xl font-bold transition-all`. No new CSS utility/helper file — this codebase inlines class strings directly (confirmed: no `cn()`/`clsx` helper exists in `lib/utils.ts`).
- No automated test suite exists in this repo (confirmed in `CLAUDE.md`) and no ESLint config is runnable (confirmed while building the backend plan — `npm run lint` drops into an interactive setup wizard without a TTY). Verification for every task in this plan is `npx tsc --noEmit` passing clean, plus careful manual reading — the same bar already established and used throughout the backend plan. Do not invent a test framework or test files.
- No `Co-Authored-By: Claude` (or any AI co-author) trailer in any commit message — binding project convention.
- Portuguese (pt-BR) for all user-facing text and commit messages, matching the rest of the repo.

---

### Task 1: Shared session module and API client

**Files:**
- Create: `lib/edital-session.ts`
- Create: `lib/edital-proposta-api.ts`
- Modify: `app/components/EditalCpfGate.tsx` (use the shared session module instead of its private `SESSION_KEY` constant)

**Interfaces:**
- Consumes: nothing new (only `fetch`, `sessionStorage`)
- Produces: `EditalSessionPrefill`, `EditalSession`, `getEditalSession()`, `setEditalSession()`, `clearEditalSession()` (from `lib/edital-session.ts`); `EditalSubmissionDocument`, `EditalBudgetItem`, `EditalSubmission`, `EditalWizardData`, `EMPTY_WIZARD_DATA`, `submissionToWizardData()`, `EditalDraftStep`, `EditalMissingItem`, `EditalApiErrorReason`, `EditalApiError`, `fetchEditalDraft()`, `saveEditalDraftStep()`, `uploadEditalDocument()`, `getEditalDocumentUrl()`, `deleteEditalDocument()`, `submitEditalProposal()` (from `lib/edital-proposta-api.ts`) — every later task imports from these two files.

- [ ] **Step 1: Create the shared session module**

Create `lib/edital-session.ts`:

```ts
export const EDITAL_SESSION_KEY = 'edital_session';

export interface EditalSessionPrefill {
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

export interface EditalSession {
  token: string;
  prefill: EditalSessionPrefill;
}

export function getEditalSession(): EditalSession | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const raw = sessionStorage.getItem(EDITAL_SESSION_KEY);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed.token !== 'string' || !parsed.prefill) {
      return null;
    }
    return parsed as EditalSession;
  } catch {
    return null;
  }
}

export function setEditalSession(session: EditalSession): void {
  sessionStorage.setItem(EDITAL_SESSION_KEY, JSON.stringify(session));
}

export function clearEditalSession(): void {
  sessionStorage.removeItem(EDITAL_SESSION_KEY);
}
```

- [ ] **Step 2: Refactor `EditalCpfGate.tsx` to use the shared session module**

In `app/components/EditalCpfGate.tsx`:

Remove the line:
```ts
const SESSION_KEY = 'edital_session'
```

Add to the imports:
```ts
import { setEditalSession } from '@/lib/edital-session'
```

Replace:
```ts
sessionStorage.setItem(SESSION_KEY, JSON.stringify({ token: result.token, prefill: result.prefill }))
```
with:
```ts
setEditalSession({ token: result.token, prefill: result.prefill })
```

- [ ] **Step 3: Create the API client with types and error handling**

Create `lib/edital-proposta-api.ts`:

```ts
export interface EditalSubmissionDocument {
  id: number;
  requirementCode: string;
  originalFilename: string | null;
  mimeType: string;
  sizeBytes: number;
  uploadedAt: string;
}

export interface EditalBudgetItem {
  descricao: string;
  valor_estimado: number;
  justificativa: string;
}

export interface EditalSubmission {
  id: number;
  registrationId: number;
  status: 'DRAFT' | 'SUBMITTED';
  teamDescription: string | null;
  institutionName: string | null;
  institutionCnpj: string | null;
  labName: string | null;
  labArea: string | null;
  labServedPublic: string | null;
  budgetItems: EditalBudgetItem[] | null;
  technicalJustification: string | null;
  expectedResults: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  submittedAt: string | null;
  documents: EditalSubmissionDocument[];
}

export interface EditalWizardData {
  teamDescription: string;
  institutionName: string;
  institutionCnpj: string;
  labName: string;
  labArea: string;
  labServedPublic: string;
  budgetItems: EditalBudgetItem[];
  technicalJustification: string;
  expectedResults: string;
}

export const EMPTY_WIZARD_DATA: EditalWizardData = {
  teamDescription: '',
  institutionName: '',
  institutionCnpj: '',
  labName: '',
  labArea: '',
  labServedPublic: '',
  budgetItems: [],
  technicalJustification: '',
  expectedResults: '',
};

export function submissionToWizardData(submission: EditalSubmission): EditalWizardData {
  return {
    teamDescription: submission.teamDescription ?? '',
    institutionName: submission.institutionName ?? '',
    institutionCnpj: submission.institutionCnpj ?? '',
    labName: submission.labName ?? '',
    labArea: submission.labArea ?? '',
    labServedPublic: submission.labServedPublic ?? '',
    budgetItems: submission.budgetItems ?? [],
    technicalJustification: submission.technicalJustification ?? '',
    expectedResults: submission.expectedResults ?? '',
  };
}

export type EditalDraftStep = 'equipe' | 'instituicao' | 'proposta';

export type EditalMissingItem =
  | { type: 'document'; requirementCode: string }
  | { type: 'photo'; required: number; found: number }
  | { type: 'field'; field: string };

export type EditalApiErrorReason =
  | 'token_expired'
  | 'already_submitted'
  | 'incomplete'
  | 'rate_limited'
  | 'forbidden'
  | 'not_found'
  | 'validation_error'
  | 'server_error';

export class EditalApiError extends Error {
  status: number;
  reason: EditalApiErrorReason;
  missing?: EditalMissingItem[];
  retryAfterSeconds?: number;

  constructor(
    status: number,
    reason: EditalApiErrorReason,
    message: string,
    extra?: { missing?: EditalMissingItem[]; retryAfterSeconds?: number }
  ) {
    super(message);
    this.status = status;
    this.reason = reason;
    this.missing = extra?.missing;
    this.retryAfterSeconds = extra?.retryAfterSeconds;
  }
}

async function throwEditalApiError(response: Response): Promise<never> {
  const body = await response.json().catch(() => ({ error: 'server_error' }));
  const errorCode: string = typeof body?.error === 'string' ? body.error : 'server_error';

  if (response.status === 401 && errorCode === 'token_expired') {
    throw new EditalApiError(401, 'token_expired', 'Sessão expirada');
  }
  if (response.status === 409 && errorCode === 'already_submitted') {
    throw new EditalApiError(409, 'already_submitted', 'Proposta já enviada');
  }
  if (response.status === 400 && errorCode === 'incomplete') {
    throw new EditalApiError(400, 'incomplete', 'Envio incompleto', { missing: body.missing || [] });
  }
  if (response.status === 429) {
    const retryAfter = Number.parseInt(response.headers.get('Retry-After') || '0', 10);
    throw new EditalApiError(
      429,
      'rate_limited',
      'Muitas tentativas. Tente novamente em alguns minutos.',
      { retryAfterSeconds: retryAfter }
    );
  }
  if (response.status === 403) {
    throw new EditalApiError(403, 'forbidden', 'Origem não autorizada');
  }
  if (response.status === 404) {
    throw new EditalApiError(404, 'not_found', errorCode);
  }
  if (response.status === 400) {
    throw new EditalApiError(400, 'validation_error', errorCode);
  }

  throw new EditalApiError(response.status, 'server_error', 'Erro interno do servidor');
}

export async function fetchEditalDraft(token: string): Promise<EditalSubmission | null> {
  const response = await fetch('/api/editais/proposta/rascunho', {
    method: 'GET',
    headers: { 'X-Edital-Token': token },
  });

  if (!response.ok) {
    await throwEditalApiError(response);
  }

  const body = await response.json();
  return body.submission;
}

export async function saveEditalDraftStep(
  token: string,
  step: EditalDraftStep,
  data: Record<string, unknown>
): Promise<{ submissionId: number; updatedAt: string }> {
  const response = await fetch('/api/editais/proposta/rascunho', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Edital-Token': token },
    body: JSON.stringify({ step, data }),
  });

  if (!response.ok) {
    await throwEditalApiError(response);
  }

  const body = await response.json();
  return { submissionId: body.submissionId, updatedAt: body.updatedAt };
}

export async function uploadEditalDocument(
  token: string,
  requirementCode: string,
  file: File
): Promise<{ documentId: number; requirementCode: string; filename: string }> {
  const formData = new FormData();
  formData.append('requirementCode', requirementCode);
  formData.append('file', file);

  const response = await fetch('/api/editais/proposta/documento', {
    method: 'POST',
    headers: { 'X-Edital-Token': token },
    body: formData,
  });

  if (!response.ok) {
    await throwEditalApiError(response);
  }

  return response.json();
}

export async function getEditalDocumentUrl(token: string, documentId: number): Promise<string> {
  const response = await fetch(`/api/editais/proposta/documento/${documentId}`, {
    method: 'GET',
    headers: { 'X-Edital-Token': token },
  });

  if (!response.ok) {
    await throwEditalApiError(response);
  }

  const body = await response.json();
  return body.url;
}

export async function deleteEditalDocument(token: string, documentId: number): Promise<void> {
  const response = await fetch(`/api/editais/proposta/documento/${documentId}`, {
    method: 'DELETE',
    headers: { 'X-Edital-Token': token },
  });

  if (!response.ok) {
    await throwEditalApiError(response);
  }
}

export async function submitEditalProposal(token: string): Promise<{ submittedAt: string }> {
  const response = await fetch('/api/editais/proposta/enviar', {
    method: 'POST',
    headers: { 'X-Edital-Token': token },
  });

  if (!response.ok) {
    await throwEditalApiError(response);
  }

  const body = await response.json();
  return { submittedAt: body.submittedAt };
}
```

- [ ] **Step 4: Verify**

Run:
```powershell
npx tsc --noEmit
```
Expected: no output (clean pass).

- [ ] **Step 5: Commit**

```powershell
git add lib/edital-session.ts lib/edital-proposta-api.ts app/components/EditalCpfGate.tsx
git commit -m "feat: adiciona cliente de API e sessão compartilhada do wizard do edital"
```

---

### Task 2: Reusable upload components

**Files:**
- Create: `app/components/edital/DocumentUploadSlot.tsx`
- Create: `app/components/edital/PhotoGallerySlot.tsx`

**Interfaces:**
- Consumes: `EditalSubmissionDocument`, `EditalApiError`, `uploadEditalDocument`, `deleteEditalDocument`, `getEditalDocumentUrl` (`lib/edital-proposta-api.ts`, Task 1); `EDITAL_PHOTO_DOCUMENT_CODE`, `EDITAL_MAX_PHOTO_BYTES`, `EDITAL_MAX_PHOTO_COUNT`, `EDITAL_MIN_PHOTO_COUNT` (`lib/edital-requirements.ts`, already exists)
- Produces: `DocumentUploadSlot` (props: `token, requirementCode, label, helperText?, accept, maxBytes, document, onUploaded, onRemoved, onTokenExpired`), `PhotoGallerySlot` (props: `token, photos, onUploaded, onRemoved, onTokenExpired`) — consumed by every screen task (4-8) and the wizard container (Task 10).

- [ ] **Step 1: Create `DocumentUploadSlot`**

Create `app/components/edital/DocumentUploadSlot.tsx`:

```tsx
'use client'

import { useRef, useState } from 'react'
import { FileText, Upload, X, Loader2, Eye, AlertCircle } from 'lucide-react'
import {
  EditalSubmissionDocument,
  EditalApiError,
  uploadEditalDocument,
  deleteEditalDocument,
  getEditalDocumentUrl,
} from '@/lib/edital-proposta-api'

interface DocumentUploadSlotProps {
  token: string
  requirementCode: string
  label: string
  helperText?: string
  accept: string
  maxBytes: number
  document: EditalSubmissionDocument | null
  onUploaded: (document: EditalSubmissionDocument) => void
  onRemoved: (documentId: number) => void
  onTokenExpired: () => void
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

export default function DocumentUploadSlot({
  token,
  requirementCode,
  label,
  helperText,
  accept,
  maxBytes,
  document,
  onUploaded,
  onRemoved,
  onTokenExpired,
}: DocumentUploadSlotProps) {
  const [uploading, setUploading] = useState(false)
  const [removing, setRemoving] = useState(false)
  const [error, setError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setError('')

    if (file.size > maxBytes) {
      setError(`Arquivo acima do limite de ${formatFileSize(maxBytes)}`)
      if (inputRef.current) inputRef.current.value = ''
      return
    }

    setUploading(true)
    try {
      const result = await uploadEditalDocument(token, requirementCode, file)
      onUploaded({
        id: result.documentId,
        requirementCode: result.requirementCode,
        originalFilename: result.filename,
        mimeType: file.type,
        sizeBytes: file.size,
        uploadedAt: new Date().toISOString(),
      })
    } catch (err) {
      if (err instanceof EditalApiError && err.reason === 'token_expired') {
        onTokenExpired()
        return
      }
      setError(err instanceof Error ? err.message : 'Erro ao enviar arquivo')
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  const handleRemove = async () => {
    if (!document) return
    setRemoving(true)
    setError('')
    try {
      await deleteEditalDocument(token, document.id)
      onRemoved(document.id)
    } catch (err) {
      if (err instanceof EditalApiError && err.reason === 'token_expired') {
        onTokenExpired()
        return
      }
      setError(err instanceof Error ? err.message : 'Erro ao remover arquivo')
    } finally {
      setRemoving(false)
    }
  }

  const handleView = async () => {
    if (!document) return
    try {
      const url = await getEditalDocumentUrl(token, document.id)
      window.open(url, '_blank', 'noopener,noreferrer')
    } catch (err) {
      if (err instanceof EditalApiError && err.reason === 'token_expired') {
        onTokenExpired()
        return
      }
      setError('Não foi possível abrir o arquivo')
    }
  }

  return (
    <div className="space-y-2">
      <label className="block text-sm font-bold text-slate-100 ml-1">{label}</label>
      {helperText && <p className="text-xs text-slate-400 ml-1">{helperText}</p>}

      {!document && (
        <div>
          <input
            ref={inputRef}
            type="file"
            accept={accept}
            onChange={handleFileChange}
            disabled={uploading}
            className="hidden"
            id={`upload-${requirementCode}`}
          />
          <label
            htmlFor={`upload-${requirementCode}`}
            className="flex items-center justify-center gap-2 w-full p-4 border-2 border-dashed border-slate-700/50 rounded-2xl cursor-pointer hover:border-[#22AE84] transition-colors text-slate-300"
          >
            {uploading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Upload className="w-5 h-5" />
            )}
            <span className="text-sm font-medium">
              {uploading ? 'Enviando...' : 'Clique para selecionar o arquivo'}
            </span>
          </label>
        </div>
      )}

      {document && (
        <div className="flex items-center justify-between p-4 bg-slate-900/60 rounded-2xl border border-slate-700/50">
          <div className="flex items-center gap-3 min-w-0">
            <FileText className="w-5 h-5 text-[#22AE84] flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-sm font-medium text-white truncate">
                {document.originalFilename || 'Arquivo enviado'}
              </p>
              <p className="text-xs text-slate-400">{formatFileSize(document.sizeBytes)}</p>
            </div>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <button
              type="button"
              onClick={handleView}
              className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
              aria-label="Ver arquivo"
            >
              <Eye className="w-4 h-4 text-slate-400 hover:text-[#22AE84]" />
            </button>
            <button
              type="button"
              onClick={handleRemove}
              disabled={removing}
              className="p-2 hover:bg-slate-800 rounded-lg transition-colors disabled:opacity-50"
              aria-label="Remover arquivo"
            >
              {removing ? (
                <Loader2 className="w-4 h-4 text-slate-400 animate-spin" />
              ) : (
                <X className="w-4 h-4 text-slate-400 hover:text-red-400" />
              )}
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 text-sm text-red-400 font-medium">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Create `PhotoGallerySlot`**

Create `app/components/edital/PhotoGallerySlot.tsx`:

```tsx
'use client'

import { useRef, useState } from 'react'
import { Upload, X, Loader2, AlertCircle, CheckCircle } from 'lucide-react'
import {
  EditalSubmissionDocument,
  EditalApiError,
  uploadEditalDocument,
  deleteEditalDocument,
} from '@/lib/edital-proposta-api'
import {
  EDITAL_PHOTO_DOCUMENT_CODE,
  EDITAL_MAX_PHOTO_BYTES,
  EDITAL_MAX_PHOTO_COUNT,
  EDITAL_MIN_PHOTO_COUNT,
} from '@/lib/edital-requirements'

interface PhotoGallerySlotProps {
  token: string
  photos: EditalSubmissionDocument[]
  onUploaded: (document: EditalSubmissionDocument) => void
  onRemoved: (documentId: number) => void
  onTokenExpired: () => void
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

export default function PhotoGallerySlot({
  token,
  photos,
  onUploaded,
  onRemoved,
  onTokenExpired,
}: PhotoGallerySlotProps) {
  const [uploading, setUploading] = useState(false)
  const [removingId, setRemovingId] = useState<number | null>(null)
  const [error, setError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFilesChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return

    setError('')

    if (photos.length + files.length > EDITAL_MAX_PHOTO_COUNT) {
      setError(`Você pode enviar no máximo ${EDITAL_MAX_PHOTO_COUNT} fotos`)
      if (inputRef.current) inputRef.current.value = ''
      return
    }

    const validTypes = ['image/jpeg', 'image/png', 'image/webp']
    for (const file of files) {
      if (!validTypes.includes(file.type)) {
        setError('Apenas imagens JPG, PNG ou WEBP são permitidas')
        if (inputRef.current) inputRef.current.value = ''
        return
      }
      if (file.size > EDITAL_MAX_PHOTO_BYTES) {
        setError(`Cada foto deve ter no máximo ${formatFileSize(EDITAL_MAX_PHOTO_BYTES)}`)
        if (inputRef.current) inputRef.current.value = ''
        return
      }
    }

    setUploading(true)
    try {
      for (const file of files) {
        const result = await uploadEditalDocument(token, EDITAL_PHOTO_DOCUMENT_CODE, file)
        onUploaded({
          id: result.documentId,
          requirementCode: result.requirementCode,
          originalFilename: result.filename,
          mimeType: file.type,
          sizeBytes: file.size,
          uploadedAt: new Date().toISOString(),
        })
      }
    } catch (err) {
      if (err instanceof EditalApiError && err.reason === 'token_expired') {
        onTokenExpired()
        return
      }
      setError(err instanceof Error ? err.message : 'Erro ao enviar foto')
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  const handleRemove = async (documentId: number) => {
    setRemovingId(documentId)
    setError('')
    try {
      await deleteEditalDocument(token, documentId)
      onRemoved(documentId)
    } catch (err) {
      if (err instanceof EditalApiError && err.reason === 'token_expired') {
        onTokenExpired()
        return
      }
      setError(err instanceof Error ? err.message : 'Erro ao remover foto')
    } finally {
      setRemovingId(null)
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-bold text-slate-100 mb-1 ml-1">
          Fotos do laboratório
        </label>
        <p className="text-xs text-slate-400 ml-1">
          Mínimo {EDITAL_MIN_PHOTO_COUNT}, máximo {EDITAL_MAX_PHOTO_COUNT} fotos, {formatFileSize(EDITAL_MAX_PHOTO_BYTES)} cada
        </p>
      </div>

      {photos.length < EDITAL_MAX_PHOTO_COUNT && (
        <div>
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            onChange={handleFilesChange}
            disabled={uploading}
            className="hidden"
            id="upload-foto"
          />
          <label
            htmlFor="upload-foto"
            className="flex items-center justify-center gap-2 w-full p-4 border-2 border-dashed border-slate-700/50 rounded-2xl cursor-pointer hover:border-[#22AE84] transition-colors text-slate-300"
          >
            {uploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Upload className="w-5 h-5" />}
            <span className="text-sm font-medium">
              {uploading ? 'Enviando...' : 'Clique para selecionar as fotos'}
            </span>
          </label>
        </div>
      )}

      {photos.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {photos.map((photo) => (
            <div key={photo.id} className="relative group bg-slate-900/60 rounded-xl border border-slate-700/50 p-3">
              <p className="text-xs font-medium text-white truncate">{photo.originalFilename}</p>
              <p className="text-xs text-slate-400">{formatFileSize(photo.sizeBytes)}</p>
              <button
                type="button"
                onClick={() => handleRemove(photo.id)}
                disabled={removingId === photo.id}
                className="absolute top-2 right-2 p-1.5 bg-black/50 hover:bg-red-500 rounded-lg transition-colors disabled:opacity-50"
                aria-label="Remover foto"
              >
                {removingId === photo.id ? (
                  <Loader2 className="w-3.5 h-3.5 text-white animate-spin" />
                ) : (
                  <X className="w-3.5 h-3.5 text-white" />
                )}
              </button>
            </div>
          ))}
        </div>
      )}

      {photos.length >= EDITAL_MIN_PHOTO_COUNT && (
        <div className="flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
          <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
          <p className="text-sm text-green-400 font-medium">Mínimo de fotos atingido</p>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 text-sm text-red-400 font-medium">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  )
}
```

Note: unlike `IdentityUploadSection`, there is no local image thumbnail preview — files are persisted server-side immediately on selection (not held as local `File` objects until a final submit), and the backend does not return a thumbnail URL. Showing filename + size (like `DocumentUploadSlot`) is the intentional, simpler behavior here; fetching a signed URL per thumbnail on every render would add N extra requests for no functional benefit at this stage.

- [ ] **Step 3: Verify**

Run:
```powershell
npx tsc --noEmit
```
Expected: no output (clean pass).

- [ ] **Step 4: Commit**

```powershell
git add app/components/edital/DocumentUploadSlot.tsx app/components/edital/PhotoGallerySlot.tsx
git commit -m "feat: adiciona componentes reutilizáveis de upload do wizard do edital"
```

---

### Task 3: Stepper component

**Files:**
- Create: `app/components/edital/EditalStepper.tsx`

**Interfaces:**
- Consumes: nothing (pure presentational component)
- Produces: `EditalStepper` (props: `steps: {key: string; label: string}[], currentStep: string, onStepClick: (key: string) => void`) — consumed by the wizard container (Task 10).

- [ ] **Step 1: Create the stepper**

Create `app/components/edital/EditalStepper.tsx`:

```tsx
'use client'

interface EditalStepperStep {
  key: string
  label: string
}

interface EditalStepperProps {
  steps: EditalStepperStep[]
  currentStep: string
  onStepClick: (key: string) => void
}

export default function EditalStepper({ steps, currentStep, onStepClick }: EditalStepperProps) {
  const currentIndex = steps.findIndex((step) => step.key === currentStep)

  return (
    <div className="flex items-center gap-1 sm:gap-2 mb-8 overflow-x-auto pb-2">
      {steps.map((step, index) => {
        const isActive = step.key === currentStep
        const isPast = index < currentIndex

        return (
          <button
            key={step.key}
            type="button"
            onClick={() => onStepClick(step.key)}
            className={`flex-shrink-0 flex items-center gap-2 px-3 sm:px-4 py-2 rounded-full text-xs sm:text-sm font-bold transition-all ${
              isActive
                ? 'bg-[#22AE84] text-white'
                : isPast
                ? 'bg-[#22AE84]/20 text-[#22AE84]'
                : 'bg-slate-800/60 text-slate-400 hover:text-slate-200'
            }`}
          >
            <span className="flex items-center justify-center w-5 h-5 rounded-full bg-black/20 text-[10px]">
              {index + 1}
            </span>
            <span className="hidden sm:inline">{step.label}</span>
          </button>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 2: Verify**

Run:
```powershell
npx tsc --noEmit
```
Expected: no output (clean pass).

- [ ] **Step 3: Commit**

```powershell
git add app/components/edital/EditalStepper.tsx
git commit -m "feat: adiciona indicador de progresso do wizard do edital"
```

---

### Task 4: Tela 1 — Equipe

**Files:**
- Create: `app/components/edital/TelaEquipe.tsx`

**Interfaces:**
- Consumes: `DocumentUploadSlot` (Task 2); `EditalSubmissionDocument` (`lib/edital-proposta-api.ts`, Task 1); `EditalSessionPrefill` (`lib/edital-session.ts`, Task 1); `EDITAL_MAX_TEXT_LENGTH`, `EDITAL_MAX_DOCUMENT_BYTES` (`lib/edital-requirements.ts`)
- Produces: `TelaEquipe` (props: `prefill, token, teamDescription, onTeamDescriptionChange, documents, onDocumentUploaded, onDocumentRemoved, onTokenExpired`) — consumed by the wizard container (Task 10).

- [ ] **Step 1: Create the screen**

Create `app/components/edital/TelaEquipe.tsx`:

```tsx
'use client'

import { FileText, User } from 'lucide-react'
import DocumentUploadSlot from './DocumentUploadSlot'
import { EditalSubmissionDocument } from '@/lib/edital-proposta-api'
import { EditalSessionPrefill } from '@/lib/edital-session'
import { EDITAL_MAX_TEXT_LENGTH, EDITAL_MAX_DOCUMENT_BYTES } from '@/lib/edital-requirements'

interface TelaEquipeProps {
  prefill: EditalSessionPrefill
  token: string
  teamDescription: string
  onTeamDescriptionChange: (value: string) => void
  documents: EditalSubmissionDocument[]
  onDocumentUploaded: (document: EditalSubmissionDocument) => void
  onDocumentRemoved: (documentId: number) => void
  onTokenExpired: () => void
}

function findDocument(documents: EditalSubmissionDocument[], code: string): EditalSubmissionDocument | null {
  return documents.find((doc) => doc.requirementCode === code) ?? null
}

export default function TelaEquipe({
  prefill,
  token,
  teamDescription,
  onTeamDescriptionChange,
  documents,
  onDocumentUploaded,
  onDocumentRemoved,
  onTokenExpired,
}: TelaEquipeProps) {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-bold text-white mb-2">Responsável e equipe</h2>
        <p className="text-slate-400">
          Confirme os dados do responsável pela proposta e conte quem mais compõe a equipe.
        </p>
      </div>

      <div className="bg-slate-900/60 rounded-2xl p-6 border border-slate-700/50">
        <div className="flex items-center gap-2 text-sm font-bold text-slate-100 mb-4">
          <User className="w-4 h-4 text-[#22AE84]" />
          Dados do responsável (da inscrição na InnovaNation)
        </div>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <div>
            <dt className="text-slate-400">Nome completo</dt>
            <dd className="text-white font-medium">{prefill.fullName}</dd>
          </div>
          {prefill.email && (
            <div>
              <dt className="text-slate-400">E-mail</dt>
              <dd className="text-white font-medium">{prefill.email}</dd>
            </div>
          )}
          {prefill.phone && (
            <div>
              <dt className="text-slate-400">Telefone</dt>
              <dd className="text-white font-medium">{prefill.phone}</dd>
            </div>
          )}
          {prefill.profession && (
            <div>
              <dt className="text-slate-400">Profissão</dt>
              <dd className="text-white font-medium">{prefill.profession}</dd>
            </div>
          )}
          {prefill.organization && (
            <div>
              <dt className="text-slate-400">Organização</dt>
              <dd className="text-white font-medium">{prefill.organization}</dd>
            </div>
          )}
        </dl>
      </div>

      <div>
        <label htmlFor="team_description" className="block text-sm font-bold text-slate-100 mb-3 ml-1">
          Equipe envolvida
        </label>
        <textarea
          id="team_description"
          value={teamDescription}
          onChange={(e) => onTeamDescriptionChange(e.target.value.slice(0, EDITAL_MAX_TEXT_LENGTH))}
          rows={5}
          placeholder="Descreva quem mais participa da proposta e o papel de cada pessoa"
          className="w-full px-6 py-4 bg-slate-900/60 border border-slate-700/50 rounded-2xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#22AE84]/30 focus:border-[#22AE84] transition-all font-medium resize-none"
        />
        <p className="mt-1 text-xs text-slate-500 text-right">
          {teamDescription.length}/{EDITAL_MAX_TEXT_LENGTH}
        </p>
      </div>

      <div className="space-y-6">
        <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
          <FileText className="w-4 h-4 text-[#22AE84]" />
          Documentação do responsável
        </h3>
        <DocumentUploadSlot
          token={token}
          requirementCode="8.1.1"
          label="Documento oficial de identificação com foto"
          helperText="RG, CNH (com foto) ou equivalente"
          accept="application/pdf"
          maxBytes={EDITAL_MAX_DOCUMENT_BYTES}
          document={findDocument(documents, '8.1.1')}
          onUploaded={onDocumentUploaded}
          onRemoved={onDocumentRemoved}
          onTokenExpired={onTokenExpired}
        />
        <DocumentUploadSlot
          token={token}
          requirementCode="8.1.2"
          label="CPF do responsável pela submissão"
          accept="application/pdf"
          maxBytes={EDITAL_MAX_DOCUMENT_BYTES}
          document={findDocument(documents, '8.1.2')}
          onUploaded={onDocumentUploaded}
          onRemoved={onDocumentRemoved}
          onTokenExpired={onTokenExpired}
        />
        <DocumentUploadSlot
          token={token}
          requirementCode="8.1.3"
          label="Comprovante de vínculo institucional"
          helperText="Declaração institucional, portaria, contrato ou documento equivalente"
          accept="application/pdf"
          maxBytes={EDITAL_MAX_DOCUMENT_BYTES}
          document={findDocument(documents, '8.1.3')}
          onUploaded={onDocumentUploaded}
          onRemoved={onDocumentRemoved}
          onTokenExpired={onTokenExpired}
        />
        <DocumentUploadSlot
          token={token}
          requirementCode="8.1.4"
          label="Currículo atualizado"
          helperText="Preferencialmente extraído da Plataforma Lattes"
          accept="application/pdf"
          maxBytes={EDITAL_MAX_DOCUMENT_BYTES}
          document={findDocument(documents, '8.1.4')}
          onUploaded={onDocumentUploaded}
          onRemoved={onDocumentRemoved}
          onTokenExpired={onTokenExpired}
        />
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify**

Run:
```powershell
npx tsc --noEmit
```
Expected: no output (clean pass).

- [ ] **Step 3: Commit**

```powershell
git add app/components/edital/TelaEquipe.tsx
git commit -m "feat: adiciona tela de equipe do wizard do edital"
```

---

### Task 5: Tela 2 — Instituição e laboratório

**Files:**
- Create: `app/components/edital/TelaInstituicao.tsx`

**Interfaces:**
- Consumes: `DocumentUploadSlot` (Task 2); `EditalSubmissionDocument` (Task 1); `EDITAL_MAX_DOCUMENT_BYTES`, `EDITAL_MAX_TEXT_LENGTH` (`lib/edital-requirements.ts`)
- Produces: `TelaInstituicao` (props: `token, institutionName, institutionCnpj, labName, labArea, labServedPublic, onFieldChange, documents, onDocumentUploaded, onDocumentRemoved, onTokenExpired`), exports the `TelaInstituicaoField` union type — consumed by the wizard container (Task 10).

- [ ] **Step 1: Create the screen**

Create `app/components/edital/TelaInstituicao.tsx`:

```tsx
'use client'

import { FileText } from 'lucide-react'
import DocumentUploadSlot from './DocumentUploadSlot'
import { EditalSubmissionDocument } from '@/lib/edital-proposta-api'
import { EDITAL_MAX_DOCUMENT_BYTES, EDITAL_MAX_TEXT_LENGTH } from '@/lib/edital-requirements'

export type TelaInstituicaoField =
  | 'institutionName'
  | 'institutionCnpj'
  | 'labName'
  | 'labArea'
  | 'labServedPublic'

interface TelaInstituicaoProps {
  token: string
  institutionName: string
  institutionCnpj: string
  labName: string
  labArea: string
  labServedPublic: string
  onFieldChange: (field: TelaInstituicaoField, value: string) => void
  documents: EditalSubmissionDocument[]
  onDocumentUploaded: (document: EditalSubmissionDocument) => void
  onDocumentRemoved: (documentId: number) => void
  onTokenExpired: () => void
}

function findDocument(documents: EditalSubmissionDocument[], code: string): EditalSubmissionDocument | null {
  return documents.find((doc) => doc.requirementCode === code) ?? null
}

const inputClass =
  'w-full px-6 py-4 bg-slate-900/60 border border-slate-700/50 rounded-2xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#22AE84]/30 focus:border-[#22AE84] transition-all font-medium'

export default function TelaInstituicao({
  token,
  institutionName,
  institutionCnpj,
  labName,
  labArea,
  labServedPublic,
  onFieldChange,
  documents,
  onDocumentUploaded,
  onDocumentRemoved,
  onTokenExpired,
}: TelaInstituicaoProps) {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-bold text-white mb-2">Instituição e laboratório</h2>
        <p className="text-slate-400">
          Dados da instituição de ensino e do laboratório participante da proposta.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="institution_name" className="block text-sm font-bold text-slate-100 mb-3 ml-1">
            Nome da instituição
          </label>
          <input
            id="institution_name"
            type="text"
            value={institutionName}
            onChange={(e) => onFieldChange('institutionName', e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="institution_cnpj" className="block text-sm font-bold text-slate-100 mb-3 ml-1">
            CNPJ da instituição
          </label>
          <input
            id="institution_cnpj"
            type="text"
            value={institutionCnpj}
            onChange={(e) => onFieldChange('institutionCnpj', e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="lab_name" className="block text-sm font-bold text-slate-100 mb-3 ml-1">
            Nome do laboratório
          </label>
          <input
            id="lab_name"
            type="text"
            value={labName}
            onChange={(e) => onFieldChange('labName', e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="lab_area" className="block text-sm font-bold text-slate-100 mb-3 ml-1">
            Área de atuação do laboratório
          </label>
          <input
            id="lab_area"
            type="text"
            value={labArea}
            onChange={(e) => onFieldChange('labArea', e.target.value)}
            className={inputClass}
          />
        </div>
      </div>

      <div>
        <label htmlFor="lab_served_public" className="block text-sm font-bold text-slate-100 mb-3 ml-1">
          Público atendido pelo laboratório
        </label>
        <textarea
          id="lab_served_public"
          value={labServedPublic}
          onChange={(e) => onFieldChange('labServedPublic', e.target.value.slice(0, EDITAL_MAX_TEXT_LENGTH))}
          rows={4}
          className={`${inputClass} resize-none`}
        />
        <p className="mt-1 text-xs text-slate-500 text-right">
          {labServedPublic.length}/{EDITAL_MAX_TEXT_LENGTH}
        </p>
      </div>

      <div className="space-y-6">
        <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
          <FileText className="w-4 h-4 text-[#22AE84]" />
          Documentação da instituição e do laboratório
        </h3>
        <DocumentUploadSlot
          token={token}
          requirementCode="8.1.5"
          label="Comprovante de inscrição e situação cadastral do CNPJ"
          accept="application/pdf"
          maxBytes={EDITAL_MAX_DOCUMENT_BYTES}
          document={findDocument(documents, '8.1.5')}
          onUploaded={onDocumentUploaded}
          onRemoved={onDocumentRemoved}
          onTokenExpired={onTokenExpired}
        />
        <DocumentUploadSlot
          token={token}
          requirementCode="8.1.6"
          label="Carta de anuência da instituição"
          helperText="Assinada por representante legal, direção, coordenação ou chefia de departamento"
          accept="application/pdf"
          maxBytes={EDITAL_MAX_DOCUMENT_BYTES}
          document={findDocument(documents, '8.1.6')}
          onUploaded={onDocumentUploaded}
          onRemoved={onDocumentRemoved}
          onTokenExpired={onTokenExpired}
        />
        <DocumentUploadSlot
          token={token}
          requirementCode="8.1.7"
          label="Documento de identificação do laboratório"
          helperText="Nome oficial, área de atuação, responsável técnico e público atendido"
          accept="application/pdf"
          maxBytes={EDITAL_MAX_DOCUMENT_BYTES}
          document={findDocument(documents, '8.1.7')}
          onUploaded={onDocumentUploaded}
          onRemoved={onDocumentRemoved}
          onTokenExpired={onTokenExpired}
        />
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify**

Run:
```powershell
npx tsc --noEmit
```
Expected: no output (clean pass).

- [ ] **Step 3: Commit**

```powershell
git add app/components/edital/TelaInstituicao.tsx
git commit -m "feat: adiciona tela de instituição e laboratório do wizard do edital"
```

---

### Task 6: Tela 3 — Fotos e planta

**Files:**
- Create: `app/components/edital/TelaFotos.tsx`

**Interfaces:**
- Consumes: `PhotoGallerySlot`, `DocumentUploadSlot` (Task 2); `EditalSubmissionDocument` (Task 1); `EDITAL_MAX_DOCUMENT_BYTES`, `EDITAL_PHOTO_DOCUMENT_CODE` (`lib/edital-requirements.ts`)
- Produces: `TelaFotos` (props: `token, documents, onDocumentUploaded, onDocumentRemoved, onTokenExpired`) — consumed by the wizard container (Task 10).

- [ ] **Step 1: Create the screen**

Create `app/components/edital/TelaFotos.tsx`:

```tsx
'use client'

import PhotoGallerySlot from './PhotoGallerySlot'
import DocumentUploadSlot from './DocumentUploadSlot'
import { EditalSubmissionDocument } from '@/lib/edital-proposta-api'
import { EDITAL_MAX_DOCUMENT_BYTES, EDITAL_PHOTO_DOCUMENT_CODE } from '@/lib/edital-requirements'

interface TelaFotosProps {
  token: string
  documents: EditalSubmissionDocument[]
  onDocumentUploaded: (document: EditalSubmissionDocument) => void
  onDocumentRemoved: (documentId: number) => void
  onTokenExpired: () => void
}

export default function TelaFotos({
  token,
  documents,
  onDocumentUploaded,
  onDocumentRemoved,
  onTokenExpired,
}: TelaFotosProps) {
  const photos = documents.filter((doc) => doc.requirementCode === EDITAL_PHOTO_DOCUMENT_CODE)
  const layout = documents.find((doc) => doc.requirementCode === '8.1.9') ?? null

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-bold text-white mb-2">Fotos e planta do laboratório</h2>
        <p className="text-slate-400">
          Registro fotográfico atual do laboratório e, quando houver, planta ou layout do espaço.
        </p>
      </div>

      <PhotoGallerySlot
        token={token}
        photos={photos}
        onUploaded={onDocumentUploaded}
        onRemoved={onDocumentRemoved}
        onTokenExpired={onTokenExpired}
      />

      <DocumentUploadSlot
        token={token}
        requirementCode="8.1.9"
        label="Planta, layout ou memorial descritivo do espaço (quando houver)"
        helperText="Especialmente se a proposta envolver adequações estruturais, mobiliário ou instalação de equipamentos"
        accept="application/pdf"
        maxBytes={EDITAL_MAX_DOCUMENT_BYTES}
        document={layout}
        onUploaded={onDocumentUploaded}
        onRemoved={onDocumentRemoved}
        onTokenExpired={onTokenExpired}
      />
    </div>
  )
}
```

- [ ] **Step 2: Verify**

Run:
```powershell
npx tsc --noEmit
```
Expected: no output (clean pass).

- [ ] **Step 3: Commit**

```powershell
git add app/components/edital/TelaFotos.tsx
git commit -m "feat: adiciona tela de fotos e planta do wizard do edital"
```

---

### Task 7: Tela 4 — Proposta

**Files:**
- Create: `app/components/edital/TelaProposta.tsx`

**Interfaces:**
- Consumes: `EditalBudgetItem` (Task 1); `EDITAL_MAX_BUDGET_ITEMS`, `EDITAL_MAX_BUDGET_DESCRIPTION_LENGTH`, `EDITAL_MAX_BUDGET_JUSTIFICATION_LENGTH`, `EDITAL_MAX_TEXT_LENGTH` (`lib/edital-requirements.ts`)
- Produces: `TelaProposta` (props: `budgetItems, onBudgetItemsChange, technicalJustification, onTechnicalJustificationChange, expectedResults, onExpectedResultsChange`) — consumed by the wizard container (Task 10). No document uploads on this screen (matches the design spec — budget/justification only).

- [ ] **Step 1: Create the screen**

Create `app/components/edital/TelaProposta.tsx`:

```tsx
'use client'

import { Plus, Trash2 } from 'lucide-react'
import { EditalBudgetItem } from '@/lib/edital-proposta-api'
import {
  EDITAL_MAX_BUDGET_ITEMS,
  EDITAL_MAX_BUDGET_DESCRIPTION_LENGTH,
  EDITAL_MAX_BUDGET_JUSTIFICATION_LENGTH,
  EDITAL_MAX_TEXT_LENGTH,
} from '@/lib/edital-requirements'

interface TelaPropostaProps {
  budgetItems: EditalBudgetItem[]
  onBudgetItemsChange: (items: EditalBudgetItem[]) => void
  technicalJustification: string
  onTechnicalJustificationChange: (value: string) => void
  expectedResults: string
  onExpectedResultsChange: (value: string) => void
}

const inputClass =
  'w-full px-4 py-3 bg-slate-900/60 border border-slate-700/50 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#22AE84]/30 focus:border-[#22AE84] transition-all font-medium text-sm'

const textareaClass =
  'w-full px-6 py-4 bg-slate-900/60 border border-slate-700/50 rounded-2xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#22AE84]/30 focus:border-[#22AE84] transition-all font-medium resize-none'

export default function TelaProposta({
  budgetItems,
  onBudgetItemsChange,
  technicalJustification,
  onTechnicalJustificationChange,
  expectedResults,
  onExpectedResultsChange,
}: TelaPropostaProps) {
  const updateItem = (index: number, field: keyof EditalBudgetItem, value: string | number) => {
    const next = budgetItems.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    onBudgetItemsChange(next)
  }

  const addItem = () => {
    if (budgetItems.length >= EDITAL_MAX_BUDGET_ITEMS) return
    onBudgetItemsChange([...budgetItems, { descricao: '', valor_estimado: 0, justificativa: '' }])
  }

  const removeItem = (index: number) => {
    onBudgetItemsChange(budgetItems.filter((_, i) => i !== index))
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-bold text-white mb-2">Proposta</h2>
        <p className="text-slate-400">
          Plano de aplicação dos recursos, justificativa técnica e resultados esperados.
        </p>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <label className="block text-sm font-bold text-slate-100 ml-1">Itens de orçamento</label>
          <button
            type="button"
            onClick={addItem}
            disabled={budgetItems.length >= EDITAL_MAX_BUDGET_ITEMS}
            className="flex items-center gap-1 text-sm font-bold text-[#22AE84] hover:text-[#1C8C6A] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus className="w-4 h-4" />
            Adicionar item
          </button>
        </div>

        {budgetItems.length === 0 && (
          <p className="text-sm text-slate-500">Nenhum item adicionado ainda.</p>
        )}

        {budgetItems.map((item, index) => (
          <div key={index} className="p-4 bg-slate-900/40 rounded-2xl border border-slate-800 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <span className="text-xs font-bold text-slate-500 mt-3">Item {index + 1}</span>
              <button
                type="button"
                onClick={() => removeItem(index)}
                className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
                aria-label="Remover item"
              >
                <Trash2 className="w-4 h-4 text-slate-400 hover:text-red-400" />
              </button>
            </div>
            <input
              type="text"
              value={item.descricao}
              onChange={(e) =>
                updateItem(index, 'descricao', e.target.value.slice(0, EDITAL_MAX_BUDGET_DESCRIPTION_LENGTH))
              }
              placeholder="Descrição do item, serviço ou equipamento"
              className={inputClass}
            />
            <input
              type="number"
              min={0}
              step="0.01"
              value={item.valor_estimado || ''}
              onChange={(e) => updateItem(index, 'valor_estimado', Number.parseFloat(e.target.value) || 0)}
              placeholder="Valor estimado (R$)"
              className={inputClass}
            />
            <textarea
              value={item.justificativa}
              onChange={(e) =>
                updateItem(index, 'justificativa', e.target.value.slice(0, EDITAL_MAX_BUDGET_JUSTIFICATION_LENGTH))
              }
              placeholder="Justificativa da despesa"
              rows={2}
              className={`${inputClass} resize-none`}
            />
          </div>
        ))}
      </div>

      <div>
        <label htmlFor="technical_justification" className="block text-sm font-bold text-slate-100 mb-3 ml-1">
          Justificativa técnica
        </label>
        <textarea
          id="technical_justification"
          value={technicalJustification}
          onChange={(e) => onTechnicalJustificationChange(e.target.value.slice(0, EDITAL_MAX_TEXT_LENGTH))}
          rows={6}
          placeholder="Situação atual do laboratório, problemas identificados e relevância da intervenção proposta"
          className={textareaClass}
        />
        <p className="mt-1 text-xs text-slate-500 text-right">
          {technicalJustification.length}/{EDITAL_MAX_TEXT_LENGTH}
        </p>
      </div>

      <div>
        <label htmlFor="expected_results" className="block text-sm font-bold text-slate-100 mb-3 ml-1">
          Resultados esperados
        </label>
        <textarea
          id="expected_results"
          value={expectedResults}
          onChange={(e) => onExpectedResultsChange(e.target.value.slice(0, EDITAL_MAX_TEXT_LENGTH))}
          rows={6}
          placeholder="Público beneficiado, impactos previstos e indicadores de acompanhamento"
          className={textareaClass}
        />
        <p className="mt-1 text-xs text-slate-500 text-right">
          {expectedResults.length}/{EDITAL_MAX_TEXT_LENGTH}
        </p>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify**

Run:
```powershell
npx tsc --noEmit
```
Expected: no output (clean pass).

- [ ] **Step 3: Commit**

```powershell
git add app/components/edital/TelaProposta.tsx
git commit -m "feat: adiciona tela de proposta e orçamento do wizard do edital"
```

---

### Task 8: Tela 5 — Declarações

**Files:**
- Create: `app/components/edital/TelaDeclaracoes.tsx`

**Interfaces:**
- Consumes: `DocumentUploadSlot` (Task 2); `EditalSubmissionDocument` (Task 1); `EDITAL_MAX_DOCUMENT_BYTES` (`lib/edital-requirements.ts`)
- Produces: `TelaDeclaracoes` (props: `token, documents, onDocumentUploaded, onDocumentRemoved, onTokenExpired`) — consumed by the wizard container (Task 10).

Note: no downloadable Anexo II/III template link is included — those files do not exist yet anywhere in this repo (`public/` has no PDFs), and generating them is explicitly out of scope (see the original spec's "Fora de escopo"). The screen only asks for the already-signed PDF upload; it does not link to a model that would 404.

- [ ] **Step 1: Create the screen**

Create `app/components/edital/TelaDeclaracoes.tsx`:

```tsx
'use client'

import { FileText } from 'lucide-react'
import DocumentUploadSlot from './DocumentUploadSlot'
import { EditalSubmissionDocument } from '@/lib/edital-proposta-api'
import { EDITAL_MAX_DOCUMENT_BYTES } from '@/lib/edital-requirements'

interface TelaDeclaracoesProps {
  token: string
  documents: EditalSubmissionDocument[]
  onDocumentUploaded: (document: EditalSubmissionDocument) => void
  onDocumentRemoved: (documentId: number) => void
  onTokenExpired: () => void
}

function findDocument(documents: EditalSubmissionDocument[], code: string): EditalSubmissionDocument | null {
  return documents.find((doc) => doc.requirementCode === code) ?? null
}

export default function TelaDeclaracoes({
  token,
  documents,
  onDocumentUploaded,
  onDocumentRemoved,
  onTokenExpired,
}: TelaDeclaracoesProps) {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-bold text-white mb-2">Declarações</h2>
        <p className="text-slate-400">
          Envie a Declaração de Responsabilidade e o Termo de Compromisso de Contrapartida,
          assinados conforme os modelos dos Anexos II e III do edital.
        </p>
      </div>

      <div className="space-y-6">
        <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
          <FileText className="w-4 h-4 text-[#22AE84]" />
          Documentos assinados
        </h3>
        <DocumentUploadSlot
          token={token}
          requirementCode="8.1.15"
          label="Declaração de Responsabilidade (Anexo II)"
          helperText="Assinada pelo coordenador ou responsável técnico pela proposta"
          accept="application/pdf"
          maxBytes={EDITAL_MAX_DOCUMENT_BYTES}
          document={findDocument(documents, '8.1.15')}
          onUploaded={onDocumentUploaded}
          onRemoved={onDocumentRemoved}
          onTokenExpired={onTokenExpired}
        />
        <DocumentUploadSlot
          token={token}
          requirementCode="8.1.16"
          label="Termo de Compromisso de Contrapartida Institucional (Anexo III)"
          helperText="Assinado pelo laboratório ou instituição proponente"
          accept="application/pdf"
          maxBytes={EDITAL_MAX_DOCUMENT_BYTES}
          document={findDocument(documents, '8.1.16')}
          onUploaded={onDocumentUploaded}
          onRemoved={onDocumentRemoved}
          onTokenExpired={onTokenExpired}
        />
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify**

Run:
```powershell
npx tsc --noEmit
```
Expected: no output (clean pass).

- [ ] **Step 3: Commit**

```powershell
git add app/components/edital/TelaDeclaracoes.tsx
git commit -m "feat: adiciona tela de declarações do wizard do edital"
```

---

### Task 9: Completeness helper and Tela 6 — Revisão

**Files:**
- Create: `lib/edital-completeness.ts`
- Create: `app/components/edital/TelaRevisao.tsx`

**Interfaces:**
- Consumes: `EditalSubmissionDocument`, `EditalMissingItem`, `EditalWizardData` (Task 1); `getSubmissionRequiredDocumentCodes`, `EDITAL_PHOTO_DOCUMENT_CODE`, `EDITAL_MIN_PHOTO_COUNT` (`lib/edital-requirements.ts`)
- Produces: `computeEditalMissingItems()`, `EDITAL_FIELD_LABELS`, `EDITAL_DOCUMENT_LABELS`, `EDITAL_STEP_BY_FIELD`, `EDITAL_STEP_BY_DOCUMENT_CODE` (`lib/edital-completeness.ts`); `TelaRevisao` (props: `data, documents, readOnly, submittedAt?, submitting?, submitError?, onNavigateToStep?, onSubmit?`) — consumed by the wizard container (Task 10), in both the editable-checklist mode (last step) and the read-only post-submission mode.

This mirrors the backend's own `computeMissingItems` (`app/api/editais/proposta/enviar/route.ts`) using the same shared constants from `lib/edital-requirements.ts`, so the client checklist and the server's authoritative check can't drift on the magic numbers/codes — only the "shape of the check" is duplicated, which is unavoidable since the browser cannot run the server's function directly.

- [ ] **Step 1: Create the completeness helper**

Create `lib/edital-completeness.ts`:

```ts
import { EditalSubmissionDocument, EditalMissingItem, EditalWizardData } from './edital-proposta-api';
import {
  getSubmissionRequiredDocumentCodes,
  EDITAL_PHOTO_DOCUMENT_CODE,
  EDITAL_MIN_PHOTO_COUNT,
} from './edital-requirements';

const REQUIRED_FIELDS: Array<{ field: string; getValue: (data: EditalWizardData) => string }> = [
  { field: 'institution_name', getValue: (data) => data.institutionName },
  { field: 'institution_cnpj', getValue: (data) => data.institutionCnpj },
  { field: 'lab_name', getValue: (data) => data.labName },
  { field: 'lab_area', getValue: (data) => data.labArea },
  { field: 'technical_justification', getValue: (data) => data.technicalJustification },
  { field: 'expected_results', getValue: (data) => data.expectedResults },
];

export function computeEditalMissingItems(
  data: EditalWizardData,
  documents: EditalSubmissionDocument[]
): EditalMissingItem[] {
  const missing: EditalMissingItem[] = [];

  for (const { field, getValue } of REQUIRED_FIELDS) {
    const value = getValue(data);
    if (!value || value.trim().length === 0) {
      missing.push({ type: 'field', field });
    }
  }

  const presentCodes = new Set(documents.map((doc) => doc.requirementCode));
  for (const code of getSubmissionRequiredDocumentCodes()) {
    if (!presentCodes.has(code)) {
      missing.push({ type: 'document', requirementCode: code });
    }
  }

  const photoCount = documents.filter((doc) => doc.requirementCode === EDITAL_PHOTO_DOCUMENT_CODE).length;
  if (photoCount < EDITAL_MIN_PHOTO_COUNT) {
    missing.push({ type: 'photo', required: EDITAL_MIN_PHOTO_COUNT, found: photoCount });
  }

  return missing;
}

export const EDITAL_FIELD_LABELS: Record<string, string> = {
  institution_name: 'Nome da instituição',
  institution_cnpj: 'CNPJ da instituição',
  lab_name: 'Nome do laboratório',
  lab_area: 'Área de atuação do laboratório',
  technical_justification: 'Justificativa técnica',
  expected_results: 'Resultados esperados',
};

export const EDITAL_DOCUMENT_LABELS: Record<string, string> = {
  '8.1.1': 'Documento oficial de identificação com foto',
  '8.1.2': 'CPF do responsável',
  '8.1.3': 'Comprovante de vínculo institucional',
  '8.1.4': 'Currículo atualizado',
  '8.1.5': 'Comprovante de CNPJ da instituição',
  '8.1.6': 'Carta de anuência da instituição',
  '8.1.7': 'Documento de identificação do laboratório',
  '8.1.9': 'Planta/layout do espaço físico',
  '8.1.15': 'Declaração de responsabilidade',
  '8.1.16': 'Termo de compromisso de contrapartida',
};

export const EDITAL_STEP_BY_FIELD: Record<string, string> = {
  institution_name: 'instituicao',
  institution_cnpj: 'instituicao',
  lab_name: 'instituicao',
  lab_area: 'instituicao',
  technical_justification: 'proposta',
  expected_results: 'proposta',
};

export const EDITAL_STEP_BY_DOCUMENT_CODE: Record<string, string> = {
  '8.1.1': 'equipe',
  '8.1.2': 'equipe',
  '8.1.3': 'equipe',
  '8.1.4': 'equipe',
  '8.1.5': 'instituicao',
  '8.1.6': 'instituicao',
  '8.1.7': 'instituicao',
  '8.1.9': 'fotos',
  '8.1.15': 'declaracoes',
  '8.1.16': 'declaracoes',
};
```

- [ ] **Step 2: Create the review screen**

Create `app/components/edital/TelaRevisao.tsx`:

```tsx
'use client'

import { CheckCircle2, XCircle, Loader2 } from 'lucide-react'
import { EditalSubmissionDocument, EditalWizardData } from '@/lib/edital-proposta-api'
import {
  computeEditalMissingItems,
  EDITAL_FIELD_LABELS,
  EDITAL_DOCUMENT_LABELS,
  EDITAL_STEP_BY_FIELD,
  EDITAL_STEP_BY_DOCUMENT_CODE,
} from '@/lib/edital-completeness'
import { EDITAL_MIN_PHOTO_COUNT } from '@/lib/edital-requirements'

interface TelaRevisaoProps {
  data: EditalWizardData
  documents: EditalSubmissionDocument[]
  readOnly: boolean
  submittedAt?: string | null
  submitting?: boolean
  submitError?: string | null
  onNavigateToStep?: (step: string) => void
  onSubmit?: () => void
}

export default function TelaRevisao({
  data,
  documents,
  readOnly,
  submittedAt,
  submitting,
  submitError,
  onNavigateToStep,
  onSubmit,
}: TelaRevisaoProps) {
  const missing = computeEditalMissingItems(data, documents)
  const missingKeys = new Set(
    missing.map((item) =>
      item.type === 'field' ? `field:${item.field}` : item.type === 'document' ? `document:${item.requirementCode}` : 'photo'
    )
  )

  const fieldRows = Object.entries(EDITAL_FIELD_LABELS).map(([field, label]) => ({
    key: `field:${field}`,
    label,
    ok: !missingKeys.has(`field:${field}`),
    step: EDITAL_STEP_BY_FIELD[field],
  }))

  const documentRows = Object.entries(EDITAL_DOCUMENT_LABELS).map(([code, label]) => ({
    key: `document:${code}`,
    label,
    ok: !missingKeys.has(`document:${code}`),
    step: EDITAL_STEP_BY_DOCUMENT_CODE[code],
  }))

  const rows = [
    ...fieldRows,
    ...documentRows,
    {
      key: 'photo',
      label: `Fotos do laboratório (mín. ${EDITAL_MIN_PHOTO_COUNT})`,
      ok: !missingKeys.has('photo'),
      step: 'fotos',
    },
  ]

  if (readOnly) {
    return (
      <div className="space-y-8">
        <div className="text-center">
          <CheckCircle2 className="w-12 h-12 text-[#22AE84] mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">Proposta enviada</h2>
          {submittedAt && (
            <p className="text-slate-400">Enviada em {new Date(submittedAt).toLocaleString('pt-BR')}</p>
          )}
        </div>
        <ul className="space-y-2">
          {rows.map((row) => (
            <li key={row.key} className="flex items-center gap-3 p-3 bg-slate-900/40 rounded-xl">
              <CheckCircle2 className="w-4 h-4 text-[#22AE84] flex-shrink-0" />
              <span className="text-sm text-slate-200">{row.label}</span>
            </li>
          ))}
        </ul>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-bold text-white mb-2">Revisão e envio</h2>
        <p className="text-slate-400">
          Confira se todos os itens obrigatórios estão completos antes de enviar sua proposta.
        </p>
      </div>

      <ul className="space-y-2">
        {rows.map((row) => (
          <li key={row.key}>
            <button
              type="button"
              onClick={() => onNavigateToStep?.(row.step)}
              className="w-full flex items-center gap-3 p-3 bg-slate-900/40 hover:bg-slate-900/60 rounded-xl transition-colors text-left"
            >
              {row.ok ? (
                <CheckCircle2 className="w-4 h-4 text-[#22AE84] flex-shrink-0" />
              ) : (
                <XCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
              )}
              <span className="text-sm text-slate-200">{row.label}</span>
            </button>
          </li>
        ))}
      </ul>

      {submitError && <p className="text-sm text-red-400 font-medium">{submitError}</p>}

      <button
        type="button"
        onClick={onSubmit}
        disabled={missing.length > 0 || submitting}
        className="w-full px-6 py-4 bg-[#22AE84] hover:bg-[#1C8C6A] disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-2xl font-bold transition-all flex items-center justify-center gap-2"
      >
        {submitting && <Loader2 className="w-5 h-5 animate-spin" />}
        {submitting ? 'Enviando...' : 'Enviar proposta'}
      </button>
    </div>
  )
}
```

- [ ] **Step 3: Verify**

Run:
```powershell
npx tsc --noEmit
```
Expected: no output (clean pass).

- [ ] **Step 4: Commit**

```powershell
git add lib/edital-completeness.ts app/components/edital/TelaRevisao.tsx
git commit -m "feat: adiciona checklist de completude e tela de revisão do wizard do edital"
```

---

### Task 10: Wizard container and route

**Files:**
- Create: `app/components/edital/EditalPropostaWizard.tsx`
- Create: `app/edital/proposta/page.tsx`

**Interfaces:**
- Consumes: everything from Tasks 1-9 (`getEditalSession`, `clearEditalSession`, `EditalSessionPrefill` from `lib/edital-session.ts`; all of `lib/edital-proposta-api.ts`; `EditalStepper`, `TelaEquipe`, `TelaInstituicao` + `TelaInstituicaoField`, `TelaFotos`, `TelaProposta`, `TelaDeclaracoes`, `TelaRevisao`)
- Produces: `EditalPropostaWizard` (no props, self-contained) rendered by `app/edital/proposta/page.tsx` — this is the final integration point; nothing later consumes it except Task 11's Link from the gate.

- [ ] **Step 1: Create the wizard container**

Create `app/components/edital/EditalPropostaWizard.tsx`:

```tsx
'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, ChevronLeft, ChevronRight, Save } from 'lucide-react'
import EditalStepper from './EditalStepper'
import TelaEquipe from './TelaEquipe'
import TelaInstituicao, { TelaInstituicaoField } from './TelaInstituicao'
import TelaFotos from './TelaFotos'
import TelaProposta from './TelaProposta'
import TelaDeclaracoes from './TelaDeclaracoes'
import TelaRevisao from './TelaRevisao'
import { getEditalSession, clearEditalSession, EditalSessionPrefill } from '@/lib/edital-session'
import {
  EditalSubmissionDocument,
  EditalWizardData,
  EditalDraftStep,
  EditalApiError,
  EMPTY_WIZARD_DATA,
  fetchEditalDraft,
  saveEditalDraftStep,
  submitEditalProposal,
  submissionToWizardData,
} from '@/lib/edital-proposta-api'

type WizardStep = 'equipe' | 'instituicao' | 'fotos' | 'proposta' | 'declaracoes' | 'revisao'

const STEPS: Array<{ key: WizardStep; label: string }> = [
  { key: 'equipe', label: 'Equipe' },
  { key: 'instituicao', label: 'Instituição' },
  { key: 'fotos', label: 'Fotos' },
  { key: 'proposta', label: 'Proposta' },
  { key: 'declaracoes', label: 'Declarações' },
  { key: 'revisao', label: 'Revisão' },
]

const DRAFT_STEP_BY_WIZARD_STEP: Partial<Record<WizardStep, EditalDraftStep>> = {
  equipe: 'equipe',
  instituicao: 'instituicao',
  proposta: 'proposta',
}

const LAST_STEP_STORAGE_KEY = 'edital_proposta_last_step'

function buildStepPayload(step: EditalDraftStep, data: EditalWizardData): Record<string, unknown> {
  if (step === 'equipe') {
    return { team_description: data.teamDescription }
  }
  if (step === 'instituicao') {
    return {
      institution_name: data.institutionName,
      institution_cnpj: data.institutionCnpj,
      lab_name: data.labName,
      lab_area: data.labArea,
      lab_served_public: data.labServedPublic,
    }
  }
  return {
    budget_items: data.budgetItems,
    technical_justification: data.technicalJustification,
    expected_results: data.expectedResults,
  }
}

export default function EditalPropostaWizard() {
  const router = useRouter()
  const [token, setToken] = useState<string | null>(null)
  const [prefill, setPrefill] = useState<EditalSessionPrefill | null>(null)
  const [status, setStatus] = useState<'loading' | 'ready' | 'submitted' | 'error'>('loading')
  const [loadError, setLoadError] = useState('')
  const [currentStep, setCurrentStep] = useState<WizardStep>('equipe')
  const [data, setData] = useState<EditalWizardData>(EMPTY_WIZARD_DATA)
  const [documents, setDocuments] = useState<EditalSubmissionDocument[]>([])
  const [submittedAt, setSubmittedAt] = useState<string | null>(null)
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [showSavedConfirmation, setShowSavedConfirmation] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const handleTokenExpired = useCallback(() => {
    clearEditalSession()
    router.replace('/edital?expired=1')
  }, [router])

  useEffect(() => {
    const session = getEditalSession()
    if (!session) {
      router.replace('/edital')
      return
    }

    setToken(session.token)
    setPrefill(session.prefill)

    fetchEditalDraft(session.token)
      .then((submission) => {
        if (submission) {
          setData(submissionToWizardData(submission))
          setDocuments(submission.documents)
        }

        if (submission?.status === 'SUBMITTED') {
          setSubmittedAt(submission.submittedAt)
          setStatus('submitted')
          return
        }

        const lastStep = typeof window !== 'undefined' ? localStorage.getItem(LAST_STEP_STORAGE_KEY) : null
        if (lastStep && STEPS.some((step) => step.key === lastStep)) {
          setCurrentStep(lastStep as WizardStep)
        }

        setStatus('ready')
      })
      .catch((error) => {
        if (error instanceof EditalApiError && error.reason === 'token_expired') {
          handleTokenExpired()
          return
        }
        setLoadError('Não foi possível carregar seu rascunho. Recarregue a página para tentar novamente.')
        setStatus('error')
      })
  }, [router, handleTokenExpired])

  useEffect(() => {
    if (status === 'ready' && typeof window !== 'undefined') {
      localStorage.setItem(LAST_STEP_STORAGE_KEY, currentStep)
    }
  }, [currentStep, status])

  const persistCurrentStep = useCallback((): Promise<void> => {
    const draftStep = DRAFT_STEP_BY_WIZARD_STEP[currentStep]
    if (!draftStep || !token) {
      return Promise.resolve()
    }

    setSaveState('saving')
    return saveEditalDraftStep(token, draftStep, buildStepPayload(draftStep, data))
      .then(() => {
        setSaveState('saved')
      })
      .catch((error) => {
        if (error instanceof EditalApiError && error.reason === 'token_expired') {
          handleTokenExpired()
          return
        }
        setSaveState('error')
      })
  }, [currentStep, token, data, handleTokenExpired])

  const goToStep = (step: string) => {
    persistCurrentStep()
    setCurrentStep(step as WizardStep)
  }

  const handleSaveAndContinueLater = () => {
    persistCurrentStep().then(() => {
      setShowSavedConfirmation(true)
      setTimeout(() => setShowSavedConfirmation(false), 3000)
    })
  }

  const handleDocumentUploaded = (document: EditalSubmissionDocument) => {
    setDocuments((prev) => [...prev.filter((doc) => doc.id !== document.id), document])
  }

  const handleDocumentRemoved = (documentId: number) => {
    setDocuments((prev) => prev.filter((doc) => doc.id !== documentId))
  }

  const handleSubmit = async () => {
    if (!token) return
    setSubmitting(true)
    setSubmitError(null)
    try {
      const result = await submitEditalProposal(token)
      setSubmittedAt(result.submittedAt)
      setStatus('submitted')
    } catch (error) {
      if (error instanceof EditalApiError && error.reason === 'token_expired') {
        handleTokenExpired()
        return
      }
      if (error instanceof EditalApiError && error.reason === 'already_submitted') {
        setStatus('submitted')
        return
      }
      if (error instanceof EditalApiError && error.reason === 'incomplete') {
        setSubmitError('Ainda há itens pendentes. Confira a lista abaixo.')
        return
      }
      setSubmitError('Não foi possível enviar a proposta agora. Tente novamente em instantes.')
    } finally {
      setSubmitting(false)
    }
  }

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-8 h-8 text-[#22AE84] animate-spin" />
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className="bg-slate-900/40 backdrop-blur-xl rounded-[2.5rem] p-8 sm:p-12 border border-slate-800 shadow-2xl text-center">
        <p className="text-slate-300">{loadError}</p>
      </div>
    )
  }

  if (status === 'submitted') {
    return (
      <div className="bg-slate-900/40 backdrop-blur-xl rounded-[2.5rem] p-8 sm:p-12 border border-slate-800 shadow-2xl">
        <TelaRevisao data={data} documents={documents} readOnly submittedAt={submittedAt} />
      </div>
    )
  }

  const currentIndex = STEPS.findIndex((step) => step.key === currentStep)
  const isFirstStep = currentIndex === 0
  const isLastStep = currentStep === 'revisao'

  return (
    <div className="bg-slate-900/40 backdrop-blur-xl rounded-[2.5rem] p-8 sm:p-12 border border-slate-800 shadow-2xl">
      <EditalStepper steps={STEPS} currentStep={currentStep} onStepClick={goToStep} />

      {currentStep === 'equipe' && prefill && token && (
        <TelaEquipe
          prefill={prefill}
          token={token}
          teamDescription={data.teamDescription}
          onTeamDescriptionChange={(value) => setData((prev) => ({ ...prev, teamDescription: value }))}
          documents={documents}
          onDocumentUploaded={handleDocumentUploaded}
          onDocumentRemoved={handleDocumentRemoved}
          onTokenExpired={handleTokenExpired}
        />
      )}

      {currentStep === 'instituicao' && token && (
        <TelaInstituicao
          token={token}
          institutionName={data.institutionName}
          institutionCnpj={data.institutionCnpj}
          labName={data.labName}
          labArea={data.labArea}
          labServedPublic={data.labServedPublic}
          onFieldChange={(field: TelaInstituicaoField, value: string) =>
            setData((prev) => ({ ...prev, [field]: value }))
          }
          documents={documents}
          onDocumentUploaded={handleDocumentUploaded}
          onDocumentRemoved={handleDocumentRemoved}
          onTokenExpired={handleTokenExpired}
        />
      )}

      {currentStep === 'fotos' && token && (
        <TelaFotos
          token={token}
          documents={documents}
          onDocumentUploaded={handleDocumentUploaded}
          onDocumentRemoved={handleDocumentRemoved}
          onTokenExpired={handleTokenExpired}
        />
      )}

      {currentStep === 'proposta' && (
        <TelaProposta
          budgetItems={data.budgetItems}
          onBudgetItemsChange={(items) => setData((prev) => ({ ...prev, budgetItems: items }))}
          technicalJustification={data.technicalJustification}
          onTechnicalJustificationChange={(value) =>
            setData((prev) => ({ ...prev, technicalJustification: value }))
          }
          expectedResults={data.expectedResults}
          onExpectedResultsChange={(value) => setData((prev) => ({ ...prev, expectedResults: value }))}
        />
      )}

      {currentStep === 'declaracoes' && token && (
        <TelaDeclaracoes
          token={token}
          documents={documents}
          onDocumentUploaded={handleDocumentUploaded}
          onDocumentRemoved={handleDocumentRemoved}
          onTokenExpired={handleTokenExpired}
        />
      )}

      {currentStep === 'revisao' && (
        <TelaRevisao
          data={data}
          documents={documents}
          readOnly={false}
          submitting={submitting}
          submitError={submitError}
          onNavigateToStep={goToStep}
          onSubmit={handleSubmit}
        />
      )}

      <div className="mt-8 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {!isFirstStep && (
            <button
              type="button"
              onClick={() => goToStep(STEPS[currentIndex - 1].key)}
              className="flex items-center gap-1 px-4 py-3 border border-slate-700/50 text-slate-200 rounded-2xl font-bold hover:border-[#22AE84] transition-all"
            >
              <ChevronLeft className="w-4 h-4" />
              Voltar
            </button>
          )}
          <button
            type="button"
            onClick={handleSaveAndContinueLater}
            className="flex items-center gap-1 px-4 py-3 text-sm text-slate-400 hover:text-slate-200 transition-colors"
          >
            <Save className="w-4 h-4" />
            {showSavedConfirmation ? 'Salvo!' : 'Salvar e continuar depois'}
          </button>
        </div>

        {!isLastStep && (
          <button
            type="button"
            onClick={() => goToStep(STEPS[currentIndex + 1].key)}
            className="flex items-center gap-1 px-6 py-3 bg-[#22AE84] hover:bg-[#1C8C6A] text-white rounded-2xl font-bold transition-all"
          >
            Avançar
            <ChevronRight className="w-4 h-4" />
          </button>
        )}
      </div>

      <p className="mt-3 text-xs text-slate-500 text-right">
        {saveState === 'saving' && 'Salvando...'}
        {saveState === 'saved' && 'Salvo'}
        {saveState === 'error' && 'Erro ao salvar automaticamente'}
      </p>
    </div>
  )
}
```

- [ ] **Step 2: Create the route page**

Create `app/edital/proposta/page.tsx`:

```tsx
import type { Metadata } from 'next'
import EditalPropostaWizard from '../../components/edital/EditalPropostaWizard'

export const metadata: Metadata = {
  title: 'Proposta ao Edital PPI | InnovaNation',
  description: 'Envie sua proposta de patrocínio ao Edital PPI da comunidade InnovaNation.',
}

export default function EditalPropostaPage() {
  return (
    <main className="flex-1 relative z-10 min-h-screen flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-3xl">
        <EditalPropostaWizard />
      </div>
    </main>
  )
}
```

- [ ] **Step 3: Verify**

Run:
```powershell
npx tsc --noEmit
```
Expected: no output (clean pass).

- [ ] **Step 4: Commit**

```powershell
git add app/components/edital/EditalPropostaWizard.tsx app/edital/proposta/page.tsx
git commit -m "feat: adiciona container do wizard e rota /edital/proposta"
```

---

### Task 11: Gate integration

**Files:**
- Modify: `app/components/EditalCpfGate.tsx`
- Modify: `app/edital/page.tsx`

**Interfaces:**
- Consumes: nothing new
- Produces: nothing new — this is the final wiring step, connecting the already-working gate to the already-working wizard (Task 10), and closing the loop back from an expired-token redirect (Task 10's `handleTokenExpired`).

- [ ] **Step 1: Replace the disabled "Continuar" button with a real link**

In `app/components/EditalCpfGate.tsx`, find the `granted` state block:

```tsx
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
```

Replace it with:

```tsx
  if (state === 'granted') {
    return (
      <div className="bg-slate-900/40 backdrop-blur-xl rounded-[2.5rem] p-8 sm:p-12 border border-slate-800 shadow-2xl text-center">
        <CheckCircle2 className="w-12 h-12 text-[#22AE84] mx-auto mb-4" />
        <h2 className="text-xl font-bold text-white mb-3">
          Bem-vindo(a), {welcomeName}!
        </h2>
        <p className="text-slate-300 mb-8">
          Seu cadastro na comunidade InnovaNation foi confirmado. Continue para preencher
          o formulário de submissão da proposta ao Edital PPI.
        </p>
        <Link
          href="/edital/proposta"
          className="block w-full px-6 py-4 bg-[#22AE84] hover:bg-[#1C8C6A] text-white rounded-2xl font-bold transition-all text-center"
        >
          Continuar
        </Link>
      </div>
    )
  }
```

`Link` is already imported at the top of this file (`import Link from 'next/link'`) — no new import needed.

- [ ] **Step 2: Handle `?expired=1` on the gate page**

Replace the full contents of `app/edital/page.tsx`:

```tsx
import type { Metadata } from 'next'
import EditalCpfGate from '../components/EditalCpfGate'

export const metadata: Metadata = {
  title: 'Edital PPI 2026 | InnovaNation',
  description: 'Confirme sua inscrição na comunidade InnovaNation para submeter sua proposta ao Edital PPI.',
}

export default async function EditalPage({
  searchParams,
}: {
  searchParams: Promise<{ expired?: string }>
}) {
  const params = await searchParams
  const sessionExpired = params.expired === '1'

  return (
    <main className="flex-1 relative z-10 min-h-screen flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-xl">
        {sessionExpired && (
          <div className="mb-4 p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl text-center">
            <p className="text-sm text-amber-300 font-medium">
              Sua sessão expirou. Informe seu CPF novamente para continuar.
            </p>
          </div>
        )}
        <EditalCpfGate />
      </div>
    </main>
  )
}
```

(`searchParams` as a `Promise` matches the Next.js 15 App Router convention already used for dynamic route `params` in this codebase, e.g. `app/api/documents/[id]/route.ts` and `app/api/editais/proposta/documento/[id]/route.ts`.)

- [ ] **Step 3: Verify**

Run:
```powershell
npx tsc --noEmit
```
Expected: no output (clean pass).

- [ ] **Step 4: Commit**

```powershell
git add app/components/EditalCpfGate.tsx app/edital/page.tsx
git commit -m "feat: conecta o gate de CPF ao wizard de proposta do edital"
```

## Self-Review

**1. Spec coverage**
- Arquitetura de componentes (container + 6 telas + slots reutilizáveis + stepper + cliente de API): Tasks 1-3, 10.
- Fluxo de dados na montagem (sessão, restauração de rascunho, redirect por token expirado, tela somente-leitura pós-envio): Task 10.
- Autosave ao navegar + botão "Salvar e continuar depois": Task 10.
- Upload de documento com preview/substituir/remover: Task 2, usado nas Tasks 4-8.
- Envio final com tratamento de `incomplete`/`already_submitted`: Tasks 9-10.
- Checklist de completude por item, sem prévia de conteúdo: Task 9.
- Navegação livre via stepper: Tasks 3, 10.
- Integração com o gate (botão "Continuar" real + aviso de sessão expirada): Task 11.
- Bug do `8.1.8` descoberto durante o planejamento: corrigido no backend (`feature/edital-proposta-envio`) antes deste plano, documentado nos Global Constraints — nenhuma task deste plano precisa tratá-lo.

**2. Placeholder scan**
- Nenhum `TBD`, `TODO` ou "implementar depois" em nenhuma task. O único item deliberadamente fora de escopo (link de download dos modelos ANEXO II/III) está documentado como omissão intencional na Task 8, não como uma lacuna a preencher depois neste mesmo plano.

**3. Type consistency**
- `EditalWizardData`, `EditalSubmissionDocument`, `EditalBudgetItem`, `EditalMissingItem`, `EditalApiError`, `EditalDraftStep` (Task 1) são os únicos tipos de dados da API usados por todas as tasks seguintes, sem redefinição divergente.
- `TelaInstituicaoField` é exportado pela Task 5 e consumido apenas pela Task 10 (`onFieldChange`), com a mesma assinatura.
- `EDITAL_STEP_BY_FIELD`/`EDITAL_STEP_BY_DOCUMENT_CODE` (Task 9) usam exatamente as mesmas 6 chaves de wizard step (`equipe, instituicao, fotos, proposta, declaracoes, revisao`) definidas em `STEPS` (Task 10).
