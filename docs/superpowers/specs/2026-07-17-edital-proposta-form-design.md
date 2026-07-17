# Formulário de submissão da proposta — Edital PPI

**Data:** 2026-07-17
**Status:** Aprovado para plano de implementação

## Contexto

O gate de CPF (`/edital`, já implementado — ver
`docs/superpowers/specs/2026-07-15-edital-cpf-gate-design.md`) confirma que a pessoa é
membro ativo da comunidade InnovaNation e emite um token de sessão + dados de prefill.
Este spec cobre o que vem depois do gate: o formulário completo de submissão da proposta
ao Edital PPI, estilo Typeform (várias telas), incluindo os ~16 itens de documentação
obrigatória e os campos de texto da proposta descritos no item 8 do edital
(`formulario.md`), até o envio final.

Diferente do gate (spec anterior), este é um fluxo grande — múltiplos uploads de
documento, campos de texto longos, uma lista dinâmica de itens de orçamento — então
cobre a jornada inteira num único spec, mas a implementação será quebrada em várias
tarefas/planos menores.

## Objetivo

Depois que o gate libera o avanço, o sistema deve permitir que a pessoa:

1. Preencha, em telas agrupadas por categoria (não uma pergunta por vez), todos os dados
   e documentos exigidos pelo item 8 do edital.
2. Salve progresso automaticamente a cada etapa concluída, podendo fechar a aba e
   retomar depois (inclusive dias depois, revalidando o CPF no gate).
3. Envie a proposta apenas quando tudo estiver completo, recebendo uma lista clara do
   que falta caso tente enviar incompleto.
4. Tenha, automaticamente, o "Termo de Comprovação de Participação" (item 8.1.10)
   gerado pelo sistema — sem precisar anexar nada para esse item, já que o próprio gate
   comprova a participação.
5. Após o envio, tenha os dados sincronizados para Google Sheets + webhook n8n, para a
   equipe da Innovatis tomar conhecimento (sem construir telas de administração).

## Arquitetura

```
/edital (já existe)              → gate de CPF, emite token de sessão
       ↓
/edital/proposta (novo)          → wizard de 6 telas, componente único client-side
       ↓ (a cada "avançar" ou "salvar e continuar depois")
POST /api/editais/proposta/rascunho    → salva/atualiza o rascunho (por etapa)
GET  /api/editais/proposta/rascunho    → retoma o rascunho existente (ou submissão já enviada)
       ↓ (upload de arquivo em qualquer tela com documento)
POST   /api/editais/proposta/documento        → sobe pro S3, grava hash+metadados
GET    /api/editais/proposta/documento/:id    → baixa/pré-visualiza um documento já enviado
DELETE /api/editais/proposta/documento/:id    → remove um documento antes do envio final
       ↓ (última tela: revisão)
POST /api/editais/proposta/enviar      → valida completude, gera o Termo de Participação em
                                          PDF, trava como SUBMITTED, dispara Sheets+n8n
```

Toda rota de `/api/editais/proposta/*` exige o header `X-Edital-Token` (o mesmo token
emitido pelo gate). O servidor sempre decodifica o token via `verifyEditalToken`
(`lib/edital-auth.ts`, já existe) e confia apenas no `registrationId` que ele carrega —
nunca em dados que o cliente reenvie.

**Reautenticação natural resolve o problema do TTL de 1h do token.** O rascunho fica
salvo no banco indefinidamente, indexado por `registration_id` (não pelo token). Se a
pessoa fechar a aba e voltar depois do token expirar, ela passa pelo `/edital` de novo
(informa o CPF, ganha um token novo com o mesmo `registrationId`) e
`GET /api/editais/proposta/rascunho` com o token novo recupera o mesmo rascunho
normalmente. Não é necessário mudar o TTL nem implementar um mecanismo de refresh.

## Modelo de dados

Duas tabelas novas (nenhuma mudança nas tabelas existentes):

```sql
CREATE TABLE edital_submissions (
  id                      BIGSERIAL PRIMARY KEY,
  registration_id         BIGINT NOT NULL UNIQUE REFERENCES registrations(id),
  status                  VARCHAR(20) NOT NULL DEFAULT 'DRAFT', -- DRAFT | SUBMITTED

  -- Etapa "responsável e equipe"
  team_description        TEXT,

  -- Etapa "instituição e laboratório"
  institution_name         VARCHAR(255),
  institution_cnpj         VARCHAR(20),
  lab_name                 VARCHAR(255),
  lab_area                 VARCHAR(255),
  lab_served_public        TEXT,

  -- Etapa "proposta"
  budget_items             JSONB,  -- [{descricao, valor_estimado, justificativa}, ...]
  technical_justification  TEXT,
  expected_results         TEXT,

  -- Controle
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  submitted_at             TIMESTAMPTZ
);

CREATE INDEX idx_edital_submissions_registration_id ON edital_submissions(registration_id);
CREATE INDEX idx_edital_submissions_status ON edital_submissions(status);

CREATE TABLE edital_submission_documents (
  id                    BIGSERIAL PRIMARY KEY,
  submission_id         BIGINT NOT NULL REFERENCES edital_submissions(id) ON DELETE CASCADE,
  requirement_code      VARCHAR(20) NOT NULL, -- '8.1.1'..'8.1.16' ou 'foto' (repetível)
  s3_key                TEXT NOT NULL,
  file_hash             CHAR(64) NOT NULL,
  mime_type             VARCHAR(100) NOT NULL,
  size_bytes            INTEGER NOT NULL,
  original_filename     VARCHAR(255),
  uploaded_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_edital_submission_documents_submission_id ON edital_submission_documents(submission_id);
```

