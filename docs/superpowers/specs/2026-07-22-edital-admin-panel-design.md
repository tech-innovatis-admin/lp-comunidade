# Painel admin para propostas do Edital PPI

**Data:** 2026-07-22
**Status:** Aprovado para planejamento de implementação

## Contexto e motivação

O time interno hoje revisa propostas enviadas ao Edital PPI (`edital_submissions`) através da planilha do Google Sheets (aba `PROPOSTAS`), clicando em links individuais por documento. Esses links apontam para duas rotas de redirecionamento **públicas, sem autenticação** (`GET /api/editais/documento/[id]/link` e `GET /api/editais/certificado/[registrationId]/link`), protegidas hoje só pela obscuridade do ID numérico.

Este projeto cria uma rota `/admin` dedicada para listar e revisar propostas, e usa essa mesma entrega para fechar a lacuna de autenticação: as duas rotas de link acima passam a exigir uma sessão admin válida.

## Escopo

- **Dentro do escopo:** listagem e visualização detalhada de propostas do Edital PPI (`edital_submissions` com `status = 'SUBMITTED'`), com documentos e fotos em preview inline. Autenticação por senha única compartilhada (placeholder).
- **Fora do escopo:** inscrições da comunidade InnovaNation (`registrations`) — não entram nesta rota admin. Ações de escrita (aprovar/rejeitar/observações) — a rota é somente leitura por enquanto. Integração com o sistema de usuários/tags ("hub de plataformas") que a Innovatis já tem — fica para uma iteração futura; esta entrega usa um placeholder isolado, projetado para ser substituído sem alterar o resto do admin.

## Autenticação (placeholder)

- Nova env var `ADMIN_PASSWORD` (senha única, compartilhada pelo time).
- `lib/admin-auth.ts`: `createAdminSessionToken()` / `verifyAdminSessionToken(token)`. Mesmo esquema de `lib/edital-auth.ts` — token HMAC-SHA256 assinado com `crypto.createHmac`, formato `payload.assinatura` em base64url, TTL de 7 dias (`iat`/`exp` no payload), verificação em tempo constante (`crypto.timingSafeEqual`). Precisa de uma env var de segredo própria (`ADMIN_TOKEN_SECRET`), com o mesmo fallback de desenvolvimento inseguro + aviso no console que `edital-auth.ts` já usa (nunca em produção sem a env var setada).
- `POST /api/admin/login`: recebe `{ password }`, compara com `ADMIN_PASSWORD` via `crypto.timingSafeEqual` (nunca `===`, para evitar timing attack), aplica `enforceRateLimit` (mesmo helper de `lib/security.ts`) e `isTrustedOrigin`. Em caso de sucesso, seta cookie `httpOnly`, `secure` (fora de dev), `sameSite=lax`, `maxAge` de 7 dias, contendo o token assinado.
- `POST /api/admin/logout`: limpa o cookie.
- **Sem alteração em `middleware.ts`** — decisão tomada durante o brainstorming: o middleware roda em runtime Edge (só usa `crypto.randomUUID()`), e a verificação HMAC precisa do módulo `crypto` do Node, que não está disponível ali por padrão. Em vez disso, cada página/rota protegida verifica a sessão diretamente, lendo o cookie via `next/headers` (Server Components) ou via `request.cookies` (API routes) — mesmo runtime Node que as demais API routes do projeto já usam.
- Isolamento para troca futura: **todo** ponto do admin que precisa checar autenticação chama só `verifyAdminSessionToken()`. Quando a integração com o hub de plataformas (banco de usuários + tag "edital") estiver pronta, a troca é: reimplementar o conteúdo dessa função e do fluxo de login — nenhuma outra parte do código (páginas, rotas de documento) muda.

## Rotas e páginas

Todas as páginas abaixo são **React Server Components** que consultam o Postgres diretamente via `lib/db.ts` (sem API JSON intermediária para leitura de dados) — decisão tomada no brainstorming, priorizando menos código para uma ferramenta interna somente leitura, mesmo sendo diferente do padrão client-component + fetch usado no resto do projeto.

- **`app/admin/login/page.tsx`** — formulário de senha (client component, chama `POST /api/admin/login`).
- **`app/admin/editais/page.tsx`** — verifica sessão (sem sessão válida → `redirect('/admin/login')`); lista propostas com `status = 'SUBMITTED'`, mostrando nome do responsável, instituição, status e data de envio (join `edital_submissions` + `registrations`). Cada linha linka para `/admin/editais/[id]`.
- **`app/admin/editais/[id]/page.tsx`** — mesma checagem de sessão; carrega a submissão completa (todos os campos do wizard: equipe, instituição, laboratório, orçamento, justificativa técnica, resultados esperados) e os documentos/fotos associados (`edital_submission_documents`). Documentos não-foto são exibidos com preview inline via `<iframe>` apontando para `/api/editais/documento/[id]/link` (visualizador nativo do navegador para PDF); fotos aparecem como grade de miniaturas usando a mesma rota. Requisitos sem documento enviado mostram "Não enviado" em vez de link.

## Rotas de documento — mudança de autenticação

`GET /api/editais/documento/[id]/link` e `GET /api/editais/certificado/[registrationId]/link` passam a chamar `verifyAdminSessionToken()` antes de gerar a URL assinada e redirecionar; sem sessão válida, retornam 401. Isso significa que um link colado na planilha do Google Sheets só abre o documento se quem clicar já estiver logado no admin, no mesmo navegador (cookie compartilhado) — comportamento esperado e intencional.

## Casos de borda e erros

- Sessão expirada (TTL de 7 dias) em qualquer página/rota admin → redireciona para `/admin/login` (páginas) ou 401 (rotas de documento).
- Senha incorreta no login → mensagem de erro genérica (não revela se o problema é rate limit vs. senha errada, mesmo padrão de outras rotas do projeto), com rate limit para conter tentativas de força bruta contra a senha única.
- Propostas em `status = 'DRAFT'` (nunca enviadas) não aparecem na listagem — o time revisa apenas o que foi de fato submetido.
- Documento/foto ausente na tela de detalhe → mostra "Não enviado" em vez de tentar montar um link quebrado.

## Testes

Sem suíte de testes automatizados no projeto. Validação manual pelo navegador: login com senha correta/incorreta, listagem, e detalhe usando a submissão real já existente (`edital_submissions.id = 1`, `registration_id = 23`) como caso de teste — mesma abordagem usada para validar o restante do fluxo do Edital nesta mesma sessão de trabalho.

## Fora de escopo explícito (para não confundir com trabalho futuro)

- Rota admin para `registrations` (inscrições da comunidade) — não faz parte desta entrega.
- Qualquer ação de escrita (aprovar, rejeitar, comentar) na proposta.
- Integração real com o hub de plataformas / sistema de tags — só o placeholder isolado descrito acima.
