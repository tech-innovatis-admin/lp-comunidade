# Upload documental ampliado e painel admin de avaliacao

Data: 2026-09-15
Status: implementado localmente
Origem: pedido do usuario para aceitar imagens nos campos documentais,
bloquear uploads concorrentes, comprimir imagens no cliente e melhorar
previews/layout da pagina de avaliacao admin.
Plano: [2026-09-15-edital-upload-admin-preview.md](../plans/2026-09-15-edital-upload-admin-preview.md)

## Problema e objetivo

Campos documentais do wizard aceitavam apenas PDF/DOC/DOCX. O usuario pediu
permitir tambem JPG/PNG/WEBP nesses campos (sem abrir para tipos perigosos),
com trava global enquanto um upload estiver em andamento e compressao de
imagens no cliente. No admin, a pagina de detalhe da proposta precisava de
previews e layout mais legiveis para avaliacao.

## Escopo

Inclui:
- politica de tipos documentais PDF, DOC, DOCX, JPEG, PNG, WEBP;
- validacao por extensao + MIME + assinatura binaria;
- `EditalUploadBusyContext` e uso nos slots/wizard;
- compressao client-side de imagens antes do POST;
- melhorias em `ThumbnailCard` e `/admin/editais/[id]`.

Fora:
- conversao Word → preview;
- aceite de tipos arbitrarios;
- commit/deploy (somente sob pedido).

## Requisitos e criterios de aceite

1. Upload documental aceita PDF/DOC/DOCX/JPG/PNG/WEBP e rejeita exe/zip
   renomeado e assinatura incoerente.
2. Enquanto um upload/remocao estiver ativo, demais slots e navegacao do
   wizard ficam bloqueados.
3. Imagens passam por compressao/redimensionamento no cliente quando cabivel.
4. Admin mostra badge de tipo, caption do requisito, fallback claro para Word
   e layout mais amplo/legivel.

## Solucao e contratos

- `lib/edital-document-types.ts` / `edital-document-validation.ts`
- `lib/edital-image-compress.ts`
- `app/components/edital/EditalUploadBusyContext.tsx`
- slots, wizard e telas de helper text
- `ThumbnailCard` + pagina admin de detalhe

Sem migration. Sem mudanca de schema. Thumbnails de imagem/PDF continuam via
rotas admin existentes.

## Dados, acesso e operacao

Nao se aplica migration. Autorizacao admin e propriedade documental
permanecem iguais. Nao registrar arquivos reais nos testes.

## Validacao

- `npm test` (validacao e acesso documental)
- checagem visual local do admin quando disponivel

## Questoes e decisoes

- 2026-09-15: usuario aprovou imagens nos documentais + lock + compressao +
  melhorias admin; rejeitou "qualquer arquivo" e conversao Word→preview.
