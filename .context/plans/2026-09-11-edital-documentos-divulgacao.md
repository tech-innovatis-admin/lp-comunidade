# Plano de implementacao: documentos e divulgacao do Edital PPI

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publicar anexos Word, aceitar documentos PDF/DOC/DOCX com validacao segura, proteger o fluxo do Edital com DTOs allowlisted, corrigir a exclusao do rascunho e divulgar o Edital PPI 2026 na home.

**Architecture:** A politica de formatos fica dividida entre constantes browser-safe e validacao binaria server-only. DTOs explícitos separam contratos HTTP dos registros internos e aplicam allowlists antes de qualquer persistência ou resposta. IDs `BIGINT` sao normalizados na fronteira do banco. O painel evita thumbnails para Word, enquanto a home ganha uma secao client isolada com modal e links para o PDF oficial.

**Tech Stack:** Next.js 15 App Router, React 19, TypeScript, Tailwind CSS 4, Node test runner via `tsx`, PostgreSQL/`pg`, AWS S3 e Lucide React.

**Spec:** [.context/specs/2026-09-11-edital-documentos-divulgacao.md](../specs/2026-09-11-edital-documentos-divulgacao.md)

**Status 2026-09-11:** concluido para implementacao de codigo e documentacao
local. Aceite final permanece aberto ate o PDF oficial existir em
`public/edital/edital-ppi-2026.pdf` e a matriz manual ser executada em ambiente
descartavel autorizado.

## Global Constraints

- Documentos do usuario: somente PDF, DOC e DOCX, maximo de 10 MiB.
- Fotos: somente JPEG, PNG e WEBP, maximo de 5 MiB cada, de 3 a 8.
- Modelos oficiais: os dois DOCX fornecidos pelo usuario; nomes publicos ASCII.
- Edital principal: `public/edital/edital-ppi-2026.pdf`, exigido antes do aceite final.
- CTA `Inscreva-se`: `/edital`.
- Copy obrigatoria: `As instruções para submissão da proposta estão descritas no item 7.3 do edital.`
- Periodo obrigatorio: `Inscrições: 17/09 a 04/10/2026`.
- Nao alterar schema, requisitos documentais, webhooks ou fluxo de envio final.
- Nenhum endpoint do Edital retorna linha de banco, CPF completo, `registrationId`, chave S3, hash, IP, user-agent, token ou bytes.
- Requests de rascunho/upload/envio rejeitam propriedades desconhecidas e usam DTOs separados dos tipos de persistência.
- Preservar as alteracoes locais preexistentes de autenticacao e manifests npm.

---

### Task 1: Contratos DTO e validação de entrada/saída

**Files:**
- Create: `lib/edital-dtos.ts`
- Create: `lib/edital-dto-validation.ts`
- Create: `lib/edital-client-types.ts`
- Create: `lib/edital-dtos.test.ts`
- Modify: `lib/edital-proposta-api.ts`

**Interfaces:**
- Produces: `EditalSubmissionDto`, `EditalSubmissionDocumentDto`,
  `EditalDraftRequestDto`, `EditalDraftResponseDto`, `EditalValidationDto`,
  `EditalDocumentUploadResponseDto`, `parseDraftRequest`, `parseDocumentUploadFields`,
  `toSubmissionDto`, `toDocumentDto` e `toStableErrorDto`.
- `toSubmissionDto` aceita uma linha interna e retorna somente os campos
  explicitamente allowlisted; não retorna `registrationId`, CPF, S3 ou hashes.
- `lib/edital-client-types.ts` não pode importar `pg`, `Buffer`, `next/server` ou S3.

- [ ] **Step 1: Write failing DTO allowlist tests**

Cobrir mapeamento de submissão/documento, ausência de campos sensíveis,
rejeição de propriedade desconhecida em cada step, tipos inválidos, limites,
erro estável e separação dos imports client/server. Incluir uma fixture interna
com `registration_id`, `s3_key`, `file_hash`, IP e user-agent e afirmar que nenhum
deles aparece no DTO serializado.

- [ ] **Step 2: Run tests and confirm RED**

