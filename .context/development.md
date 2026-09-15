# Desenvolvimento e verificacao

Revisado em 2026-09-11. Fontes: `package.json`, CI, Docker e executores SQL.

## Ambiente

Use Node 20 e npm em alinhamento com CI/Docker; instale com `npm ci`.
Consulte `.env.example` e `env.example` e confira nomes no codigo consumidor.
Exemplos podem nao acompanhar alteracoes locais de auth. Valores devem ficar
no ambiente local, nunca no contexto ou em commits.

| Grupo | Consumidor / finalidade |
| --- | --- |
| `DB_*` | `lib/db.ts`, banco principal |
| `DATABASE_URL` | `run-migration.js`, executor SQL |
| `PLATFORMS_DB_*` | `platforms-db.ts`, usuarios compartilhados |
| `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_S3_BUCKET_NAME` | S3; conferir credenciais do ambiente AWS no helper |
| `GOOGLE_CREDENTIALS_S3_*`, `GOOGLE_SHEET_ID`, `GOOGLE_SHEET_NAME` | Sheets; alternativas em `google-sheets.ts` |
| `WEBHOOK_N8N_URL`, `WEBHOOK_N8N_EDITAL_URL` | Eventos da comunidade/Edital |

No workflow N8N do Edital, e-mails devem usar `protocolNumber` (ex.: `20260001`),
nao o campo `id` (ID interno da URL admin). O app ja envia ambos no webhook;
workflows antigos com `#{{ $json.id }}` divergem do painel de avaliacao.
| `PUBLIC_BASE_URL`, `APP_URL`, `APP_ORIGIN` | URL publica/retorno conforme consumidor |
| `EDITAL_TOKEN_SECRET`, `ADMIN_TOKEN_SECRET` | Sessoes separadas |
| `AUTH_MODE`, `COGNITO_*` | Modo de auth e Cognito |
| `CENTRAL_OIDC_*`, `SSO_BRIDGE_SECRET`, `AUTH_COOKIE_SECURE` | Broker local; conferir `centralOidc.ts` |
| `HEALTHCHECK_TOKEN` | Health check |

## Comandos

| Comando | Comportamento / limite |
| --- | --- |
| `npm ci` | Instala conforme lockfile |
| `npm run dev` | Turbopack em `http://localhost:3003` |
| `npm run build` | Next build e postbuild do runtime standalone |
| `npm start` | `next start`; porta depende de `PORT`/padrao Next, nao fixa 3003 |
| `npm test` | `tsx --test lib/*.test.ts lib/*.test.mjs`; cobre auth, DTOs, politica documental, IDs de banco e acesso documental |
| `npx tsc --noEmit` | Tipos, com dependencias instaladas |
| `npm run lint` | Aponta para `next lint`; funcionamento precisa ser verificado |
| `npm run migrate` | Lista fixa de `run-migration.js`; altera banco |
| `npm run update-term-v1.0` | Atualiza termo via script TS; altera banco |

Nao ha configuracao ESLint versionada no inventario revisado. Nao use o script
de lint como evidencia sem verificar seu funcionamento.

## Verificacao proporcional

- Documentacao: caminhos/links, coerencia com codigo e `git diff --check`.
- TypeScript/backend: `npm test`, tipos/build e testes relevantes; diferencie
  falhas preexistentes das introduzidas pela tarefa.
- Auth: `npm test` e modos afetados em ambiente de teste, incluindo acesso
  negado, sessao expirada/revogada e destinos de retorno.
- UI: desktop/mobile, navegacao, erros, loading e fluxo afetado.
- Inscricao/Edital: entrada invalida, duplicidade, arquivo rejeitado, token
  expirado, propriedade dos documentos, retomada e reenvio apos submissao.
- Schema: banco descartavel compativel, sequencia revisada e validacao de
  leitura/escrita e recuperacao.

Scripts `test-webhook.js`, `test-edital-token.ts`, `test-edital-proposta-pdf.ts`
e similares em `scripts/` nao formam uma suite unica. Leia antes de executar:
podem exigir banco, rede, dados ou disparar eventos externos.

## Migrations

Ha variantes com prefixos `001`, `004` e `008`. `run-migration.js` lista arquivos
de 008 a 013 e nao inclui a 014. `scripts/migrate.sh` percorre todos os SQLs;
isso nao comprova que possam ser aplicados juntos ou repetidamente.

Confira schema alvo, dependencias, dados afetados e recuperacao antes de executar.
Nao rode migrations para validar documentacao. Consulte
[banco](../MDs/INSTRUCOES_BANCO.md) e [execucao](../MDs/EXECUTAR_MIGRATION.md)
junto dos SQLs. Nao confunda setup inicial e atualizacao incremental.

## CI e deploy

GitHub Actions executa `npm ci` e `npm run build` em push/PR para `develop` e
`main`, sem `npm test`. Jenkins instala e compila; SonarQube e Quality Gate
estao comentados por capacidade de memoria da VPS. O template de PR nao
comprova que testes/analise tenham sido executados pelo pipeline.

Docker usa Node 20 Alpine, usuario nao-root e servidor standalone em 3001.
Compose solicita `linux/arm64`. `scripts/fix-standalone-runtime.cjs` participa
do postbuild; preserve-o ao alterar empacotamento de dependencias/PDFs.

Consulte [deploy](../MDs/DEPLOY.md), [Nginx/PDF](../MDs/NGINX_PDFS.md) e
[PowerShell](../ps1/README.md). Confira variaveis repassadas pelo deploy real:
compose nao necessariamente contempla toda a autenticacao atual. Host e producao
nao foram verificados nesta revisao documental.
