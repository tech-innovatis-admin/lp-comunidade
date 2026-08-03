# Edital — Fotos individuais → PDF único no envio

**Data:** 2026-08-03  
**Status:** aprovado

## Objetivo

O proponente continua enviando 3–8 fotos individuais no wizard. No `POST /api/editais/proposta/enviar`, o sistema gera um PDF único com essas fotos, grava no S3 como documento `8.1.8`, remove as fotos individuais e usa esse PDF na avaliação, Sheets e N8N.

## Decisões

- Geração do PDF: **somente no envio final**
- Após sucesso: **apagar** registros e objetos S3 das fotos `foto` (originais + thumbnails)
- Code do PDF: **`8.1.8`**
- UI do wizard: inalterada (upload/remoção individual)

## Fluxo técnico

1. Validar completude (incluindo ≥ 3 fotos `foto`)
2. Baixar bytes das fotos do S3 (ordem estável: `uploaded_at` ASC, `id` ASC)
3. Gerar PDF A4 com `pdf-lib` (1 página/foto); WEBP → JPEG via `sharp` antes do embed
4. Upload S3 + INSERT `edital_submission_documents` (`requirement_code = '8.1.8'`)
5. DELETE docs `foto` + objetos S3 associados
6. Gerar termo `8.1.10` (fluxo existente)
7. Marcar `SUBMITTED`
8. Sheets/N8N: link do PDF em vez de `photoLinks[]` múltiplos

Falha na geração/upload do PDF **aborta** a submissão (não marca SUBMITTED).

## Superfícies

| Área | Mudança |
|------|---------|
| `lib/edital-photos-pdf.ts` (novo) | Montagem do PDF |
| `lib/edital-requirements.ts` | `8.1.8` como doc auto-gerado no envio (não uploadável pelo usuário) |
| `enviar/route.ts` | Orquestração |
| `lib/s3.ts` | Delete de objeto se ainda não existir helper |
| Admin `[id]` | Mostrar PDF `8.1.8`; fallback galeria `foto` para propostas antigas |
| `google-sheets.ts` | Coluna Fotos = link do `8.1.8` |

## Fora de escopo

- Regenerar PDF a cada upload no rascunho
- Alterar limites 3–8 / 5 MB
- Fotos em “arquivo único” no upload do usuário
