# Edital PPI — Ajustes solicitados Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Atualizar título do Edital, três campos obrigatórios no wizard, remover documento `8.1.9`, e webhook N8N dedicado com e-mail no payload.

**Architecture:** Campos novos em colunas `TEXT` de `edital_submissions`; draft ganha step `fotos` para o texto da estrutura; `8.1.9` sai da lista de documentos obrigatórios; `enviar` usa `WEBHOOK_N8N_EDITAL_URL` e inclui `email` de `registrations`. Sem suite de testes automatizados — verificação manual por task.

**Tech Stack:** Next.js 15 App Router, PostgreSQL, `lib/edital-*`, Google Sheets, N8N webhook.

**Spec:** `docs/superpowers/specs/2026-08-03-edital-ajustes-solicitados-design.md`

---

## File map

| Arquivo | Responsabilidade |
|---------|------------------|
| `database/migrations/013_edital_proposal_field_updates.sql` | Novas colunas |
| `app/components/EditalCpfGate.tsx` | Título visível |
| `app/edital/page.tsx` | Metadata |
| `lib/edital-requirements.ts` | Remover `8.1.9` |
| `lib/edital-completeness.ts` | Campos obrigatórios + labels + steps |
| `lib/edital-proposta-api.ts` | Tipos, EMPTY, mappers, `EditalDraftStep` |
| `app/components/edital/TelaInstituicao.tsx` | Campo unidade acadêmica |
| `app/components/edital/TelaFotos.tsx` | Textarea + remover planta |
| `app/components/edital/TelaProposta.tsx` | Objetivo principal |
| `app/components/edital/EditalPropostaWizard.tsx` | State, draft payload, props |
| `app/api/editais/proposta/rascunho/route.ts` | Persistir campos + step `fotos` |
| `app/api/editais/proposta/enviar/route.ts` | REQUIRED_FIELDS + webhook + email |
| `lib/google-sheets.ts` | Colunas / headers / remover 8.1.9 |
| `app/admin/editais/[id]/page.tsx` | Exibir campos |
| `env.example`, `.env.example` | `WEBHOOK_N8N_EDITAL_URL` |

---

### Task 1: Título da página `/edital`

**Files:**
- Modify: `app/components/EditalCpfGate.tsx`
- Modify: `app/edital/page.tsx`

- [ ] **Step 1: Atualizar heading em `EditalCpfGate.tsx`**

Localizar o `h2` com texto `Edital PPI 2026` (~L193) e substituir por:

```tsx
<h2 className="text-xl font-bold text-white mb-2 leading-snug">
  EDITAL N.º 01/2026 – APOIO AO FORTALECIMENTO DE AMBIENTES DE INOVAÇÃO PARA MODERNIZAÇÃO DE LABORATÓRIOS DE ENSINO, PESQUISA E INOVAÇÃO DO PLANO DE PATROCÍNIO INNOVATIS – PPI 2026
</h2>
```

Manter o subtítulo do CPF. Se o card ficar apertado, aumentar `max-w` do container em `app/edital/page.tsx` de `max-w-xl` para `max-w-2xl` ou `max-w-3xl`.

- [ ] **Step 2: Atualizar metadata**

Em `app/edital/page.tsx`:

```ts
export const metadata: Metadata = {
  title: 'Edital N.º 01/2026 – PPI | InnovaNation',
  description: 'Gate de acesso ao Edital PPI 2026 da comunidade InnovaNation',
}
```

- [ ] **Step 3: Verificar manualmente**

Abrir `/edital` e confirmar título completo legível (desktop e mobile).

- [ ] **Step 4: Commit**

```bash
git add app/components/EditalCpfGate.tsx app/edital/page.tsx
git commit -m "feat(edital): atualiza título oficial do Edital N.º 01/2026"
```

---

### Task 2: Migration das três colunas

**Files:**
- Create: `database/migrations/013_edital_proposal_field_updates.sql`

- [ ] **Step 1: Criar migration**

```sql
-- 013_edital_proposal_field_updates.sql
-- Novos campos obrigatórios do wizard (unidade acadêmica, estrutura do lab, objetivo).

ALTER TABLE edital_submissions
  ADD COLUMN IF NOT EXISTS lab_academic_unit TEXT,
  ADD COLUMN IF NOT EXISTS lab_structure_description TEXT,
  ADD COLUMN IF NOT EXISTS main_improvement_objective TEXT;
```

- [ ] **Step 2: Aplicar no ambiente de desenvolvimento**

Usar o fluxo usual do projeto (`npm run migrate` ou SQL manual no RDS de dev). Confirmar com `\d edital_submissions` ou query equivalente.

- [ ] **Step 3: Commit**

```bash
git add database/migrations/013_edital_proposal_field_updates.sql
git commit -m "feat(db): adiciona colunas de campos do wizard do Edital"
```

