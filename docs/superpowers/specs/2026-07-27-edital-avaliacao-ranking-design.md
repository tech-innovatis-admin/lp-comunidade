# Avaliação e ranking de propostas do Edital PPI

**Data:** 2026-07-27
**Status:** Aprovado para planejamento de implementação

## Contexto e motivação

As propostas submetidas ao Edital PPI (painel `/admin/editais`) hoje só têm dois estados visíveis para o time: enviada (`SUBMITTED`) ou rascunho. Não existe forma de registrar a avaliação interna do time, calcular uma nota final e organizar as propostas por classificação.

O edital define os critérios oficiais de avaliação (7 critérios, somando 100 pontos, nota mínima de aprovação 70 — ver seção "Critérios de avaliação"). Este projeto adiciona ao painel admin: uma forma de registrar essa avaliação manualmente por proposta, um ranking ordenado por nota, e a possibilidade de desqualificar uma proposta a qualquer momento (com motivo).

Junto com isso, o login do painel deixa de usar a senha única compartilhada (`ADMIN_PASSWORD`, placeholder documentado em `CLAUDE.md`) e passa a autenticar contra a tabela `users` do sistema de plataformas da Innovatis (mesmo RDS, database `nexus`) — o que também permite saber *quem* avaliou/desqualificou cada proposta, em vez de um campo de texto livre.

## Escopo

- **Dentro do escopo:** registro manual de avaliação (7 critérios + nota final calculada), edição da avaliação já registrada, desqualificação/reversão de desqualificação com motivo, reorganização da lista do painel em 3 abas (Sem avaliação / Ranking / Rejeitadas), substituição do login por senha única por login individual via a tabela `users` compartilhada (com a tag `edital-admin` controlando acesso a este painel).
- **Fora do escopo:** múltiplos avaliadores com média automática; histórico de avaliações/desqualificações anteriores (edição sobrescreve o valor anterior); um status formal de "contemplada"/vencedora final (fica a critério do time, olhando o ranking); qualquer alteração em `lib/security-headers.ts`/`middleware.ts`; propagação da nota para Google Sheets/n8n; busca/filtro/paginação nas listas (segue o padrão já estabelecido no painel); qualquer tela de administração da tabela `users`/tags de plataforma — quem recebe a tag `edital-admin` é gerenciado fora deste projeto, direto no banco compartilhado.

## Critérios de avaliação

Constante compartilhada em `lib/edital-evaluation.ts` (mesmo padrão de `EDITAL_STEP_BY_DOCUMENT_CODE` em `lib/edital-completeness.ts`):

| Código | Critério | Pontuação máxima |
|---|---|---|
| `clareza_diagnostico` | Clareza do diagnóstico e da necessidade apresentada | 15 |
| `potencial_impacto` | Potencial de impacto acadêmico, educacional, social, tecnológico ou institucional | 20 |
| `viabilidade_tecnica` | Viabilidade técnica, operacional e financeira da proposta | 20 |
| `coerencia_plano` | Coerência do Plano de Aplicação dos recursos | 20 |
| `sustentabilidade` | Sustentabilidade da melhoria após o patrocínio | 10 |
| `potencial_visibilidade` | Potencial de visibilidade institucional e qualidade da contrapartida de divulgação | 10 |
| `aderencia_missao` | Aderência à missão, valores e áreas de atuação da Innovatis | 5 |

Soma máxima: 100. Nota mínima de aprovação conforme o edital: 70 (usada apenas como indicador visual no ranking — a aprovação final não é automática, ver "Fora do escopo").

## Modelo de dados

Migration nova (`012_add_edital_evaluation.sql`), aditiva, sem alterar `status` (continua `DRAFT`/`SUBMITTED` — outras partes do sistema, como o lock de edição em `rascunho`, dependem desse valor permanecer como está):

```sql
ALTER TABLE edital_submissions ADD COLUMN IF NOT EXISTS evaluation_scores JSONB;
ALTER TABLE edital_submissions ADD COLUMN IF NOT EXISTS evaluation_total_score SMALLINT;
ALTER TABLE edital_submissions ADD COLUMN IF NOT EXISTS evaluated_by VARCHAR(255);
ALTER TABLE edital_submissions ADD COLUMN IF NOT EXISTS evaluated_at TIMESTAMPTZ;
ALTER TABLE edital_submissions ADD COLUMN IF NOT EXISTS disqualified_at TIMESTAMPTZ;
ALTER TABLE edital_submissions ADD COLUMN IF NOT EXISTS disqualified_reason TEXT;
ALTER TABLE edital_submissions ADD COLUMN IF NOT EXISTS disqualified_by VARCHAR(255);

CREATE INDEX IF NOT EXISTS idx_edital_submissions_evaluation_total_score ON edital_submissions(evaluation_total_score);
CREATE INDEX IF NOT EXISTS idx_edital_submissions_disqualified_at ON edital_submissions(disqualified_at);
```

