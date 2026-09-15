# Plano: upload documental ampliado e painel admin

Data: 2026-09-15
Status: implementado localmente
Spec: [2026-09-15-edital-upload-admin-preview.md](../specs/2026-09-15-edital-upload-admin-preview.md)
Objetivo: aceitar imagens nos documentais com lock/compressao e melhorar
previews/layout do admin avaliador.

## Contexto de execucao

Preservar trabalho paralelo de auth/broker e demais diffs locais. Nao reverter
alteracoes preexistentes.

## Etapas

- [x] Estender tipos/validacao/tests para JPEG/PNG/WEBP.
- [x] Criar busy context + compressao e ligar em DocumentUploadSlot/PhotoGallerySlot/wizard.
- [x] Atualizar helper texts das telas.
- [x] Melhorar ThumbnailCard e layout de `/admin/editais/[id]`.
- [x] Rodar `npm test` e registrar resultado.
- [x] Atualizar architecture/project-state/indices.

## Verificacoes

| Data | Comando ou cenario | Resultado | Limitacoes |
| --- | --- | --- | --- |
| 2026-09-15 | `npm test` | 43 pass, exit 0 | sem browser/E2E admin |

## Decisoes e desvios

- Thumbnail sem MIME (ex.: certificado) continua tentando carregar a imagem e
  cai no fallback via `onError`, para nao regressar o certificado.
- Compressao e best-effort: se falhar ou nao reduzir tamanho, envia original.

## Retomada ou encerramento

Ultimo passo: codigo A+B + `npm test` ok + contexto atualizado.
Proximo: aceite visual; commit/deploy sob pedido.