Run: `npm test`
Expected: FAIL por módulos e mapeadores ainda inexistentes.

- [ ] **Step 3: Implement DTOs and allowlist parsers**

Definir schemas/parsers sem aceitar spread de objetos. Cada parser deve retornar
DTO validado ou erro de validação; campos desconhecidos são rejeitados antes da
regra de negócio. Datas devem sair em ISO e mensagens sem valores sensíveis.

- [ ] **Step 4: Make client API consume only DTOs**

Atualizar `lib/edital-proposta-api.ts` e componentes para importar somente
`edital-client-types.ts`; manter tipos de banco e mapeadores no servidor.

- [ ] **Step 5: Run tests and typecheck**

Run: `npm test` (Expected: PASS) e `npx tsc --noEmit` (Expected: exit 0).

---

### Task 2: Politica compartilhada de documentos

**Files:**
- Create: `lib/edital-document-types.ts`
- Create: `lib/edital-document-validation.ts`
- Create: `lib/edital-document-validation.test.ts`
- Modify: `lib/security.ts`
- Modify: `package.json`
- Modify: `package-lock.json`

**Interfaces:**
- Produces: `EDITAL_DOCUMENT_ACCEPT`, `EditalDocumentKind`,
  `getEditalDocumentKind(filename, reportedMimeType)`,
  `getEditalDocumentKindFromMime(mimeType)` e
  `validateEditalDocumentBuffer(filename, reportedMimeType, buffer)`.
- `validateEditalDocumentBuffer` retorna a uniao
  `{ valid: true, kind, mimeType } | { valid: false, error }`.
- Consumed by: upload API, components de upload, admin cards e link routes.

- [x] **Step 1: Extend the test command without discarding auth work**

Alterar o script preexistente para executar `.test.ts` e `.test.mjs`:

```json
"test": "tsx --test lib/*.test.ts lib/*.test.mjs"
```

Executar `npm install --package-lock-only` apenas para sincronizar metadata se o
lockfile exigir. Revisar o diff para preservar `openid-client` e mudancas de auth.

Evidencia 2026-09-11: `package.json` ja continha
`"test": "tsx --test lib/*.test.ts lib/*.test.mjs"` e `openid-client`;
nenhuma alteracao de manifest ou lockfile foi necessaria nesta tarefa.

- [x] **Step 2: Write failing file-policy tests**

Cobrir em `lib/edital-document-validation.test.ts`:

```ts
test('aceita PDF quando extensao, MIME e assinatura conferem')
test('aceita DOC com assinatura OLE e normaliza MIME octet-stream')
test('aceita DOCX OOXML e normaliza MIME zip')
test('rejeita ZIP comum renomeado para DOCX')
test('rejeita extensao, MIME e assinatura incoerentes')
test('nao trata imagem como documento geral')
```

Construir buffers minimos deterministas: `%PDF-`, bytes OLE e ZIP de fixture
contendo os nomes `[Content_Types].xml` e `word/document.xml`; nao usar documentos reais.

Evidencia 2026-09-11: `lib/edital-document-validation.test.ts` cobre os seis
casos com buffers sinteticos minimos.

- [x] **Step 3: Run tests and confirm RED**

Run: `npm test`
Expected: FAIL por modulos/exports ainda inexistentes, mantendo os testes de auth executados.

Evidencia 2026-09-11: `npm test` falhou com
`Cannot find module './edital-document-validation'`; os testes de auth e DTO
continuaram sendo executados.

- [x] **Step 4: Implement browser-safe constants and server validation**

Em `edital-document-types.ts`, definir:

```ts
export type EditalDocumentKind = 'pdf' | 'doc' | 'docx'
export const EDITAL_DOCUMENT_ACCEPT = [
  '.pdf', '.doc', '.docx',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
].join(',')
```

Em `edital-document-validation.ts`, verificar extensao em lowercase, MIME,
assinatura PDF/OLE e marcadores OOXML. Retornar o MIME canonico e erro em pt-BR.
`getEditalDocumentKindFromMime` deve reconhecer os tres MIME canonicos persistidos,
permitindo que o painel decida preview/download mesmo se o nome original for nulo.
Manter a validacao de fotos existente em `security.ts`; remover de la somente a
suposicao de que toda validacao documental precisa ser PDF.