- `evaluation_scores`: objeto JSON com uma chave por critério (códigos da tabela acima) e o valor inteiro atribuído.
- `evaluation_total_score`: soma dos valores de `evaluation_scores`, persistida à parte para permitir `ORDER BY` sem calcular o JSONB — calculada e validada no servidor a cada gravação, nunca confiada ao cliente.
- Desqualificação é reversível: "reverter" limpa `disqualified_at`/`disqualified_reason`/`disqualified_by`, sem manter histórico da desqualificação anterior.

A aba de cada proposta é **derivada** dessas colunas, não um novo valor de `status`:

- **Sem avaliação**: `status = 'SUBMITTED' AND disqualified_at IS NULL AND evaluation_total_score IS NULL`
- **Ranking**: `status = 'SUBMITTED' AND disqualified_at IS NULL AND evaluation_total_score IS NOT NULL`, ordenado por `evaluation_total_score DESC`
- **Rejeitadas**: `disqualified_at IS NOT NULL` (independente de ter nota ou não)

## Lista (`/admin/editais`) com abas

Três abas via query string: `/admin/editais?tab=pendentes|ranking|rejeitadas` (Server Component, mesmo padrão já usado hoje — sem estado client-side, URL compartilhável, botão voltar funciona). Aba padrão: `pendentes`.

- **Pendentes**: mesma listagem/visual de hoje (nome, instituição, data de envio).
- **Ranking**: mesma linha + posição (`#1`, `#2`, ...) + nota final, com badge verde quando `evaluation_total_score >= 70` e badge neutro abaixo disso — só indicador visual, sem decisão automática de aprovação.
- **Rejeitadas**: mesma linha + motivo da desqualificação (truncado) + data da desqualificação.

Cada aba usa uma query própria (mesma base com `INNER JOIN registrations`, `WHERE` diferente).

## Página de detalhe (`/admin/editais/[id]`)

- Botão **"Fazer avaliação"** (vira **"Editar avaliação"** quando já existe nota) abre um modal client-side com os 7 campos numéricos — cada um limitado ao máximo do seu critério — e soma em tempo real mostrando a nota final (0–100). Sem campo de "avaliado por": o nome vem da sessão logada (ver seção de login abaixo). Ao salvar: `POST` para a API, depois `router.refresh()` para atualizar a página server-rendered.
- Botão **"Desqualificar"** abre um modal com campo de motivo (obrigatório). Se a proposta já está desqualificada, o botão vira **"Reverter desqualificação"** — ação direta com confirmação, sem modal.
- Os dois botões ficam sempre visíveis, independente do estado atual: dá para desqualificar uma proposta sem nota ainda, e dá para avaliar uma proposta desqualificada (ela só sai da aba Rejeitadas revertendo a desqualificação).

## Login individual via tabela `users` compartilhada

Substitui o esquema de senha única (`lib/admin-auth.ts` + `ADMIN_PASSWORD`) descrito como placeholder em `CLAUDE.md`.

**Banco compartilhado:** mesmo RDS do projeto, database `nexus`, tabela `users` — já usada por outras plataformas Innovatis (`innovacoin`, `financeiro`, `powerbi`, etc.). Colunas relevantes: `username`, `email`, `name`, `hash` (senha em bcrypt, formato `$2b$12$...`), `platforms` (array de tags de acesso). Acesso via um novo `Pool` dedicado, `lib/platforms-db.ts` (mesmo padrão de `lib/db.ts`), configurado pelas variáveis `PLATFORMS_DB_HOST/PORT/NAME/USER/PASSWORD/SSL` (já adicionadas em `.env`/`env.example`). Conexão **somente leitura** — este projeto nunca escreve na tabela `users`; quem recebe a tag `edital-admin` é gerenciado fora daqui.

**Login (`POST /api/admin/login`, reescrita):**
1. Recebe `{ username, password }`.
2. Mesmas proteções já existentes: rate limit (5/15min), checagem de origem confiável.
3. Busca em `users` por `username` (case-insensitive).
4. Se não encontrado, ou `platforms` não contém `'edital-admin'`, ou `bcrypt.compare(password, hash)` falha → `401` genérico ("credenciais inválidas ou sem acesso"), sem indicar qual dessas falhou (evita enumeração de usuários).
5. Em caso de sucesso, cria o token de sessão carregando identidade: `{ userId, username, name }`.

