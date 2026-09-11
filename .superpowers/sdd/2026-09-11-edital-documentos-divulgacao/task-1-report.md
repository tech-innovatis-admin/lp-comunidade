# Task 1 Report: Contratos DTO e validacao de entrada/saida

## Status

DONE_WITH_CONCERNS em execucao local. A Task 1 foi implementada com contratos DTO
allowlisted, parsers de entrada e tipos browser-safe. As rotas ainda nao foram
religadas aos DTOs de resposta/entrada por design do plano; isso fica para a Task 9.

## TDD evidence

RED inicial:

```text
Command: npm test
Exit code: 1
Expected failure: Cannot find module './edital-dto-validation'
Context: lib/edital-dtos.test.ts criado antes dos modulos de producao.
Existing auth tests executed: 3 pass.
```

RED incremental:

```text
Command: npm test
Exit code: 1
Expected failure: rejeita upload de codigos gerados automaticamente
Reason: parseDocumentUploadFields aceitava 8.1.10 antes do ajuste.
```

GREEN final:

```text
Command: npm test
Exit code: 0
Result: 13 tests, 13 pass, 0 fail.
```

Typecheck:

```text
Command: npx tsc --noEmit
Exit code: 0
Result: sem erros TypeScript.
```

Diff hygiene:

```text
Command: git diff --check -- lib/edital-client-types.ts lib/edital-dtos.ts lib/edital-dto-validation.ts lib/edital-dtos.test.ts lib/edital-proposta-api.ts package.json
Exit code: 0
Result: sem whitespace errors no escopo da tarefa.
```

Lint IDE:

```text
ReadLints: sem erros nos arquivos da tarefa.
```

## Files changed for this task

- `lib/edital-client-types.ts`: tipos publicos e constantes browser-safe do wizard/DTOs, sem imports.
- `lib/edital-dtos.ts`: mapeadores `toSubmissionDto`, `toDocumentDto` e helper ISO com allowlist explicita.
- `lib/edital-dto-validation.ts`: `parseDraftRequest`, `parseDocumentUploadFields` e `toStableErrorDto`.
- `lib/edital-dtos.test.ts`: testes TDD de mapeamento, ausencia de campos sensiveis, rejeicao de campos inesperados, tipos/limites, erro estavel e imports client-safe.
- `lib/edital-proposta-api.ts`: passou a consumir/reexportar tipos de `edital-client-types.ts` para manter compatibilidade com os componentes atuais.
- `package.json`: script `test` atualizado para `tsx --test lib/*.test.ts lib/*.test.mjs`.

## Self-review

- Os DTOs de saida sao montados campo a campo; nao usam spread de linhas internas.
- A fixture de teste inclui `registration_id`, `s3_key`, `file_hash`, IP,
  user-agent e CPF sinteticos; o JSON serializado dos DTOs nao expoe esses nomes
  nem valores.
- `lib/edital-client-types.ts` nao importa `pg`, `Buffer`, `next/server` ou S3.
- `parseDraftRequest` rejeita propriedades desconhecidas no envelope e por step,
  normaliza texto, CNPJ e orcamento, e retorna erros estaveis sem ecoar payload.
- `parseDocumentUploadFields` aceita somente `requirementCode` e `file`, valida
  codigo conhecido e rejeita documentos gerados automaticamente.
- Nao apliquei DTOs nas rotas `/api/editais`; isso permanece no escopo da Task 9.

## Concerns

- O arquivo `package.json` ja estava modificado antes desta tarefa com dependencia
  de auth (`openid-client`). O commit deve stagear somente o hunk do script `test`
  para preservar essa alteracao fora do commit da Task 1.
- Os componentes ainda importam tipos por `lib/edital-proposta-api.ts`; para
  respeitar o limite de arquivos da Task 1, mantive reexports compatíveis em vez
  de editar todos os componentes.
- `npm` emite aviso local `Unknown env config "devdir"`; nao bloqueia testes nem
  typecheck e nao parece introduzido por esta tarefa.