`registration_id UNIQUE` em `edital_submissions` garante "uma proposta por pessoa" no
nível do banco, não só na aplicação. Documentos ficam no S3 (`lib/s3.ts`, já existe no
projeto), não como BYTEA — diferente de `registrations.id_document_data`, porque aqui
uma submissão tem ~10+ arquivos (fácil ultrapassar a razão que levou o fluxo de
inscrição a usar BYTEA para um único documento pequeno).

## API

### `POST /api/editais/proposta/rascunho`
- Header `X-Edital-Token` obrigatório → token inválido/expirado → `401 { error: 'token_expired' }`.
- Body: `{ step: 'equipe' | 'instituicao' | 'proposta', data: {...campos daquela etapa...} }`.
- `INSERT ... ON CONFLICT (registration_id) DO UPDATE` — cria o rascunho na primeira
  chamada, atualiza nas seguintes.
- Se já existe uma submissão `SUBMITTED` para esse `registrationId` → `409 { error: 'already_submitted' }`.
- Resposta: `200 { ok: true, submissionId, updatedAt }`.

### `GET /api/editais/proposta/rascunho`
- Mesmo header. Retorna o rascunho/submissão existente (campos + lista de documentos já
  enviados) para o wizard restaurar o estado ao carregar.
- Sem rascunho ainda → `200 { ok: true, submission: null }`.

### `POST /api/editais/proposta/documento`
- `multipart/form-data`: `requirementCode`, `file`.
- Valida assinatura de arquivo (`hasValidFileSignature`, já existe) e tamanho: PDFs até
  10MB, fotos (`requirementCode === 'foto'`) até 5MB cada, formato `image/jpeg`,
  `image/png` ou `image/webp`; os demais `requirementCode` esperam `application/pdf`.
- Sobe pro S3 em `edital-submissions/<submissionId>/<uuid>-<requirementCode>`, calcula
  hash SHA-256, insere/substitui a linha em `edital_submission_documents` para aquele
  `requirementCode` (reenvio substitui o anterior; objeto antigo no S3 fica órfão —
  aceitável, sem limpeza automática neste spec).
- Resposta: `200 { ok: true, documentId, requirementCode, filename }`.

### `GET /api/editais/proposta/documento/:id`
- Confere que o documento pertence a uma submissão cujo `registration_id` bate com o do
  token antes de servir o arquivo (URL assinada de curta duração via `lib/s3.ts`).

### `DELETE /api/editais/proposta/documento/:id`
- Mesma checagem de posse. Remove a linha (permite trocar de ideia antes do envio final).

### `POST /api/editais/proposta/enviar`
- Valida que todos os `requirementCode` obrigatórios têm documento — exceto `8.1.10`
  (gerado automaticamente, nunca pedido ao usuário) — e que os campos de texto
  obrigatórios estão preenchidos (`technical_justification`, `expected_results`, dados de
  instituição/laboratório, mínimo 3 fotos). Falta algo → `400 { error: 'incomplete', missing: [...] }`.
- Gera o "Termo de Comprovação de Participação" em PDF (via `pdf-lib` — nome, CPF
  mascarado, data de inscrição, a partir de `registrations` + `edital_submissions`),
  sobe pro S3, insere como documento `8.1.10`.
- `UPDATE edital_submissions SET status = 'SUBMITTED', submitted_at = NOW()`.
- Dispara `appendToSheet` + webhook n8n (best-effort, não bloqueia a resposta — mesmo
  padrão de `/api/inscricoes`).
- Resposta: `200 { ok: true, submittedAt }`.

## Front-end — `/edital/proposta`

Componente único `EditalPropostaWizard.tsx` (client), mesmo padrão de estado local
(`useState`) usado em `RegistrationFormSection.tsx`. Ao montar, chama
`GET /api/editais/proposta/rascunho` para restaurar progresso (ou mostrar tela
somente-leitura se `status === 'SUBMITTED'`).

**Tela 1 — Responsável e equipe**
Dados do responsável vêm do `prefill` do gate, somente leitura. Upload: RG/CNH
(`8.1.1`), CPF digitalizado (`8.1.2`), comprovante de vínculo institucional (`8.1.3`),
currículo/Lattes (`8.1.4`). Campo texto: equipe envolvida (`team_description`).

**Tela 2 — Instituição e laboratório**
Campos: nome da instituição, CNPJ, nome do laboratório, área de atuação, público
atendido. Upload: comprovante de CNPJ (`8.1.5`), carta de anuência (`8.1.6`), documento
de identificação do laboratório (`8.1.7`).