Evidencia 2026-09-11: criados `lib/edital-document-types.ts` e
`lib/edital-document-validation.ts`; `lib/security.ts` preserva validacao de
fotos e reconhece assinaturas Word sem mudar o upload end-to-end.

- [x] **Step 5: Run tests and typecheck**

Run: `npm test`
Expected: PASS para politica e testes de auth.

Run: `npx tsc --noEmit`
Expected: exit 0.

Evidencia 2026-09-11: `npm test` passou com 33 testes; `npx tsc --noEmit`
terminou com exit 0. Ambos emitiram apenas o aviso local de npm sobre
`devdir`.

---

### Task 3: Assets oficiais e links dos anexos

**Files:**
- Create: `public/edital/anexo-i-declaracao-responsabilidade.docx`
- Create: `public/edital/anexo-ii-termo-contrapartida.docx`
- Delete after reference check: `public/edital/anexo-i-declaracao-responsabilidade.pdf`
- Delete after reference check: `public/edital/anexo-ii-termo-contrapartida.pdf`
- Modify: `app/components/EditalCpfGate.tsx`
- Modify: `app/components/edital/TelaDeclaracoes.tsx`

**Interfaces:**
- Produces: URLs publicas estaveis dos dois DOCX.
- Consumed by: gate de CPF e etapa Declaracoes.

- [ ] **Step 1: Copy the verified official assets**

Copiar, preservando bytes, dos caminhos fornecidos para os nomes ASCII definidos
na spec. Este passo e uma copia binaria autorizada para dentro do repositorio.

- [ ] **Step 2: Verify the copied DOCX archives**

Run: `unzip -t public/edital/anexo-i-declaracao-responsabilidade.docx`
Expected: `No errors detected`.

Run: `unzip -t public/edital/anexo-ii-termo-contrapartida.docx`
Expected: `No errors detected`.

Comparar SHA-256 entre origem e destino com `shasum -a 256`; cada par deve ser igual.

- [ ] **Step 3: Update every model URL**

Trocar constantes/links para `.docx` em `EditalCpfGate.tsx` e
`TelaDeclaracoes.tsx`. Manter rotulos, checkbox e comportamento de download.

- [ ] **Step 4: Remove obsolete PDFs only after proving no reference remains**

Run: `rg -n 'anexo-(i-declaracao-responsabilidade|ii-termo-contrapartida)\.pdf' . -g '!node_modules' -g '!.git'`
Expected: somente historico em `docs/`/`.context/`, sem referencia executavel.

Remover os dois PDFs de `public/edital/`; nao alterar documentos historicos.

- [ ] **Step 5: Verify public asset references**

Run: `rg -n 'anexo-(i-declaracao-responsabilidade|ii-termo-contrapartida)\.(pdf|docx)' app public`
Expected: codigo executavel aponta somente para `.docx`, ambos presentes.

---

### Task 4: Upload PDF/DOC/DOCX de ponta a ponta

**Files:**
- Modify: `app/api/editais/proposta/documento/route.ts`
- Modify: `app/components/edital/DocumentUploadSlot.tsx`
- Modify: `app/components/edital/TelaEquipe.tsx`
- Modify: `app/components/edital/TelaInstituicao.tsx`
- Modify: `app/components/edital/TelaDeclaracoes.tsx`

**Interfaces:**
- Consumes: politica/validador da Task 1.
- Produces: upload que persiste MIME canonico e UI que seleciona os tres formatos.

- [ ] **Step 1: Replace PDF-only validation in the API**

Em `validateDocumentFile`, manter o ramo de foto. No ramo documental, chamar:

```ts
const validation = validateEditalDocumentBuffer(file.name, file.type, buffer)
if (!validation.valid) throw new Error(validation.error)
return validation.mimeType
```