---

### Task 3: Remover `8.1.9` e tipagem/completude dos novos campos

**Files:**
- Modify: `lib/edital-requirements.ts`
- Modify: `lib/edital-completeness.ts`
- Modify: `lib/edital-proposta-api.ts`

- [ ] **Step 1: Remover `8.1.9` de `EDITAL_REQUIRED_DOCUMENT_CODES`**

Em `lib/edital-requirements.ts`, a lista deve ficar:

```ts
export const EDITAL_REQUIRED_DOCUMENT_CODES = [
  '8.1.1',
  '8.1.2',
  '8.1.3',
  '8.1.4',
  '8.1.5',
  '8.1.6',
  '8.1.7',
  '8.1.15',
  '8.1.16',
] as const;
```

- [ ] **Step 2: Atualizar `lib/edital-completeness.ts`**

Adicionar aos `REQUIRED_FIELDS`:

```ts
{ field: 'lab_academic_unit', getValue: (data) => data.labAcademicUnit },
{ field: 'lab_structure_description', getValue: (data) => data.labStructureDescription },
{ field: 'main_improvement_objective', getValue: (data) => data.mainImprovementObjective },
```

Labels:

```ts
lab_academic_unit: 'Unidade acadêmica, centro, núcleo ou setor',
lab_structure_description: 'Descrição da estrutura do laboratório',
main_improvement_objective: 'Objetivo principal da melhoria pretendida',
```

Steps:

```ts
lab_academic_unit: 'instituicao',
lab_structure_description: 'fotos',
main_improvement_objective: 'proposta',
```

Remover entradas `8.1.9` de `EDITAL_DOCUMENT_LABELS` e `EDITAL_STEP_BY_DOCUMENT_CODE`.

- [ ] **Step 3: Atualizar `lib/edital-proposta-api.ts`**

Estender interfaces / `EMPTY_WIZARD_DATA` / `submissionToWizardData`:

```ts
labAcademicUnit: string  // '' no empty
labStructureDescription: string
mainImprovementObjective: string
```

No tipo de submission (GET draft), mapear:

```ts
labAcademicUnit: submission.labAcademicUnit ?? ''
// snake no JSON da API: lab_academic_unit → labAcademicUnit no mapper
```

Estender `EditalDraftStep`:

```ts
export type EditalDraftStep = 'equipe' | 'instituicao' | 'fotos' | 'proposta'
```

Garantir que o tipo da submission retornada pelo GET inclua os três campos snake→camel conforme o padrão atual do arquivo.

- [ ] **Step 4: Commit**

```bash
git add lib/edital-requirements.ts lib/edital-completeness.ts lib/edital-proposta-api.ts
git commit -m "feat(edital): tipagem e completude dos novos campos; remove 8.1.9"
```

---

### Task 4: UI — Instituição, Fotos, Proposta + Wizard

**Files:**
- Modify: `app/components/edital/TelaInstituicao.tsx`
- Modify: `app/components/edital/TelaFotos.tsx`
- Modify: `app/components/edital/TelaProposta.tsx`
- Modify: `app/components/edital/EditalPropostaWizard.tsx`

- [ ] **Step 1: `TelaInstituicao`**

Incluir `'labAcademicUnit'` em `TelaInstituicaoField`. Adicionar prop `labAcademicUnit` e input após `labName` / junto aos dados do lab:

```tsx
<label htmlFor="lab_academic_unit" className="block text-sm font-bold text-slate-100 mb-3 ml-1">
  Unidade acadêmica, centro, núcleo ou setor ao qual o laboratório está vinculado
</label>
<input
  id="lab_academic_unit"
  type="text"
  value={labAcademicUnit}
  onChange={(e) => onFieldChange('labAcademicUnit', e.target.value.slice(0, EDITAL_MAX_TEXT_LENGTH))}
  className={inputClass}
/>
```

- [ ] **Step 2: `TelaFotos`**

Remover import/uso de `DocumentUploadSlot` e o bloco `8.1.9`.

Atualizar título/subtítulo da seção (sem menção a planta).

Adicionar props `labStructureDescription` + `onLabStructureDescriptionChange`. Textarea:

```tsx
<label htmlFor="lab_structure_description" className="block text-sm font-bold text-slate-100 mb-3 ml-1">
  Descrição da estrutura do laboratório
</label>
<p className="text-sm text-slate-400 mb-3 ml-1">
  Descreva a estrutura física, tecnológica e operacional existente, identificando as principais limitações, necessidades ou oportunidades de melhoria.
</p>
<textarea
  id="lab_structure_description"
  rows={6}
  value={labStructureDescription}
  onChange={(e) => onLabStructureDescriptionChange(e.target.value.slice(0, EDITAL_MAX_TEXT_LENGTH))}
  className={/* mesmo padrão de textarea das outras telas */}
/>
<span className="text-xs text-slate-500">
  {labStructureDescription.length}/{EDITAL_MAX_TEXT_LENGTH}
</span>
```

