# Edital Proposta Backend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the complete backend/API flow for `/edital/proposta`, including draft persistence, document upload/download, PDF generation for the participation term, and final submission sync.

**Architecture:** The backend will be split into four small, independently testable slices: schema + draft persistence, document storage endpoints, PDF generation utility, and final submission validation/sync. Routes will stay thin and rely on shared helpers for requirement metadata, S3 access, and Google Sheets export.

**Tech Stack:** Next.js 15 route handlers, PostgreSQL, AWS S3 via `lib/s3.ts`, Google Sheets via `lib/google-sheets.ts`, `pdf-lib`, Node crypto.

## Global Constraints

- `registration_id UNIQUE` em `edital_submissions` garante "uma proposta por pessoa" no nível do banco, não só na aplicação.
- Toda rota de `/api/editais/proposta/*` exige o header `X-Edital-Token`.
- O servidor sempre decodifica o token via `verifyEditalToken` (`lib/edital-auth.ts`) e confia apenas no `registrationId` que ele carrega.
- `isTrustedOrigin` + `enforceRateLimit` em todas as rotas.
- Limites generosos para não atrapalhar quem está preenchendo: 30 req/10min por bucket (`edital-proposta-rascunho`, `edital-proposta-documento`).
- Validação de completude fica só no endpoint `enviar`.
- Todo campo de texto passa por `containsDangerousInput` (`lib/security.ts`).
- Textos longos (`technical_justification`, `expected_results`, `team_description`, `lab_served_public`): limite de 5000 caracteres.
- `budget_items`: máximo 20 itens; cada um com `descricao` (≤200 car.), `valor_estimado` (número > 0), `justificativa` (≤500 car.).
- Fotos: mínimo 3 para permitir envio final, máximo técnico 8.
- Download de documento (`GET .../documento/:id`) deve devolver `{ ok: true, url: <signed url> }` em JSON.
- O upload multipart deve seguir o padrão de `app/api/inscricoes/route.ts` para leitura e validação do `File`.
- O objeto antigo no S3 pode ficar órfão após substituição de documento; não há limpeza automática neste escopo.

---

### Task 1: Migration e rascunho

**Files:**
- Create: `database/migrations/009_create_edital_submissions.sql`
- Modify: `run-migration.js`
- Create: `app/api/editais/proposta/rascunho/route.ts`

**Interfaces:**
- Consumes: `verifyEditalToken`, `isTrustedOrigin`, `enforceRateLimit`, `containsDangerousInput`, `query`, `queryOne`
- Produces: `POST /api/editais/proposta/rascunho` e `GET /api/editais/proposta/rascunho`

- [ ] **Step 1: Write the migration SQL**

```sql
CREATE TABLE edital_submissions (
  id                      BIGSERIAL PRIMARY KEY,
  registration_id         BIGINT NOT NULL UNIQUE REFERENCES registrations(id),
  status                  VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
  team_description        TEXT,
  institution_name         VARCHAR(255),
  institution_cnpj         VARCHAR(20),
  lab_name                 VARCHAR(255),
  lab_area                 VARCHAR(255),
  lab_served_public        TEXT,
  budget_items             JSONB,
  technical_justification  TEXT,
  expected_results         TEXT,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  submitted_at             TIMESTAMPTZ
);

CREATE INDEX idx_edital_submissions_registration_id ON edital_submissions(registration_id);
CREATE INDEX idx_edital_submissions_status ON edital_submissions(status);

CREATE TABLE edital_submission_documents (
  id                    BIGSERIAL PRIMARY KEY,
  submission_id         BIGINT NOT NULL REFERENCES edital_submissions(id) ON DELETE CASCADE,
  requirement_code      VARCHAR(20) NOT NULL,
  s3_key                TEXT NOT NULL,
  file_hash             CHAR(64) NOT NULL,
  mime_type             VARCHAR(100) NOT NULL,
  size_bytes            INTEGER NOT NULL,
  original_filename     VARCHAR(255),
  uploaded_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_edital_submission_documents_submission_id ON edital_submission_documents(submission_id);

CREATE TRIGGER trg_edital_submissions_updated_at
BEFORE UPDATE ON edital_submissions
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

- [ ] **Step 2: Add the migration to the hardcoded runner**

```js
const migrations = [
  'database/migrations/008_add_extra_legal_fields.sql',
  'database/migrations/008_add_address_fields.sql',
  'database/migrations/009_create_edital_submissions.sql'
];
```

- [ ] **Step 3: Implement the draft route**

```ts
type DraftStep = 'equipe' | 'instituicao' | 'proposta';

