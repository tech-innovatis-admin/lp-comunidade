# Avaliação e ranking de propostas do Edital PPI

**Data:** 2026-07-27
**Status:** Aprovado para planejamento de implementação

## Contexto e motivação

As propostas submetidas ao Edital PPI (painel `/admin/editais`) hoje só têm dois estados visíveis para o time: enviada (`SUBMITTED`) ou rascunho. Não existe forma de registrar a avaliação interna do time, calcular uma nota final e organizar as propostas por classificação.

O edital define os critérios oficiais de avaliação (7 critérios, somando 100 pontos, nota mínima de aprovação 70 — ver seção "Critérios de avaliação"). Este projeto adiciona ao painel admin: uma forma de registrar essa avaliação manualmente por proposta, um ranking ordenado por nota, e a possibilidade de desqualificar uma proposta a qualquer momento (com motivo).

## Escopo

- **Dentro do escopo:** registro manual de avaliação (7 critérios + nota final calculada), edição da avaliação já registrada, desqualificação/reversão de desqualificação com motivo, reorganização da lista do painel em 3 abas (Sem avaliação / Ranking / Rejeitadas).
- **Fora do escopo:** múltiplos avaliadores com média automática; histórico de avaliações/desqualificações anteriores (edição sobrescreve o valor anterior); um status formal de "contemplada"/vencedora final (fica a critério do time, olhando o ranking); qualquer alteração em `lib/security-headers.ts`/`middleware.ts` ou no esquema de autenticação admin; propagação da nota para Google Sheets/n8n; busca/filtro/paginação nas listas (segue o padrão já estabelecido no painel).

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

- Botão **"Fazer avaliação"** (vira **"Editar avaliação"** quando já existe nota) abre um modal client-side com os 7 campos numéricos — cada um limitado ao máximo do seu critério — e soma em tempo real mostrando a nota final (0–100). Campo de texto **"Avaliado por"** (nome livre, já que o painel não tem login individual). Ao salvar: `POST` para a API, depois `router.refresh()` para atualizar a página server-rendered.
- Botão **"Desqualificar"** abre um modal com campo de motivo (obrigatório). Se a proposta já está desqualificada, o botão vira **"Reverter desqualificação"** — ação direta com confirmação, sem modal.
- Os dois botões ficam sempre visíveis, independente do estado atual: dá para desqualificar uma proposta sem nota ainda, e dá para avaliar uma proposta desqualificada (ela só sai da aba Rejeitadas revertendo a desqualificação).

## API routes (novas)

Todas protegidas pela mesma sessão admin (`verifyAdminSessionToken` + cookie `ADMIN_SESSION_COOKIE_NAME`, mesmo padrão de `/api/editais/documento/[id]/link`):

- `POST /api/admin/editais/[id]/avaliacao` — recebe `{ scores: Record<criterio, number>, evaluatedBy: string }`. Valida que todo código de critério esperado está presente, que cada valor é inteiro `>= 0` e `<=` o máximo daquele critério; calcula `evaluation_total_score` no servidor; faz upsert nas colunas de avaliação.
- `POST /api/admin/editais/[id]/desqualificar` — recebe `{ reason: string }`. Rejeita com 400 se `reason` vazio. Seta `disqualified_at`/`disqualified_reason`/`disqualified_by`.
- `POST /api/admin/editais/[id]/requalificar` — sem corpo. Limpa os 3 campos de desqualificação.

## Casos de borda e erros

- 401 se a sessão admin for inválida/ausente (igual às rotas existentes).
- 404 se o `id` da proposta não existir.
- 400 se alguma nota estiver fora do intervalo do critério, faltando, não-inteira, ou se o motivo de desqualificação vier vazio — validado no servidor, não só no client.
- 500 genérico logado no servidor para qualquer erro inesperado (mesmo padrão das rotas já existentes).
- Avaliar uma proposta já desqualificada é permitido (não bloqueia); desqualificar uma proposta já avaliada também é permitido e não apaga a nota.

## Testes

Sem suíte automatizada (convenção já estabelecida no projeto). Validação manual: registrar uma avaliação completa em uma proposta real (`edital_submissions.id = 1`, fixture já usada em testes anteriores), confirmar que ela aparece na aba Ranking com a nota certa; editar a avaliação e confirmar que atualiza; desqualificar com motivo e confirmar que sai de Ranking/Pendentes e aparece em Rejeitadas; reverter e confirmar que volta pro estado anterior (Ranking ou Pendentes, dependendo se tinha nota).