Nova dependência: `bcryptjs` (implementação pura em JS, sem binário nativo — mesmo motivo da escolha de `pdf-to-img` sobre alternativas com dependência nativa: compatibilidade com o build Docker Alpine/arm64 do projeto).

**Token de sessão (`lib/admin-auth.ts`, modificado):**
- `createAdminSessionToken(payload: { userId, username, name })` — assina `payload + expiresAt` com HMAC-SHA256 (mesmo mecanismo atual, `ADMIN_TOKEN_SECRET`), sem mudar TTL (7 dias).
- `verifyAdminSessionToken(token)` passa a retornar `{ userId, username, name } | null` em vez de `boolean`. Continua **síncrona** (a identidade já vem embutida e assinada no token — não há consulta ao banco a cada request, só na hora do login), então não é necessário tornar nenhum call site `async` só por causa desta mudança.
- Todo call site que hoje faz `if (!verifyAdminSessionToken(token)) { redirect/401 }` precisa trocar para checar `null` e, onde fizer sentido, usar o `name` retornado: `app/admin/editais/page.tsx`, `app/admin/editais/[id]/page.tsx`, `app/api/editais/documento/[id]/link/route.ts`, `app/api/editais/certificado/[registrationId]/link/route.ts`, `app/api/editais/documento/[id]/thumbnail/route.ts`, `app/api/editais/certificado/[registrationId]/thumbnail/route.ts`, além das novas rotas de avaliação/desqualificação abaixo.

**Página de login (`app/admin/login/page.tsx`):** ganha um campo "Usuário" antes do campo de senha existente.

**Remoção:** `ADMIN_PASSWORD` é removida do `.env`, `env.example` e de qualquer verificação no código — não fica como fallback. Sessões antigas (token no formato booleano) deixam de validar automaticamente, já que o formato do payload mudou; qualquer um com sessão ativa precisa logar de novo uma vez.

## API routes (novas)

Todas protegidas pela mesma sessão admin (`verifyAdminSessionToken` + cookie `ADMIN_SESSION_COOKIE_NAME`, mesmo padrão de `/api/editais/documento/[id]/link`), agora usando a identidade retornada da sessão para preencher `evaluated_by`/`disqualified_by` — nenhuma delas recebe mais esse dado do corpo da requisição:

- `POST /api/admin/editais/[id]/avaliacao` — recebe `{ scores: Record<criterio, number> }`. Valida que todo código de critério esperado está presente, que cada valor é inteiro `>= 0` e `<=` o máximo daquele critério; calcula `evaluation_total_score` no servidor; faz upsert nas colunas de avaliação, gravando `evaluated_by = session.name`.
- `POST /api/admin/editais/[id]/desqualificar` — recebe `{ reason: string }`. Rejeita com 400 se `reason` vazio. Seta `disqualified_at`/`disqualified_reason`/`disqualified_by = session.name`.
- `POST /api/admin/editais/[id]/requalificar` — sem corpo. Limpa os 3 campos de desqualificação.

## Casos de borda e erros

- 401 se a sessão admin for inválida/ausente (igual às rotas existentes).
- 404 se o `id` da proposta não existir.
- 400 se alguma nota estiver fora do intervalo do critério, faltando, não-inteira, ou se o motivo de desqualificação vier vazio — validado no servidor, não só no client.
- 500 genérico logado no servidor para qualquer erro inesperado (mesmo padrão das rotas já existentes).
- Avaliar uma proposta já desqualificada é permitido (não bloqueia); desqualificar uma proposta já avaliada também é permitido e não apaga a nota.
- Login: usuário inexistente, senha errada, ou usuário válido sem a tag `edital-admin` em `platforms` → mesmo erro 401 genérico, sem distinguir o motivo.
- Banco de plataformas (`PLATFORMS_DB_*`) inacessível no momento do login → 500 tratado (mensagem genérica de erro, sem detalhe técnico exposto ao usuário), logado no servidor como as demais falhas de banco.

## Testes

Sem suíte automatizada (convenção já estabelecida no projeto). Validação manual: logar com um usuário real que tenha a tag `edital-admin` (adicionada manualmente à `platforms` durante o teste) e confirmar que usuários sem a tag são recusados; registrar uma avaliação completa em uma proposta real (`edital_submissions.id = 1`, fixture já usada em testes anteriores), confirmar que ela aparece na aba Ranking com a nota certa e o `evaluated_by` correto; editar a avaliação e confirmar que atualiza; desqualificar com motivo e confirmar que sai de Ranking/Pendentes e aparece em Rejeitadas; reverter e confirmar que volta pro estado anterior (Ranking ou Pendentes, dependendo se tinha nota).
