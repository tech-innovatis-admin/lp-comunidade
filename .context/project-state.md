# Estado do projeto

Ultima revisao: 2026-09-11.
Base: checkout sobre `24d1778`, com alteracoes preexistentes nao commitadas.
Este documento nao certifica o estado de producao.

## Funcionalidades observadas

- Landing, pre-cadastro e formulario dedicado.
- Cadastro com documento PostgreSQL, termos e integracoes Sheets/n8n.
- Gate CPF, wizard com rascunho, anexos, fotos, PDFs e protocolo anual.
- Painel com avaliacao, ranking, desqualificacao e requalificacao.
- Auth legacy/Cognito e extensao local de broker central.

O README identifica o sistema como em producao. Nesta atividade nao houve
consulta ao ambiente publicado, banco real, S3, Sheets ou n8n.

## Trabalho local a preservar

No inicio ja havia mudancas em paginas admin, acesso a documentos, rotas auth,
handlers administrativos, `admin-auth.ts`, `authMode.ts`, `platforms-db.ts` e
manifests npm. Havia arquivos novos de sessao, OIDC central, introspeccao,
retorno seguro e testes de auth.

Esse conjunto pertence a trabalho anterior/em paralelo. Conclusao, integracao
e publicacao nao foram verificadas. Para retomar, confira `git status --short`,
`git diff` e os modulos de auth em [architecture.md](architecture.md).
Nao inferir que suporte a broker esta publicado.

## Atividade documental

Spec: [contexto para IA](specs/2026-09-11-contexto-ia.md).
Plano e evidencias: [implantacao do contexto](plans/2026-09-11-contexto-ia.md).
Status: concluida localmente, sem commit/deploy. Foram conferidos 14 arquivos
Markdown, 70 links locais e indices dos 25 documentos historicos, sem erros.
Build e testes da aplicacao nao executados nesta mudanca exclusivamente documental.

## Atividade atual do Edital

Spec implementada localmente: [documentos e divulgacao do Edital](specs/2026-09-11-edital-documentos-divulgacao.md).
Plano e evidencias: [implementacao](plans/2026-09-11-edital-documentos-divulgacao.md).
Status: codigo concluido localmente, sem deploy e sem aceite final. Foram
implementados DTOs allowlisted para contratos do Edital, politica PDF/DOC/DOCX,
anexos DOCX oficiais em `public/edital/`, upload documental ampliado,
normalizacao de IDs `BIGINT`, exclusao em rascunho com limpeza S3 best-effort,
downloads Word/fallback no admin, texto do item 7.3 e secao/modal do Edital na
home.

Verificacoes executadas em 2026-09-11: `npm test` passou com 41 testes;
`npx tsc --noEmit`, `npm run build` e `git diff --check` terminaram com exit 0.
As buscas `rg` exigidas nao encontraram links executaveis para PDFs antigos dos
anexos; a unica ocorrencia restante de `application/pdf` em
`app/components/edital` e deteccao de preview em `DocumentUploadSlot.tsx`.

Pendente antes do aceite final: fornecer e copiar
`public/edital/edital-ppi-2026.pdf`, validar esse asset e executar a matriz
manual em ambiente descartavel autorizado. As validacoes manuais de upload real,
exclusao/reload, propriedade/status, admin PDF/Word, modal por mouse/teclado e
CTA `/edital` ficaram diferidas. Nenhum banco, S3, webhook, migration ou deploy
foi executado nesta etapa.

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

As lacunas nao sao uma lista automaticamente autorizada de implementacoes.

## Atualizacao

Mantenha tarefa ativa com link, entregas, bloqueios comprovados e proximo passo.
Detalhes de execucao/comandos ficam no plano. Ao encerrar, remova indicacoes
transitorias que deixaram de valer e preserve historico no documento da tarefa.