Usar o retorno canonico no `uploadFileToKey` e na coluna `mime_type`. Preservar
limite, hash, nome sanitizado, codigos automaticos e regra de foto.

- [ ] **Step 2: Centralize the input accept value**

Importar `EDITAL_DOCUMENT_ACCEPT` nas telas e passa-lo aos nove slots documentais,
removendo `application/pdf` duplicado. Ajustar helper text comum para
`Formatos aceitos: PDF, DOC e DOCX (até 10 MB)` sem retirar orientacoes especificas.

- [ ] **Step 3: Make the uploaded-file action format-aware**

Em `DocumentUploadSlot`, usar `document.mimeType` para mostrar `Eye`/`Ver arquivo`
em PDF e `Download`/`Baixar arquivo` em DOC/DOCX. A chamada continua usando
`getEditalDocumentUrl`; o disposition sera tratado pela Task 6.

- [ ] **Step 4: Verify format behavior**

Run: `npm test`
Expected: todos os casos de assinatura passam.

Teste manual em ambiente descartavel: um PDF, DOC e DOCX validos fazem upload;
ZIP renomeado, DOCX como `.pdf`, imagem em campo documental e arquivo >10 MiB
sao rejeitados; fotos validas continuam aceitas.

---

### Task 5: Normalizacao de BIGINT e exclusao completa

**Files:**
- Create: `lib/database-id.ts`
- Create: `lib/database-id.test.ts`
- Modify: `app/api/editais/proposta/rascunho/route.ts`
- Modify: `app/api/editais/proposta/documento/route.ts`
- Modify: `app/api/editais/proposta/documento/[id]/route.ts`
- Modify: `lib/s3.ts` only if a small multi-key cleanup helper removes duplication

**Interfaces:**
- Produces: `parseDatabaseId(value: unknown): number | null`.
- Consumed by: mappings/responses de rascunho/upload e autorizacao GET/DELETE.

- [x] **Step 1: Write failing database-ID tests**

```ts
test('normaliza BIGINT string positivo para number')
test('preserva inteiro positivo seguro')
test('rejeita zero, negativo, decimal, texto e valor acima de MAX_SAFE_INTEGER')
test('IDs normalizados comparam propriedade sem coerção frouxa')
```

Evidencia 2026-09-11: criado `lib/database-id.test.ts` com os quatro casos
previstos, cobrindo string BIGINT, number seguro, rejeicoes e comparacao de
propriedade sem coerção frouxa.

- [x] **Step 2: Run tests and confirm RED**

Run: `npm test`
Expected: FAIL por `parseDatabaseId` inexistente.

Evidencia 2026-09-11: `npm test` falhou com
`Cannot find module './database-id'`; os demais 33 testes passaram.

- [x] **Step 3: Implement and apply the boundary normalization**

Implementar conversao explicita com `Number`, `Number.isSafeInteger` e valor > 0.
Aplicar a IDs retornados por `pg` antes de montar respostas do rascunho/upload e
antes de comparar `registration_id` ao token em GET/DELETE. Se uma ID de banco
for invalida, retornar erro interno controlado; nao autorizar por coerção.

Evidencia 2026-09-11: criado `lib/database-id.ts`; rascunho normaliza `id` e
`registration_id` da submissao e IDs dos documentos antes do DTO; upload normaliza
IDs de submissao/documento antes de usar em respostas; GET/DELETE normalizam
parametro e `registration_id` antes da comparacao de propriedade.

- [x] **Step 4: Include S3 keys in the delete transaction**

Selecionar `s3_key` e `thumbnail_s3_key` com `FOR UPDATE`. Depois do commit e de
uma exclusao autorizada, chamar `deleteFile` para cada chave existente via
`Promise.allSettled`. Logar apenas ID/chave tecnica em falha. Manter 404 para
outro usuario ou `SUBMITTED` e 401 para token expirado.

Evidencia 2026-09-11: DELETE seleciona `s3_key` e `thumbnail_s3_key` na transacao
com `FOR UPDATE`, remove a linha antes do commit e limpa os objetos S3 depois do
commit com `Promise.allSettled`, mantendo falha de S3 como best-effort.

