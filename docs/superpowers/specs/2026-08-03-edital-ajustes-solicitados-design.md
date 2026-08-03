# Edital PPI — Ajustes solicitados (design)

**Data:** 2026-08-03  
**Status:** aprovado  
**Contexto:** alterações pedidas na página inicial do Edital, wizard de proposta e confirmação por e-mail via N8N.

## Objetivo

Atualizar o fluxo do Edital PPI 2026 para refletir o texto oficial do edital, coletar três novos campos obrigatórios, remover o upload de planta/layout e disparar confirmação por e-mail ao responsável via webhook N8N dedicado (separado do webhook de inscrição da comunidade).

## Fora de escopo

- Fotos em “arquivo único” (galeria 3–8 fotos permanece como está; decisão adiada).
- Alterar o webhook `WEBHOOK_N8N_URL` usado em `POST /api/inscricoes`.
- Envio de e-mail nativo no app (SES/nodemailer/etc.): o app só dispara o webhook; o template fica no N8N.

## Requisitos

### 1. Título da página inicial (`/edital`)

Substituir o heading visível `"Edital PPI 2026"` pelo texto:

> EDITAL N.º 01/2026 – APOIO AO FORTALECIMENTO DE AMBIENTES DE INOVAÇÃO PARA MODERNIZAÇÃO DE LABORATÓRIOS DE ENSINO, PESQUISA E INOVAÇÃO DO PLANO DE PATROCÍNIO INNOVATIS – PPI 2026

Atualizar também o `metadata.title` de `app/edital/page.tsx` para refletir o mesmo edital (pode ser uma versão abreviada na aba do browser se o título completo for longo demais; o heading visível deve ser o texto completo).

**Arquivos:** `app/components/EditalCpfGate.tsx`, `app/edital/page.tsx`.

### 2. Confirmação por e-mail após envio da proposta

Hoje `POST /api/editais/proposta/enviar` dispara `WEBHOOK_N8N_URL` com `source: 'edital-proposta'`, reutilizando o mesmo endpoint da inscrição da comunidade. Isso muda.

- Nova variável: `WEBHOOK_N8N_EDITAL_URL`
- `enviar` passa a chamar **somente** `WEBHOOK_N8N_EDITAL_URL`
- `WEBHOOK_N8N_URL` permanece exclusivo de `POST /api/inscricoes`
- Disparo continua best-effort (erro no N8N não falha a submissão)
- Payload deve incluir pelo menos:
  - `email` (de `registrations.email` via `registration_id`)
  - `fullName`, `labName`, `institutionName`, `submittedAt`
  - `source: 'edital-proposta'`
  - demais campos já enviados ao Sheets/N8N que forem úteis ao template (podem permanecer)

Documentar a env em `env.example` / `.env.example`.

### 3. Aba Instituição — unidade acadêmica

Novo campo de texto obrigatório:

- **Label:** Unidade acadêmica, centro, núcleo ou setor ao qual o laboratório está vinculado
- **Coluna DB:** `lab_academic_unit TEXT`
- **Wizard:** `labAcademicUnit` (camelCase)
- **API draft/submit:** `lab_academic_unit`
- Persistido no step de rascunho `instituicao`
- Obrigatório em `edital-completeness` e em `REQUIRED_FIELDS` do `enviar`

### 4. Aba Fotos — descrição da estrutura; remover planta

#### 4.1 Campo novo (obrigatório)

- **Label:** Descrição da estrutura do laboratório
- **Helper:** Descreva a estrutura física, tecnológica e operacional existente, identificando as principais limitações, necessidades ou oportunidades de melhoria.
- **Coluna DB:** `lab_structure_description TEXT`
- **Wizard:** `labStructureDescription`
- **API:** `lab_structure_description`

A aba Fotos hoje não persiste texto via rascunho. Introduzir step de draft `fotos` que salva apenas `{ lab_structure_description }`, espelhando o padrão de `equipe` / `instituicao` / `proposta`.

#### 4.2 Remover planta / layout / memorial (`8.1.9`)

