# Estado do projeto

Ultima revisao: 2026-09-15.
Base: checkout local com alteracoes preexistentes de auth/broker e desta
atividade de upload/admin. Este documento nao certifica o estado de producao.

## Funcionalidades observadas

- Landing, pre-cadastro e formulario dedicado.
- Cadastro com documento PostgreSQL, termos e integracoes Sheets/n8n.
- Gate CPF, wizard com rascunho, anexos, fotos, PDFs e protocolo anual.
- Painel com avaliacao, ranking, desqualificacao e requalificacao.
- Auth legacy/Cognito e extensao local de broker central.

O README identifica o sistema como em producao. Nesta atividade nao houve
consulta ao ambiente publicado, banco real, S3, Sheets ou n8n.

## Trabalho local a preservar

Alteracoes paralelas de auth/broker (paginas admin, acesso a documentos, rotas
auth, OIDC central, introspeccao, sessao) permanecem no working tree. Nao
inferir que suporte a broker esta publicado.

## Atividade atual

Spec: [upload documental e painel admin](specs/2026-09-15-edital-upload-admin-preview.md).
Plano: [implementacao](plans/2026-09-15-edital-upload-admin-preview.md).
Status: commitado e publicado em producao (`landingpage:1.1.9`).

Entregas:
- Documentais aceitam PDF/DOC/DOCX/JPG/PNG/WEBP com assinatura binaria.
- Lock global de upload no wizard + compressao client-side de imagens.
- Admin detalhe com layout mais amplo, captions e ThumbnailCard aprimorado.

Verificacao 2026-09-15: `npm test` — 43 testes, exit 0.
Deploy 2026-09-15: imagem `1.1.9` no ECR; container em `127.0.0.1:3001`
(nginx comunidade); health/home/edital HTTP 200. DBEM restaurado em `:3002`
apos conflito de porta no recreate.

Atividade anterior de divulgacao (docs/home/gate 6h) permanece no historico
de [2026-09-11](specs/2026-09-11-edital-documentos-divulgacao.md). Assets em
`public/edital/`: `edital-ppi-2026.pdf` + anexos DOCX; termo ainda fora.

## Lacunas por inspecao

| Ponto | Evidencia | Proximo passo quando entrar no escopo |
| --- | --- | --- |
| Migration 014 fora do executor npm | Lista em `run-migration.js` termina na 013 | Conferir schema alvo e aplicacao |
| SQLs com numeros repetidos/variantes | Prefixos 001, 004 e 008 | Definir sequencia antes de automatizar |
| Testes automatizados parciais | `npm test` cobre auth, DTOs, politica de documentos, IDs e acesso documental | Ampliar conforme novas tarefas |
| CI sem testes | `.github/workflows/ci.yml` | Integrar suite quando solicitado |
| Sonar/Quality Gate pausados | `Jenkinsfile` | Validar capacidade antes de reativar |
| Guia Cognito anterior ao broker | Guia vs `authMode.ts` | Atualizar contrato ao concluir auth |
| Lint precisa de verificacao | `next lint`, sem config versionada | Verificar comando em tarefa propria |

## Proximo passo

N8N: garantir workflow de producao usando `protocolNumber` (nao `id`).
Monitorar health do container se Docker marcar unhealthy apesar do `/api/health` 200.