- [x] **Step 5: Verify the original regression**

Run: `npm test`
Expected: PASS nos testes de ID, arquivos e auth.

Teste manual: enviar e excluir um documento e uma foto; o X exibe loader, o item
some, outro arquivo pode ser enviado e, apos reload, o excluido nao retorna.
Confirmar no ambiente descartavel que a linha foi removida e os objetos foram
apagados; testar 401, propriedade alheia e proposta `SUBMITTED`.

Evidencia 2026-09-11: `npm test` passou com 37 testes; `npx tsc --noEmit`
terminou com exit 0. Ambos emitiram apenas o aviso local de npm sobre `devdir`.
Matriz manual de exclusao adiada por nao haver ambiente descartavel autorizado
nesta execucao.

---

### Task 6: Downloads Word e fallback no painel administrativo

**Files:**
- Modify: `app/api/editais/proposta/documento/[id]/route.ts`
- Modify: `app/api/editais/documento/[id]/link/route.ts`
- Modify: `app/api/editais/documento/[id]/thumbnail/route.ts`
- Modify: `app/admin/editais/[id]/page.tsx`
- Modify: `app/components/admin/ThumbnailCard.tsx`

**Interfaces:**
- Consumes: `EditalDocumentKind`/detector da Task 2 e ID normalizada da Task 5.
- Produces: Word por download; preview somente para PDF/imagens.

- [x] **Step 1: Return filenames and MIME from document lookups**

Incluir `mime_type` e `original_filename` nos SELECTs do link do proponente e
do admin. Para DOC/DOCX chamar:

```ts
getSignedFileUrl(s3Key, expiresIn, sanitizedOriginalFilename)
```

Para PDF/imagem, omitir `downloadFileName` e preservar abertura inline.

Evidencia 2026-09-11: criado `lib/edital-document-access.ts` para decidir
disposition e nome sanitizado; as rotas de link do proponente e admin selecionam
`mime_type`/`original_filename` e passam `downloadFileName` somente para DOC/DOCX.
PDFs e imagens continuam sem disposition de attachment.

- [x] **Step 2: Prevent Word thumbnail generation**

Na rota de thumbnail, permitir somente `application/pdf` e MIME de imagem aceito.
Responder 415 `{ error: 'Pré-visualização indisponível para este formato' }`
antes de baixar o objeto quando for Word ou outro MIME.

Evidencia 2026-09-11: rota admin de thumbnail usa `isThumbnailMimeTypeSupported`
e responde 415 com a mensagem controlada antes de baixar o objeto quando o MIME
nao e PDF/JPEG/PNG/WEBP. IDs da rota foram normalizados com `parseDatabaseId`.

- [x] **Step 3: Render a Word fallback without requesting the thumbnail route**

Ampliar `ThumbnailCard` com `mimeType`. Para DOC/DOCX, renderizar diretamente
`FileText`, extensao e label dentro do link `openUrl`; para PDF/imagem manter `<img>`
e fallback `onError`. Atualizar a query/pontos de uso na pagina para passar MIME.

Evidencia 2026-09-11: `ThumbnailCard` recebe `mimeType` e renderiza fallback
direto para Word, sem `<img>`/thumbnail route. A pagina admin seleciona
`mime_type` e passa o MIME nos documentos/fotos do Edital.

- [x] **Step 4: Verify admin behavior**

Testar com sessao admin em ambiente descartavel: PDF mostra thumbnail; Word mostra
fallback e baixa com nome original; requisicao direta de thumbnail Word retorna
415; usuario sem sessao recebe 401. Confirmar que fotos e PDFs gerados continuam iguais.

Evidencia 2026-09-11: RED `npm test` falhou por
`Cannot find module './edital-document-access'`; GREEN `npm test` passou com 41
testes; `npx tsc --noEmit` terminou com exit 0; `ReadLints` nao encontrou erros
nos arquivos alterados. Matriz manual admin adiada por nao haver ambiente
descartavel com sessao/admin e arquivos S3 autorizados nesta execucao.

---