type DraftResponse = {
  ok: true;
  submission: {
    id: number;
    registrationId: number;
    status: 'DRAFT' | 'SUBMITTED';
    teamDescription: string | null;
    institutionName: string | null;
    institutionCnpj: string | null;
    labName: string | null;
    labArea: string | null;
    labServedPublic: string | null;
    budgetItems: Array<{
      descricao: string;
      valor_estimado: number;
      justificativa: string;
    }> | null;
    technicalJustification: string | null;
    expectedResults: string | null;
    submittedAt: string | null;
    documents: Array<{
      id: number;
      requirementCode: string;
      originalFilename: string | null;
      mimeType: string;
      sizeBytes: number;
      uploadedAt: string;
    }>;
  } | null;
};
```

- [ ] **Step 4: Keep validation permissive for drafts**

```ts
const MAX_TEXT_LENGTH = 5000;

function validateTextField(value: unknown): string {
  if (typeof value !== 'string') return '';
  if (containsDangerousInput(value)) throw new Error('Conteúdo inválido detectado');
  if (value.length > MAX_TEXT_LENGTH) throw new Error('Campo excede o limite permitido');
  return value.trim();
}
```

- [ ] **Step 5: Implement stage-specific UPSERTs**

```ts
// equipe
INSERT INTO edital_submissions (registration_id, team_description)
VALUES ($1, $2)
ON CONFLICT (registration_id) DO UPDATE
SET team_description = EXCLUDED.team_description,
    updated_at = NOW();

// instituicao
INSERT INTO edital_submissions (registration_id, institution_name, institution_cnpj, lab_name, lab_area, lab_served_public)
VALUES ($1, $2, $3, $4, $5, $6)
ON CONFLICT (registration_id) DO UPDATE
SET institution_name = EXCLUDED.institution_name,
    institution_cnpj = EXCLUDED.institution_cnpj,
    lab_name = EXCLUDED.lab_name,
    lab_area = EXCLUDED.lab_area,
    lab_served_public = EXCLUDED.lab_served_public,
    updated_at = NOW();

// proposta
INSERT INTO edital_submissions (registration_id, budget_items, technical_justification, expected_results)
VALUES ($1, $2, $3, $4)
ON CONFLICT (registration_id) DO UPDATE
SET budget_items = EXCLUDED.budget_items,
    technical_justification = EXCLUDED.technical_justification,
    expected_results = EXCLUDED.expected_results,
    updated_at = NOW();
```

- [ ] **Step 6: Add GET restore behavior**

```sql
SELECT
  s.id,
  s.registration_id,
  s.status,
  s.team_description,
  s.institution_name,
  s.institution_cnpj,
  s.lab_name,
  s.lab_area,
  s.lab_served_public,
  s.budget_items,
  s.technical_justification,
  s.expected_results,
  s.submitted_at
FROM edital_submissions s
WHERE s.registration_id = $1
LIMIT 1;
```

```sql
SELECT
  id,
  requirement_code,
  original_filename,
  mime_type,
  size_bytes,
  uploaded_at
