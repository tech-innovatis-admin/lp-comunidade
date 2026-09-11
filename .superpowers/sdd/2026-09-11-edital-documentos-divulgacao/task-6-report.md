STATUS: completed
TASK: Task 6 - Downloads Word e fallback no painel administrativo

CHANGED:
- Criado `lib/edital-document-access.ts` e teste TDD para disposition Word, suporte de thumbnail e extensao do fallback.
- Rotas de link do proponente e admin selecionam `mime_type`/`original_filename` e usam `attachment` com nome sanitizado apenas para DOC/DOCX.
- Rota admin de thumbnail normaliza ID, aceita somente PDF/JPEG/PNG/WEBP e retorna 415 controlado para Word/outros MIME antes de baixar do S3.
- `ThumbnailCard` recebe `mimeType` e renderiza fallback direto para Word; `app/admin/editais/[id]/page.tsx` passa o MIME dos documentos/fotos.

VERIFICATION:
- RED: `npm test` falhou por `Cannot find module './edital-document-access'`.
- GREEN: `npm test` passou com 41 testes.
- Typecheck: `npx tsc --noEmit` terminou com exit 0.
- Lints IDE: sem erros nos arquivos alterados.

LIMITATIONS:
- Matriz manual admin adiada por nao haver ambiente descartavel autorizado com sessao admin e arquivos S3 nesta execucao.
- `npm test` e `npx tsc --noEmit` emitiram apenas o aviso local de npm sobre `devdir`.