### Task 7: Orientacao da etapa Proposta

**Files:**
- Modify: `app/components/edital/TelaProposta.tsx`

**Interfaces:**
- No data contract changes; produces static informational copy.

- [ ] **Step 1: Add the exact guidance copy**

Logo abaixo do paragrafo introdutorio, inserir um bloco informativo compacto com
icone `Info`, contraste acessivel e o texto literal da restricao global. Nao usar
campo, link inventado ou estado React.

- [ ] **Step 2: Verify placement and copy**

Run: `rg -n -F 'As instruções para submissão da proposta estão descritas no item 7.3 do edital.' app/components/edital/TelaProposta.tsx`
Expected: uma ocorrencia.

Validar visualmente em mobile e desktop, sem sobrepor stepper ou primeiro campo.

---

### Task 8: Secao do Edital e modal na home

**Files:**
- Create: `app/components/EditalAnnouncementSection.tsx`
- Create when supplied: `public/edital/edital-ppi-2026.pdf`
- Modify: `app/page.tsx`

**Interfaces:**
- Produces: secao de divulgacao, modal acessivel e CTA `/edital`.
- Asset contract: `const EDITAL_PDF_URL = '/edital/edital-ppi-2026.pdf'`.

- [ ] **Step 1: Place and validate the official edital asset**

Copiar o PDF oficial fornecido pelo usuario para o caminho do contrato. Validar:

Run: `file public/edital/edital-ppi-2026.pdf`
Expected: `PDF document`.

Run: `test -s public/edital/edital-ppi-2026.pdf`
Expected: exit 0. Sem esse arquivo, a Task 8 e o aceite final permanecem incompletos.

- [ ] **Step 2: Build the isolated announcement component**

Criar client component com estado `isModalOpen` e referencias para gatilho/fechar.
Renderizar titulo, subtitulo, periodo e duas acoes. Usar `FileText`, `CalendarDays`,
`ArrowRight`, `ExternalLink`, `Download` e `X` do Lucide. `Inscreva-se` e um `Link`
para `/edital`; `Edital do Programa` abre o modal.

- [ ] **Step 3: Implement accessible modal behavior**

O modal deve:

```tsx
<div role="dialog" aria-modal="true" aria-labelledby="edital-modal-title">
```

No `useEffect` enquanto aberto, registrar `keydown` para Escape, salvar/restaurar
`document.body.style.overflow`, focar o botao fechar e, no cleanup, devolver foco
ao gatilho. Backdrop fecha apenas quando `event.target === event.currentTarget`.
`Abrir edital` usa `target="_blank" rel="noopener noreferrer"`; `Baixar edital`
usa `download`. Nao usar iframe/object, mantendo a CSP atual.

- [ ] **Step 4: Insert the section at the requested position**

Em `app/page.tsx`:

```tsx
<HeroSection />
<EditalAnnouncementSection />
<InnovaNationSection />
```

Nao alterar a ordem de Testimonials e RegistrationFormSection.

- [ ] **Step 5: Verify navigation, modal and responsiveness**

Em 390x844 e 1440x900: conferir hierarquia, texto sem overflow, botoes empilhados
no mobile e alinhados no desktop, modal dentro do viewport, Escape/backdrop/X,
restauracao de foco, abertura/download do PDF e `/edital` no CTA.

---

### Task 9: DTOs aplicados a todas as rotas do Edital

**Files:**
- Modify: `app/api/editais/validar-cpf/route.ts`
- Modify: `app/api/editais/proposta/rascunho/route.ts`
- Modify: `app/api/editais/proposta/documento/route.ts`
- Modify: `app/api/editais/proposta/documento/[id]/route.ts`
- Modify: `app/api/editais/proposta/enviar/route.ts`
- Modify: `app/api/editais/documento/[id]/link/route.ts`
- Modify: `app/api/editais/documento/[id]/thumbnail/route.ts`
- Modify: `app/api/editais/certificado/[registrationId]/link/route.ts`
- Modify: `app/api/editais/certificado/[registrationId]/thumbnail/route.ts`
- Modify: `app/api/admin/editais/[id]/avaliacao/route.ts`
- Modify: `app/api/admin/editais/[id]/desqualificar/route.ts`
- Modify: `app/api/admin/editais/[id]/requalificar/route.ts`

