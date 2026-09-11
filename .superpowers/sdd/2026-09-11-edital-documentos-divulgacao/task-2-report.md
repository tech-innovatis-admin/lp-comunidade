# Task 2: Politica compartilhada de documentos

Status: concluida localmente.

## Entregas

- Criado `lib/edital-document-types.ts` com `EditalDocumentKind`,
  `EDITAL_DOCUMENT_ACCEPT` e MIMEs canonicos.
- Criado `lib/edital-document-validation.ts` com deteccao por extensao/MIME,
  validacao de assinatura PDF/OLE/OOXML e normalizacao de MIME persistivel.
- Criado `lib/edital-document-validation.test.ts` com buffers sinteticos
  minimos para PDF, DOC, DOCX, ZIP renomeado, incoerencia e imagem.
- Ajustado `lib/security.ts` para reconhecer assinaturas Word sem remover a
  validacao de fotos existente.

## TDD e verificacao

- RED: `npm test` falhou antes da implementacao com
  `Cannot find module './edital-document-validation'`.
- GREEN: `npm test` passou com 33 testes.
- Typecheck: `npx tsc --noEmit` terminou com exit 0.
- Diagnostics: `ReadLints` sem erros nos arquivos alterados.

## Observacoes

- `package.json` ja continha `"test": "tsx --test lib/*.test.ts lib/*.test.mjs"`;
  `package-lock.json` ja preservava `openid-client`, entao os manifests nao
  foram alterados nesta tarefa.
- A Task 2 nao conectou UI/API de upload end-to-end; isso permanece para a Task 4.
- Os comandos `npm test` e `npx tsc --noEmit` emitiram apenas o aviso local de npm
  sobre a config `devdir`.