Manter `PhotoGallerySlot` intacto.

- [ ] **Step 3: `TelaProposta`**

Adicionar props `mainImprovementObjective` + `onMainImprovementObjectiveChange`. Inserir o bloco **antes** de “Itens de orçamento”:

```tsx
<label htmlFor="main_improvement_objective" className="block text-sm font-bold text-slate-100 mb-3 ml-1">
  Objetivo principal da melhoria pretendida
</label>
<p className="text-sm text-slate-400 mb-3 ml-1">
  Informe, de forma clara e objetiva, qual é a principal melhoria que se pretende alcançar no laboratório por meio do patrocínio.
</p>
<textarea
  id="main_improvement_objective"
  rows={4}
  value={mainImprovementObjective}
  onChange={(e) => onMainImprovementObjectiveChange(e.target.value.slice(0, EDITAL_MAX_TEXT_LENGTH))}
  className={textareaClass}
/>
```

- [ ] **Step 4: `EditalPropostaWizard`**

1. Incluir `fotos: 'fotos'` em `DRAFT_STEP_BY_WIZARD_STEP`.
2. Estender `buildStepPayload`:

```ts
if (step === 'instituicao') {
  return {
    institution_name: data.institutionName,
    institution_cnpj: data.institutionCnpj,
    lab_name: data.labName,
    lab_area: data.labArea,
    lab_served_public: data.labServedPublic,
    lab_academic_unit: data.labAcademicUnit,
  }
}
if (step === 'fotos') {
  return { lab_structure_description: data.labStructureDescription }
}
// proposta:
return {
  budget_items: data.budgetItems,
  technical_justification: data.technicalJustification,
  expected_results: data.expectedResults,
  main_improvement_objective: data.mainImprovementObjective,
}
```

3. Passar novas props para as três telas; handlers que atualizam `setData`.

4. Garantir que ao sair do step `fotos` (Próximo / Salvar) o draft `fotos` seja persistido — o mesmo fluxo que já chama `saveEditalDraftStep` para steps mapeados.

- [ ] **Step 5: Verificar UI manualmente**

Navegar o wizard: campos visíveis, planta ausente, contadores de caracteres, salvar rascunho sem erro de API (pode falhar até Task 5 — ok).

- [ ] **Step 6: Commit**

```bash
git add app/components/edital/TelaInstituicao.tsx app/components/edital/TelaFotos.tsx app/components/edital/TelaProposta.tsx app/components/edital/EditalPropostaWizard.tsx
git commit -m "feat(edital): UI dos novos campos e remoção da planta"
```

---

### Task 5: API rascunho

**Files:**
- Modify: `app/api/editais/proposta/rascunho/route.ts`

- [ ] **Step 1: Aceitar step `fotos` e novos campos**

No GET SELECT, incluir `lab_academic_unit`, `lab_structure_description`, `main_improvement_objective` e devolvê-los no JSON no mesmo estilo snake_case→camelCase já usado.

No POST:

- Step `instituicao`: normalizar e persistir `lab_academic_unit` junto aos campos existentes (INSERT/UPDATE).
- Step `fotos`: normalizar `lab_structure_description` e UPSERT só essa coluna (padrão do step `equipe` com `team_description`).
- Step `proposta`: normalizar e persistir `main_improvement_objective` junto a budget/justificativa/resultados.

Usar `normalizeTextInput` + limite `EDITAL_MAX_TEXT_LENGTH` como nos outros textos.

- [ ] **Step 2: Verificar manualmente**

```powershell
# Com token válido de edital (após gate CPF), POST rascunho por step e GET para confirmar persistência
```

Confirmar que os três textos sobrevivem a reload da página do wizard.

- [ ] **Step 3: Commit**

```bash
git add app/api/editais/proposta/rascunho/route.ts
git commit -m "feat(edital): persiste novos campos no rascunho incluindo step fotos"
```

---

### Task 6: API enviar + webhook N8N dedicado

**Files:**
- Modify: `app/api/editais/proposta/enviar/route.ts`
- Modify: `env.example`
- Modify: `.env.example`

- [ ] **Step 1: REQUIRED_FIELDS e SELECT**

Incluir `lab_academic_unit`, `lab_structure_description`, `main_improvement_objective` na lista de campos obrigatórios e no SELECT da submission. Incluir no `sheetPayload`.

No JOIN/SELECT que já busca dados do registration, garantir `email` (ou query adicional em `registrations`) e colocar `email` no payload.

- [ ] **Step 2: Trocar webhook**

Substituir o bloco que usa `WEBHOOK_N8N_URL` por:

