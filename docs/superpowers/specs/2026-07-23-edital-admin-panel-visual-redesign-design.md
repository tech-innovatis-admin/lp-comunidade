# Redesign visual do painel admin + miniaturas reais de documentos

**Data:** 2026-07-23
**Status:** Aprovado para planejamento de implementação

## Contexto e motivação

O painel admin de propostas do Edital PPI (`/admin/editais`, `/admin/editais/[id]`) foi entregue na PR #10. Ao testar, o usuário pediu para deixar as páginas mais bonitas/organizadas e, principalmente, para os documentos aparecerem de verdade na tela — hoje eles só aparecem como um link de texto ("Abrir documento"), porque o CSP do site (`frame-src 'none'`, `img-src` sem o host do S3) bloqueia qualquer preview embutido apontando direto para o S3.

Este projeto resolve os dois pontos: redesenha a lista e o detalhe com um visual mais cuidado, organizado em blocos verticais por categoria (mesmo agrupamento mental do wizard original), e adiciona miniaturas reais de conteúdo (1ª página renderizada, para PDFs; a própria foto redimensionada, para fotos) — sem alterar o CSP global do site.

## Escopo

- **Dentro do escopo:** redesenho visual das duas páginas do painel admin já existentes; geração e cache de miniaturas reais (PDF → imagem da 1ª página; foto → versão redimensionada); fallback visual quando a geração falhar.
- **Fora do escopo:** qualquer mudança em `lib/security-headers.ts`/`middleware.ts` (CSP global); ações de escrita no painel (segue somente leitura); páginas de inscrições da comunidade (`registrations`) — continuam fora do painel admin; busca/filtro/paginação na lista.

## Geração de miniaturas

**Mecanismo:** sob demanda (lazy) na primeira visualização de cada documento pelo admin, com cache permanente no S3 depois disso.

- Nova rota `GET /api/editais/documento/[id]/thumbnail` (protegida pela mesma sessão admin de `lib/admin-auth.ts`, mesmo padrão de `/api/editais/documento/[id]/link`): busca o registro do documento; se `thumbnail_s3_key` já existe, baixa os bytes do S3 e serve diretamente (`Content-Type` de imagem, sem redirect — **isso é o que evita o problema de CSP**: a resposta vem do próprio domínio, satisfazendo `img-src 'self'` sem precisar allowlistar o S3). Se `thumbnail_s3_key` é nulo, gera na hora:
  - **PDF:** baixa o original do S3, renderiza a 1ª página como imagem via uma biblioteca de rasterização de PDF que não dependa de binário nativo compilado (compatibilidade com o build Docker Alpine/arm64 do projeto) — candidata principal: `pdf-to-img` (usa `pdfjs-dist` internamente, sem dependência nativa). **A primeira tarefa do plano de implementação deve validar que essa biblioteca de fato instala e roda no ambiente do projeto antes de seguir** — se não funcionar, o fallback é não gerar miniatura de PDF (cai direto no card genérico descrito abaixo), sem travar o resto da feature.
  - **Foto:** redimensiona a imagem original usando `sharp` (já é dependência do projeto — nenhuma biblioteca nova aqui).
  - Em ambos os casos: resultado comprimido/redimensionado (largura alvo ~400px, JPEG qualidade ~80), enviado ao S3 sob uma chave nova (`edital-submissions/{submissionId}/thumbnails/{documentId}.jpg` ou `community-certificates/{registrationId}-thumb.jpg` para o certificado), e a referência salva em `thumbnail_s3_key`.
- **Falha na geração** (PDF corrompido, biblioteca não suporta o arquivo, timeout, etc.): a rota retorna um erro controlado; o componente do card, no frontend, cai automaticamente para o card genérico com ícone (nunca quebra a página, nunca deixa um `<img>` com src inválido).
- Miniaturas de fotos e do certificado seguem o mesmo mecanismo — não são casos especiais.

## Modelo de dados

Migration nova, aditiva:

```sql
ALTER TABLE edital_submission_documents ADD COLUMN IF NOT EXISTS thumbnail_s3_key TEXT;
```

Nenhuma outra tabela muda. O certificado de inscrição (`registrations.community_certificate_s3_key`) precisa do mesmo tratamento — adicionar `registrations.community_certificate_thumbnail_s3_key TEXT` na mesma migration.

## Redesenho da lista (`/admin/editais`)

Cards em vez das linhas atuais, mantendo exatamente as mesmas 4 informações já exibidas (nome, instituição, status, data de envio) — sem adicionar busca, filtro ou paginação (fora de escopo). Nome em destaque, instituição como subtítulo, badge de status colorido, data formatada.

## Redesenho do detalhe (`/admin/editais/[id]`)

Blocos verticais, todos visíveis na mesma página (sem abas/acordeões), na ordem do wizard original:

1. **Cabeçalho** — nome, CPF, data de envio (mantém o que já existe hoje).
2. **Bloco Equipe** — descrição da equipe (texto) + miniaturas dos 4 documentos `8.1.1`–`8.1.4`.
3. **Bloco Instituição** — nome/CNPJ/laboratório/área (texto) + miniaturas dos 3 documentos `8.1.5`–`8.1.7`.
4. **Bloco Proposta** — justificativa técnica, resultados esperados, itens de orçamento (só texto, sem documento associado).
5. **Bloco Fotos** — grade de miniaturas reais das fotos do laboratório.
6. **Bloco Declarações** — miniaturas dos 2 documentos `8.1.15`–`8.1.16`.
7. **Bloco Certificado** — miniatura do certificado de inscrição na comunidade.

Cada miniatura é clicável e abre o documento original em nova aba, via a rota `/api/editais/documento/[id]/link` (ou `/api/editais/certificado/[registrationId]/link`) que já existe e já funciona hoje — isso não muda.

## Casos de borda e erros

- Geração de miniatura falha (qualquer motivo) → card genérico com ícone de documento/foto, sem quebrar a página.
- Documento não enviado (`requirement_code` sem registro) → mantém "Não enviado" como hoje; não tenta gerar/exibir miniatura.
- Certificado ainda não gerado para o cadastro → mesmo tratamento de "Não enviado"/estado ausente.

## Testes

Sem suíte automatizada (convenção já estabelecida no projeto). Validação manual: gerar miniatura de um PDF real e de uma foto real da submissão `#1` já existente, confirmar que a segunda visita usa o cache (mais rápida, sem regenerar), e forçar uma falha de geração (ex.: apontar pra um `s3_key` inválido temporariamente) pra confirmar que o fallback de card genérico funciona.