**Tela 3 — Fotos e planta do laboratório**
Upload múltiplo de fotos (`foto`, mínimo 3, máximo técnico 8) e, opcionalmente, planta/
layout (`8.1.9` — "quando houver", conforme o edital).

**Tela 4 — Proposta**
Lista dinâmica de itens de orçamento (`budget_items`: descrição, valor estimado,
justificativa — botão "adicionar item", máximo 20). Campos texto: justificativa técnica
(`technical_justification`), resultados esperados (`expected_results`).

**Tela 5 — Declarações**
Upload da Declaração de Responsabilidade assinada (`8.1.15`, modelo ANEXO II linkado
para download) e do Termo de Compromisso de Contrapartida assinado (`8.1.16`, modelo
ANEXO III linkado para download).

**Tela 6 — Revisão e envio**
Resumo de todos os campos e lista de documentos enviados, com indicador ✓/✗ por item
obrigatório. Botão "Enviar proposta" chama `POST /api/editais/proposta/enviar`; se
faltar algo, mostra a lista de pendências e mantém na tela (nunca envia incompleto).
Após sucesso: tela de confirmação, sem edição possível.

Cada tela tem "Salvar e continuar depois" (chama o rascunho, permite fechar a aba sem
perder nada) além de "Avançar".

## Validações

- Campos obrigatórios para o envio final: `institution_name`, `institution_cnpj`,
  `lab_name`, `lab_area`, `technical_justification`, `expected_results`, mínimo 3 fotos,
  e todo `requirementCode` obrigatório (`8.1.1`–`8.1.9`, `8.1.15`, `8.1.16`) com
  documento anexado. `team_description` e `lab_served_public` são descritivos e opcionais
  — o edital não os exige explicitamente como itens de documentação separados.
- Textos longos (`technical_justification`, `expected_results`, `team_description`,
  `lab_served_public`): limite de 5000 caracteres, mesmo teto do campo `projects` em
  `/api/inscricoes`.
- `budget_items`: máximo 20 itens; cada um com `descricao` (≤200 car.), `valor_estimado`
  (número > 0), `justificativa` (≤500 car.).
- Fotos: mínimo 3 para permitir envio final, máximo técnico 8.
- Todo campo de texto passa por `containsDangerousInput` (`lib/security.ts`, já existe).

## Segurança

- Toda rota exige `X-Edital-Token` válido (`verifyEditalToken`) — nunca confia em
  `registrationId` vindo do corpo da requisição.
- `isTrustedOrigin` + `enforceRateLimit` em todas as rotas. Como aqui a pessoa já está
  autenticada (diferente do gate, que é busca por CPF), o risco de enumeração é bem
  menor — limites generosos para não atrapalhar quem está preenchendo: 30 req/10min por
  bucket (`edital-proposta-rascunho`, `edital-proposta-documento`).
- Download de documento (`GET .../documento/:id`) confere posse (o `registration_id` do
  token deve bater com o da submissão dona do documento) antes de gerar a URL assinada.
- Arquivos no S3: chave não previsível, bucket privado, acesso só via URL assinada de
  curta duração.

## Casos de borda

- Envio incompleto: `POST enviar` rejeita com a lista exata do que falta — nunca grava
  uma proposta pela metade como `SUBMITTED`.
- Reenvio de um documento: substitui a linha anterior do mesmo `requirementCode`.
- Reabrir `/edital/proposta` com submissão já `SUBMITTED`: tela somente-leitura de
  confirmação, sem permitir edição.
- Token expirado no meio do preenchimento: front trata o `401 token_expired` redirecionando
  para `/edital` com mensagem de "sessão expirada, informe seu CPF novamente" (mesmo
  contrato já definido no spec do gate); o rascunho no banco não é afetado.

## Decisões técnicas

- **Geração do PDF do Termo de Participação:** `pdf-lib` (nova dependência, pura
  JS/TS, sem binário nativo — compatível com o Docker ARM64) em vez de uma solução
  baseada em headless-Chrome (Puppeteer), que seria desproporcional para um documento
  de uma página.
- **Armazenamento de documentos:** S3 via `lib/s3.ts` (já existe, hoje só usado para
  credenciais do Google), com metadados/hash em `edital_submission_documents` — não
  BYTEA no Postgres, dado o volume de arquivos por submissão.
- **Modelagem de documentos:** tabela filha tipada (`edital_submission_documents`) em
  vez de um blob JSONB, seguindo a preferência já existente no projeto por colunas
  tipadas (ver `registrations`).

## Fora de escopo (explícito)

- Telas de administração/homologação da Innovatis (seções 9–11 do edital).
- Fluxo de "Innovatis pede documento complementar" pós-envio (item 8.3 do edital) —
  resubmissão/correção de proposta já enviada.
- Notificação por e-mail ao proponente, além do que já existe no fluxo de inscrição.
- Geração automática de ANEXO II (Declaração de Responsabilidade) ou ANEXO III (Termo
  de Compromisso de Contrapartida) — ficam como upload manual de PDF assinado.
- Múltiplas propostas por pessoa/CPF.
- Limpeza de objetos órfãos no S3 após substituição de documento.