```ts
const webhookUrl = process.env.WEBHOOK_N8N_EDITAL_URL;
if (webhookUrl) {
  (async () => {
    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...sheetPayload,
        email: registrationEmail, // string do SELECT
        source: 'edital-proposta',
      }),
    });
  })().catch((error) => {
    console.error('Erro no webhook N8N Edital (não afeta a submissão):', error);
  });
} else {
  console.warn('WEBHOOK_N8N_EDITAL_URL não configurada. Ignorando envio ao N8N.');
}
```

**Não** alterar `app/api/inscricoes/route.ts`.

- [ ] **Step 3: Documentar env**

Em `env.example` e `.env.example`:

```env
# Webhook N8N exclusivo da confirmação de proposta do Edital (não usar o de inscrição)
WEBHOOK_N8N_EDITAL_URL=
```

Manter `WEBHOOK_N8N_URL` documentado como inscrição da comunidade.

- [ ] **Step 4: Verificar manualmente**

1. Tentar enviar sem os novos campos → 400 / missing items.
2. Enviar completo → 200; log não deve chamar o webhook antigo.
3. Com URL de teste no N8N, confirmar body com `email` e `source: 'edital-proposta'`.

- [ ] **Step 5: Commit**

```bash
git add app/api/editais/proposta/enviar/route.ts env.example .env.example
git commit -m "feat(edital): webhook N8N dedicado e campos obrigatórios no envio"
```

---

### Task 7: Sheets + Admin

**Files:**
- Modify: `lib/google-sheets.ts`
- Modify: `app/admin/editais/[id]/page.tsx`

- [ ] **Step 1: `lib/google-sheets.ts`**

Estender `EditalSubmissionData` com os três campos + `email` opcional se útil.

Remover `'8.1.9'` de `EDITAL_DOCUMENT_COLUMN_LABELS` (a lista de códigos já vem de `EDITAL_REQUIRED_DOCUMENT_CODES`).

Inserir colunas na row de values e em `getEditalSheetHeaderRow()` — sugestão de ordem após Área do Laboratório:

- Unidade acadêmica
- Descrição da estrutura do laboratório  

e antes de Justificativa Técnica (ou após Resultados, desde que header e values batam):

- Objetivo principal da melhoria

Atualizar comentário da ordem das colunas e o range se necessário (`PROPOSTAS!A:AD` etc.).

**Nota:** planilha existente pode ter headers antigos; alinhar headers manualmente na aba PROPOSTAS após o deploy ou documentar no PR.

- [ ] **Step 2: Admin detail**

Em `app/admin/editais/[id]/page.tsx`, incluir as três colunas no SELECT e exibir com `<Field … />` junto aos dados do laboratório / proposta.

- [ ] **Step 3: Verificar**

Abrir `/admin/editais/[id]` de uma proposta de teste e conferir os campos. Opcional: checar append na aba PROPOSTAS.

- [ ] **Step 4: Commit**

```bash
git add lib/google-sheets.ts app/admin/editais/[id]/page.tsx
git commit -m "feat(edital): exibe novos campos no admin e na planilha PROPOSTAS"
```

---

### Task 8: Verificação final / smoke

- [ ] **Step 1: Checklist do spec**

- [ ] `/edital` título completo  
- [ ] Três campos obrigatórios bloqueiam envio se vazios  
- [ ] Sem UI/validação de `8.1.9`  
- [ ] Galeria 3–8 intacta  
- [ ] Rascunho persiste os três textos (incl. step fotos)  
- [ ] `WEBHOOK_N8N_EDITAL_URL` recebe payload com `email`  
- [ ] Inscrição comunidade ainda usa `WEBHOOK_N8N_URL`  
- [ ] Admin mostra os campos  
- [ ] Migration `013` aplicada no ambiente alvo  

- [ ] **Step 2: `npm run lint` e `npm run build`**

Corrigir erros introduzidos por esta mudança.

- [ ] **Step 3: Commit de correções se houver**

```bash
git commit -m "fix(edital): ajustes pós-smoke dos campos e webhook"
```

---

## Plan self-review

| Spec item | Task |
|-----------|------|
| Título | Task 1 |
| Migration 3 colunas | Task 2 |
| Remover 8.1.9 | Tasks 3–4, 7 |
| Campos UI + draft fotos | Tasks 3–5 |
| Enviar + webhook dedicado + email | Task 6 |
| Sheets + admin | Task 7 |
| Aceite | Task 8 |
| Fotos arquivo único | Fora de escopo (ok) |

Sem placeholders TBD. Nomes de colunas/campos consistentes: `lab_academic_unit` / `labAcademicUnit`, `lab_structure_description` / `labStructureDescription`, `main_improvement_objective` / `mainImprovementObjective`, env `WEBHOOK_N8N_EDITAL_URL`.