- Remover o `DocumentUploadSlot` de `TelaFotos`
- Remover `'8.1.9'` de `EDITAL_REQUIRED_DOCUMENT_CODES`
- Remover labels / `EDITAL_STEP_BY_DOCUMENT_CODE` / coluna de Sheets associada a `8.1.9`
- Documentos já enviados com code `8.1.9` em rascunhos antigos podem permanecer no S3/DB; não são mais exigidos nem exibidos na UI do wizard

#### 4.3 Galeria de fotos

Sem mudança de regras (`EDITAL_MIN_PHOTO_COUNT` / `EDITAL_MAX_PHOTO_COUNT`).

### 5. Aba Proposta — objetivo principal

Novo campo de texto obrigatório **antes** dos itens de orçamento:

- **Label:** Objetivo principal da melhoria pretendida
- **Helper:** Informe, de forma clara e objetiva, qual é a principal melhoria que se pretende alcançar no laboratório por meio do patrocínio.
- **Coluna DB:** `main_improvement_objective TEXT`
- **Wizard:** `mainImprovementObjective`
- **API:** `main_improvement_objective`
- Persistido no step de rascunho `proposta`
- Obrigatório no completeness e no `enviar`

## Modelo de dados

Migration `013_edital_proposal_field_updates.sql`:

```sql
ALTER TABLE edital_submissions
  ADD COLUMN IF NOT EXISTS lab_academic_unit TEXT,
  ADD COLUMN IF NOT EXISTS lab_structure_description TEXT,
  ADD COLUMN IF NOT EXISTS main_improvement_objective TEXT;
```

Sem backfill: propostas já `SUBMITTED` ficam com `NULL` nessas colunas (aceitáveis no admin como “—”). Novas submissões devem preencher os três.

## Validação

Campos obrigatórios no submit (além dos já existentes):

| field | step UI |
|-------|---------|
| `lab_academic_unit` | instituição |
| `lab_structure_description` | fotos |
| `main_improvement_objective` | proposta |

Limite de texto: reutilizar `EDITAL_MAX_TEXT_LENGTH` (5000), mesmo padrão de `lab_served_public` / justificativa.

Documentos: lista obrigatória sem `8.1.9`. Fotos: mínimo 3.

## Superfícies a atualizar

| Camada | Arquivos principais |
|--------|---------------------|
| UI gate | `EditalCpfGate.tsx`, `app/edital/page.tsx` |
| UI wizard | `TelaInstituicao`, `TelaFotos`, `TelaProposta`, `EditalPropostaWizard` |
| Tipos cliente | `lib/edital-proposta-api.ts` |
| Completude / labels | `lib/edital-completeness.ts` |
| Requirements | `lib/edital-requirements.ts` |
| Draft API | `app/api/editais/proposta/rascunho/route.ts` |
| Enviar API | `app/api/editais/proposta/enviar/route.ts` |
| Sheets | `lib/google-sheets.ts` |
| Admin | `app/admin/editais/[id]/page.tsx` |
| Env docs | `env.example`, `.env.example` |
| Migration | `database/migrations/013_edital_proposal_field_updates.sql` |

## Ordem de implementação

1. Título
2. Remover `8.1.9` + campo descrição da estrutura (UI + requirements + draft `fotos`)
3. Migration + campos instituição e proposta (UI + APIs + completeness)
4. Webhook edital + `email` no payload
5. Sheets + admin + env examples

## Critérios de aceite

- [ ] `/edital` exibe o título completo do edital
- [ ] Wizard exige unidade acadêmica, descrição da estrutura e objetivo principal
- [ ] Não há upload de planta/`8.1.9`; submit não exige esse documento
- [ ] Galeria de fotos continua 3–8
- [ ] Enviar proposta dispara `WEBHOOK_N8N_EDITAL_URL` com `email`; inscrição da comunidade continua em `WEBHOOK_N8N_URL`
- [ ] Admin e Sheets mostram os novos campos (ou colunas equivalentes)
- [ ] Rascunho persiste os três textos ao navegar entre steps