FROM edital_submission_documents
WHERE submission_id = $1
ORDER BY uploaded_at ASC, id ASC;
```

- [ ] **Step 7: Verify the migration and draft route**

Run:
```powershell
npm run migrate
npx tsc --noEmit
```

Expected:
```text
009_create_edital_submissions.sql executed successfully
TypeScript compilation succeeds
```

- [ ] **Step 8: Commit**

```powershell
git add database/migrations/009_create_edital_submissions.sql run-migration.js app/api/editais/proposta/rascunho/route.ts
git commit -m "feat: add edital proposal draft persistence"
```

### Task 2: Upload e download de documentos

**Files:**
- Create: `lib/edital-requirements.ts`
- Modify: `lib/s3.ts`
- Create: `app/api/editais/proposta/documento/route.ts`
- Create: `app/api/editais/proposta/documento/[id]/route.ts`

**Interfaces:**
- Consumes: `verifyEditalToken`, `isTrustedOrigin`, `enforceRateLimit`, `hasValidFileSignature`, `calculateFileHash`, `uploadFile`, `getSignedFileUrl`, `query`, `queryOne`
- Produces: `POST /api/editais/proposta/documento`, `GET /api/editais/proposta/documento/:id`, `DELETE /api/editais/proposta/documento/:id`

- [ ] **Step 1: Define requirement metadata in one shared module**

```ts
export type RequirementCode =
  | '8.1.1'
  | '8.1.2'
  | '8.1.3'
  | '8.1.4'
  | '8.1.5'
  | '8.1.6'
  | '8.1.7'
  | '8.1.8'
  | '8.1.9'
  | '8.1.10'
  | '8.1.15'
  | '8.1.16'
  | 'foto';

export const REQUIRED_DOCUMENT_CODES: RequirementCode[] = [
  '8.1.1', '8.1.2', '8.1.3', '8.1.4',
  '8.1.5', '8.1.6', '8.1.7', '8.1.8', '8.1.9',
  '8.1.15', '8.1.16',
];

export const PHOTO_REQUIREMENT_CODE: RequirementCode = 'foto';
```

- [ ] **Step 2: Extend the S3 helper without breaking callers**

```ts
export async function uploadFile(
  file: Buffer,
  fileName: string,
  mimeType: string,
  keyPrefix: string = 'documents'
): Promise<{ filePath: string; url: string }> {
  const timestamp = Date.now();
  const randomHash = crypto.randomBytes(8).toString('hex');
  const extension = fileName.split('.').pop() || 'bin';
  const uniqueFileName = `${keyPrefix}/${timestamp}-${randomHash}.${extension}`;
  ...
}
```

- [ ] **Step 3: Implement POST upload with strict file validation**

```ts
const MAX_PDF_BYTES = 10 * 1024 * 1024;
const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
const ALLOWED_PHOTO_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