**Interfaces:**
- Consumes: DTOs e parsers da Task 1. Normalizacao de IDs pode ser aplicada
  incrementalmente na Task 5 sem alterar o contrato HTTP.
- Produces: contrato HTTP estável em todas as respostas do Edital e admin.

- [ ] **Step 1: Map gate and draft responses through DTOs**

No gate, expor apenas prefill necessário à proposta, sem CPF completo ou ID
interno. No rascunho, mapear submissão/documentos com `toSubmissionDto` e
rejeitar campos desconhecidos no body antes de `transaction`.

- [ ] **Step 2: Map upload, read, delete and submit responses**

Upload retorna somente `documentId`, `requirementCode`, `filename`, `mimeType`
canonico e `uploadedAt`. Leitura retorna URL assinada apenas após autorização,
sem S3 key. Delete retorna `{ ok: true }`; envio retorna apenas protocolo/data
que o usuário precisa, sem payload de banco.

- [ ] **Step 3: Harden admin link, thumbnail and action responses**

Admin pode receber dados administrativos necessários à revisão, mas nunca bytes,
credenciais ou segredos. Aplicar DTO de erro e allowlist de campos em avaliação,
desqualificação e requalificação. Separar explicitamente DTO de proponente e DTO
administrativo, sem reutilizar um objeto amplo.

- [ ] **Step 4: Add route contract tests**

Usar handlers/mappers em ambiente de teste para provar: propriedade desconhecida
é 400; sessão/token ausente é 401; propriedade alheia não revela existência;
resposta JSON não contém `registrationId`, CPF, S3, hash ou metadados de request.

- [ ] **Step 5: Run tests and inspect serialized payloads**

Run: `npm test` (Expected: PASS). Capturar somente fixtures sintéticas e revisar
cada JSON público com `rg` para nomes proibidos; não usar dados reais.

---

### Task 10: Verification and project context

**Files:**
- Modify: `.context/specs/2026-09-11-edital-documentos-divulgacao.md`
- Modify: `.context/plans/2026-09-11-edital-documentos-divulgacao.md`
- Modify: `.context/project-state.md`
- Modify if behavior changed: `.context/architecture.md`
- Modify if commands changed: `.context/development.md`

**Interfaces:**
- Produces: evidence-backed completion and a precise resumption point.

- [x] **Step 1: Run automated verification**

Run: `npm test`
Expected: exit 0, including auth, file policy and database-ID tests.

Run: `npx tsc --noEmit`
Expected: exit 0.

Run: `npm run build`
Expected: exit 0 including standalone postbuild.

Evidencia 2026-09-11:

- `npm test`: exit 0; 41 testes passaram, incluindo auth, DTOs, politica de
  arquivos, IDs de banco e acesso a documentos. Aviso local de npm:
  `Unknown env config "devdir"`.
- `npx tsc --noEmit`: exit 0. Mesmo aviso local de npm sobre `devdir`.
- `npm run build`: exit 0; Next compilou, gerou 24 paginas e executou
  `postbuild`. O postbuild informou
  `[fix-standalone-runtime] Runtime SSR não encontrado; nada a copiar.`

- [x] **Step 2: Run repository checks**

Run: `git diff --check`
Expected: exit 0.

Run: `rg -n 'anexo-(i-declaracao-responsabilidade|ii-termo-contrapartida)\.pdf' app public`
Expected: nenhuma ocorrencia.

Run: `rg -n "application/pdf" app/components/edital`
Expected: nenhuma restricao de input que exclua DOC/DOCX; ocorrencias restantes
devem ser justificadas como deteccao/preview de PDF.

Evidencia 2026-09-11:

- `git diff --check`: exit 0, sem saida.
- `rg -n 'anexo-(i-declaracao-responsabilidade|ii-termo-contrapartida)\.pdf' app public`:
  exit 1, sem ocorrencias.
