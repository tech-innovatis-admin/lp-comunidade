# Edital — e-mails N8N (usuário + admin) e deep link do painel

**Data:** 2026-08-03  
**Status:** aprovado

## Objetivo

Ao enviar uma proposta (`POST /api/editais/proposta/enviar`):

1. N8N envia e-mail de confirmação ao **proponente** (`email` do payload).
2. N8N envia e-mail aos **admins** (lista fixa no workflow) com dados mínimos + botão para `/admin/editais/{id}`.
3. Se o admin não estiver logado, o painel redireciona para login com `?next=` e, após autenticar, volta à proposta.

## Decisões

- Destinatários admin: lista fixa no N8N (não no app).
- Conteúdo admin: mínimo (protocolo, nome, e-mail, lab, instituição, data + botão).
- App: adicionar `adminReviewUrl` no payload do webhook; corrigir redirect de auth nas páginas admin.

## Mudanças no código

### Payload webhook (`WEBHOOK_N8N_EDITAL_URL`)

Incluir:

```ts
adminReviewUrl: `${baseUrl}/admin/editais/${submissionId}`
```

`baseUrl` via `getPublicBaseUrl(request)` / `PUBLIC_BASE_URL` (em produção deve ser a URL pública).

### Auth redirect

Em `app/admin/editais/[id]/page.tsx` (e idealmente `app/admin/editais/page.tsx`):

- Resolver `id` / path atual **antes** do redirect.
- Sem sessão: `redirect('/admin/login?next=' + encodeURIComponent(path))`.

`app/admin/login/page.tsx` já lê `next` com `getSafeNextPath` — sem mudança obrigatória.

## N8N (fora do repo, mas parte do aceite)

Mesmo webhook → 2 nodes de e-mail (usuário + admins). Botão admin aponta para `adminReviewUrl`.

## Fora de escopo

- Destinatários admin vindos de env/DB.
- Anexos ou links de documentos no e-mail do usuário.

## Configuração N8N (operacional)

### Webhook

- **Method:** POST
- **URL:** `WEBHOOK_N8N_EDITAL_URL` (webhook de produção; não usar `webhook-test` quando estiver pronto)
- **Payload** (JSON): spread de `sheetPayload` + campos extras do webhook em `app/api/editais/proposta/enviar/route.ts`:

| Campo | Descrição |
|-------|-----------|
| `id` | ID da proposta (usar como protocolo nos e-mails) |
| `registrationId` | ID da inscrição |
| `status` | `"SUBMITTED"` |
| `fullName` | Nome do proponente |
| `email` | E-mail do proponente |
| `cpf` | CPF |
| `institutionName` | Instituição |
| `institutionCnpj` | CNPJ |
| `labName` | Laboratório |
| `labArea` | Área do lab |
| `labAcademicUnit` | Unidade acadêmica |
| `labStructureDescription` | Descrição da estrutura |
| `mainImprovementObjective` | Objetivo principal |
| `teamDescription` | Equipe |
| `technicalJustification` | Justificativa técnica |
| `expectedResults` | Resultados esperados |
| `submittedAt` | ISO 8601 da submissão |
| `documentLinks` | Mapa `requirement_code → URL` |
| `photoLinks` | URLs das fotos (PDF 8.1.8) |
| `communityCertificateUrl` | Link do certificado da comunidade |
| `adminReviewUrl` | `${PUBLIC_BASE_URL}/admin/editais/{id}` |
| `source` | `"edital-proposta"` |

Não existe campo `protocolNumber`; o protocolo exibido nos e-mails é `id`.

**Pré-requisito:** `PUBLIC_BASE_URL` deve ser a URL pública de produção para que `adminReviewUrl` não aponte para `localhost`.

Script de reenvio manual: `scripts/resend-edital-webhook.js` (mesmo payload).

### Email 1 — proponente

- **To:** `{{ $json.email }}`
- **Assunto (sugestão):** `Proposta recebida — Edital PPI (protocolo #{{ $json.id }})`
- **Corpo:** confirmação curta de que a proposta foi recebida; incluir protocolo `#{{ $json.id }}` e data `{{ $json.submittedAt }}` se disponível.

### Email 2 — admins

- **To:** lista fixa de e-mails admin (configurar no N8N; não vem do app)
- **Assunto (sugestão):** `Nova proposta Edital PPI — #{{ $json.id }} — {{ $json.fullName }}`
- **Corpo (mínimo):**
  - Protocolo: `#{{ $json.id }}`
  - Nome: `{{ $json.fullName }}`
  - E-mail: `{{ $json.email }}`
  - Laboratório: `{{ $json.labName }}`
  - Instituição: `{{ $json.institutionName }}`
  - Data: `{{ $json.submittedAt }}`
- **CTA:** link `{{ $json.adminReviewUrl }}` com rótulo **Abrir proposta no painel**