function validateDocumentPayload(requirementCode: string, file: File, buffer: Buffer): void {
  if (requirementCode === 'foto') {
    if (!ALLOWED_PHOTO_TYPES.has(file.type)) throw new Error('Formato de foto inválido');
    if (buffer.length > MAX_PHOTO_BYTES) throw new Error('Foto acima do limite');
    return;
  }

  if (file.type !== 'application/pdf') throw new Error('Documento deve ser PDF');
  if (buffer.length > MAX_PDF_BYTES) throw new Error('PDF acima do limite');
}
```

- [ ] **Step 4: Store document metadata and replace by requirement code**

```sql
WITH replaced AS (
  DELETE FROM edital_submission_documents
  WHERE submission_id = $1 AND requirement_code = $2
  RETURNING id
)
INSERT INTO edital_submission_documents (
  submission_id, requirement_code, s3_key, file_hash, mime_type, size_bytes, original_filename
)
VALUES ($1, $2, $3, $4, $5, $6, $7)
RETURNING id;
```

- [ ] **Step 5: Implement signed-url download with ownership check**

```ts
SELECT d.id, d.s3_key, s.registration_id
FROM edital_submission_documents d
JOIN edital_submissions s ON s.id = d.submission_id
WHERE d.id = $1
LIMIT 1;
```

- [ ] **Step 6: Implement delete without touching S3**

```ts
DELETE FROM edital_submission_documents
WHERE id = $1
AND submission_id = $2;
```

- [ ] **Step 7: Verify upload/download paths**

Run:
```powershell
npx tsc --noEmit
npm run lint
```

And test with curl after the app is up:
```powershell
curl -X POST http://localhost:3000/api/editais/proposta/documento -H "X-Edital-Token: ..." -F "requirementCode=8.1.1" -F "file=@C:\temp\doc.pdf"
```

- [ ] **Step 8: Commit**

```powershell
git add lib/edital-requirements.ts lib/s3.ts app/api/editais/proposta/documento/route.ts app/api/editais/proposta/documento/[id]/route.ts
git commit -m "feat: add edital proposal document endpoints"
```

### Task 3: Geração do termo em PDF

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Create: `lib/edital-pdf.ts`
- Create: `scripts/test-edital-proposta-pdf.ts`

**Interfaces:**
- Consumes: `pdf-lib`
- Produces: `generateParticipationTermPdf(...)` and a standalone verification script

- [ ] **Step 1: Add the dependency**

```powershell
npm install pdf-lib
```

- [ ] **Step 2: Define the PDF generator signature**

```ts
export type ParticipationTermInput = {
  fullName: string;
  cpf: string;
  registrationDate: Date;
  submissionId: number;
};

export async function generateParticipationTermPdf(input: ParticipationTermInput): Promise<Buffer>;
```

- [ ] **Step 3: Generate a one-page PDF using standard fonts**

```ts
const pdfDoc = await PDFDocument.create();
const page = pdfDoc.addPage([595.28, 841.89]);
const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
page.drawText('Termo de Comprovação de Participação', { x: 48, y: 780, size: 18, font });
```

- [ ] **Step 4: Mask CPF inside the document text**

```ts
function maskCpf(cpf: string): string {
  const digits = cpf.replace(/\D/g, '');
  return digits.length === 11 ? `${digits.slice(0, 3)}.***.***-${digits.slice(9)}` : cpf;
}
```

- [ ] **Step 5: Add a standalone script that prints basic PDF metadata**

```ts
import { generateParticipationTermPdf } from '../lib/edital-pdf';

const pdf = await generateParticipationTermPdf({
  fullName: 'Teste',
  cpf: '12345678909',
  registrationDate: new Date('2026-07-17T12:00:00Z'),
  submissionId: 123,
});

console.log(`PDF bytes: ${pdf.length}`);
console.log(`Header: ${pdf.subarray(0, 5).toString('utf8')}`);
```

- [ ] **Step 6: Verify the PDF generator**

Run:
```powershell
npx tsx scripts/test-edital-proposta-pdf.ts
npx tsc --noEmit
```

Expected:
```text
PDF bytes: > 0
Header: %PDF-
```

- [ ] **Step 7: Commit**

```powershell
git add package.json package-lock.json lib/edital-pdf.ts scripts/test-edital-proposta-pdf.ts
git commit -m "feat: add edital participation term pdf generator"
```

### Task 4: Final submission and sync

**Files:**
- Modify: `lib/google-sheets.ts`
- Create: `app/api/editais/proposta/enviar/route.ts`
- Modify: `app/api/editais/proposta/rascunho/route.ts`
- Modify: `app/api/editais/proposta/documento/[id]/route.ts`

**Interfaces:**
- Consumes: `REQUIRED_DOCUMENT_CODES`, `PHOTO_REQUIREMENT_CODE`, `generateParticipationTermPdf`, `appendEditalSubmissionToSheet`, `uploadFile`, `query`, `queryOne`
- Produces: `POST /api/editais/proposta/enviar`

- [ ] **Step 1: Add a dedicated Google Sheets export**

```ts
export async function appendEditalSubmissionToSheet(submission: {
  id: number;
  registrationId: number;
  status: 'DRAFT' | 'SUBMITTED';
  fullName: string;
  cpf: string;
  institutionName: string | null;
  institutionCnpj: string | null;
  labName: string | null;
  labArea: string | null;
  teamDescription: string | null;
  technicalJustification: string | null;
  expectedResults: string | null;
  submittedAt: string;
}) {
  ...
}
```

- [ ] **Step 2: Centralize completeness checks for submission**

```ts
type MissingItem =
  | { type: 'document'; requirementCode: string }
  | { type: 'photo'; required: number; found: number }
  | { type: 'field'; field: string };