- `rg -n "application/pdf" app/components/edital`: uma ocorrencia em
  `app/components/edital/DocumentUploadSlot.tsx`, usada para detectar preview
  de PDF e alternar a acao entre ver/baixar; nao e restricao de `accept`.
- Evidencia estatica adicional: `public/edital/` contem os dois DOCX oficiais;
  links executaveis dos anexos em `app` apontam para `.docx`; a frase do item
  7.3 aparece uma vez em `TelaProposta.tsx`; `app/page.tsx` posiciona
  `EditalAnnouncementSection` entre `HeroSection` e `InnovaNationSection`.

- [x] **Step 3: Complete the manual acceptance matrix**

Registrar resultado para: downloads DOCX, PDF/DOC/DOCX validos, arquivos adulterados,
limites de tamanho, fotos, exclusao e reload, sessao/propriedade/status, admin
PDF/Word, texto 7.3, modal por mouse/teclado, PDF oficial e CTA `/edital`.
Nao usar dados pessoais nem disparar envio final/webhooks.

Matriz registrada em 2026-09-11:

| Item | Resultado |
| --- | --- |
| Downloads DOCX | Verificacao estatica: links do gate e Declaracoes apontam para `.docx`; arquivos presentes em `public/edital/`. Manual em navegador diferido. |
| PDF/DOC/DOCX validos | Coberto por testes unitarios de assinatura/MIME e typecheck; upload real diferido por falta de ambiente descartavel. |
| Arquivos adulterados | Coberto por testes unitarios para ZIP comum, extensao/MIME/assinatura incoerentes e imagem em campo documental; teste manual diferido. |
| Limites de tamanho | Regras preservadas por codigo/typecheck; validacao manual de arquivo >10 MiB diferida. |
| Fotos | Regras de imagem permanecem separadas da politica documental; upload/exclusao manual diferidos. |
| Exclusao e reload | Coberto por testes de ID e revisao de transacao/limpeza best-effort; validacao manual em banco/S3 descartavel diferida. |
| Sessao, propriedade e status | Typecheck/testes de parsers e normalizacao cobrem contratos locais; cenario 401/404/`SUBMITTED` diferido. |
| Admin PDF/Word | Testes unitarios cobrem attachment Word, inline PDF/imagem e bloqueio de thumbnail Word; sessao admin real diferida. |
| Texto 7.3 | Verificado por `rg -n -F`; uma ocorrencia em `TelaProposta.tsx`. |
| Modal mouse/teclado | Build/typecheck e inspeção estatica do componente; teste visual e interativo diferido. |
| PDF oficial | Bloqueado: `public/edital/edital-ppi-2026.pdf` ausente. |
| CTA `/edital` | Build/typecheck e inspeção estatica do componente; teste em navegador diferido. |

- [x] **Step 4: Review final diff and update context**

Confirmar que alteracoes de auth preexistentes continuam preservadas. Marcar spec
`implementada` e plano `concluido` somente com evidencias. Atualizar estado com
commit/deploy reais, pendencias e proximo passo; nao equiparar build local a deploy.

Evidencia 2026-09-11: `git status --short` confirmou trabalho local de auth e
manifests ainda nao commitado. Esta Task 10 atualiza apenas `.context/` e o
relatorio local em `.superpowers/`; o commit deve incluir somente `.context/`.
Nenhum deploy, migration, webhook, S3 ou banco real foi executado.

## Planned execution order

Tasks 1 -> 9 -> 2 -> 3 -> 4 -> 5 -> 6 -> 7 -> 8 -> 10. A Task 8 depende do PDF oficial
para seu aceite, mas Tasks 1 a 7 podem ser implementadas antes que ele chegue.

## Resumption point

Implementacao local de codigo concluida e verificacoes automatizadas executadas
em 2026-09-11. Para liberar o aceite final, copiar o PDF oficial para
`public/edital/edital-ppi-2026.pdf`, validar o arquivo e executar a matriz manual
em ambiente descartavel autorizado. Preserve o trabalho local de auth e nao
trate build local como deploy.