```

- [ ] **Step 3: Validate every required document, text field, and photo count**

```ts
const requiredFields = ['institution_name', 'institution_cnpj', 'lab_name', 'lab_area', 'technical_justification', 'expected_results'] as const;
```

- [ ] **Step 4: Insert the generated 8.1.10 PDF before marking submitted**

```ts
const pdfBuffer = await generateParticipationTermPdf({
  fullName,
  cpf,
  registrationDate: registrationCreatedAt,
  submissionId: submission.id,
});

const { filePath } = await uploadFile(
  pdfBuffer,
  `termo-participacao-${submission.id}.pdf`,
  'application/pdf',
  `edital-submissions/${submission.id}`
);
```

- [ ] **Step 5: Mark the submission as SUBMITTED in one transaction**

```sql
UPDATE edital_submissions
SET status = 'SUBMITTED',
    submitted_at = NOW(),
    updated_at = NOW()
WHERE id = $1
RETURNING submitted_at;
```

- [ ] **Step 6: Fire Sheets and n8n best-effort after commit**

```ts
appendEditalSubmissionToSheet(sheetPayload).catch((error) => {
  console.error('Erro na exportação assíncrona para Sheets:', error);
});

fetch(process.env.WEBHOOK_N8N_URL!, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(webhookPayload),
}).catch((error) => {
  console.error('Erro no webhook N8N (não afeta a submissão):', error);
});
```

- [ ] **Step 7: Protect the draft route after submission**

```ts
if (submission.status === 'SUBMITTED') {
  return NextResponse.json({ error: 'already_submitted' }, { status: 409 });
}
```

- [ ] **Step 8: Verify the submission endpoint end to end**

Run:
```powershell
npm run lint
npx tsc --noEmit
curl -X POST http://localhost:3000/api/editais/proposta/enviar -H "X-Edital-Token: ..." 
```

Expected:
```text
200 { ok: true, submittedAt: ... }
400 { error: 'incomplete', missing: [...] } when validation fails
```

- [ ] **Step 9: Commit**

```powershell
git add lib/google-sheets.ts app/api/editais/proposta/enviar/route.ts app/api/editais/proposta/rascunho/route.ts app/api/editais/proposta/documento/[id]/route.ts
git commit -m "feat: finalize edital proposal submission flow"
```

## Self-Review

**1. Spec coverage**
- Migration + rascunho: Task 1.
- Upload, download, and delete de documentos: Task 2.
- PDF do Termo de Participação: Task 3.
- Envio final + Sheets + n8n: Task 4.
- Reautenticação via token novo sem perder rascunho: Task 1 GET/POST e Task 4 guardas de `SUBMITTED`.
- Segurança, rate limit, trusted origin, token obrigatório: Global Constraints em todas as tasks.

**2. Placeholder scan**
- Não há `TBD`, `TODO`, `implement later` ou referência a tipos/funções não definidos no próprio plano.

**3. Type consistency**
- `DraftStep`, `RequirementCode`, `ParticipationTermInput`, `MissingItem` e os payloads de route usam nomes consistentes entre tasks.
- O módulo compartilhado de requisitos é definido antes do uso no envio final.

