# Instrucoes para agentes

Fonte principal de instrucoes para qualquer agente neste repositorio.
`CLAUDE.md` e `GEMINI.md` apenas apontam para este arquivo.
Responda em pt-BR, de forma objetiva, preservando o estilo dos arquivos.

## Antes de qualquer atividade

1. Leia este arquivo, [.context/README.md](.context/README.md) e
   [.context/project-state.md](.context/project-state.md), inclusive ao retomar trabalho.
2. Consulte [.context/architecture.md](.context/architecture.md) para localizar
   as camadas afetadas e [.context/development.md](.context/development.md) para comandos.
3. Localize e leia a spec e o plano relacionados nos indices de
   [specs](.context/specs/README.md) e [planos](.context/plans/README.md).
4. Confira `git status --short` e leia o codigo envolvido. Preserve alteracoes
   preexistentes e diferencie checkout local de versao publicada.
5. Se contexto e codigo divergirem, registre a divergencia e confirme a intencao
   na tarefa atual. Codigo comprova comportamento observado; specs podem descrever
   comportamento futuro. Nao execute planos historicos por iniciativa propria.

## Durante a atividade

- Para funcionalidades, contratos ou trabalho de varias etapas, registre spec e
  plano em `.context/specs/YYYY-MM-DD-assunto.md` e
  `.context/plans/YYYY-MM-DD-assunto.md`, usando os modelos desses diretorios.
- Para correcoes pequenas ou documentacao, use registro proporcional, sem exigir
  uma spec nova quando a existente ja contempla a tarefa.
- Mantenha decisoes, progresso e bloqueios no plano ativo, com link no estado do
  projeto para permitir retomada por outra IA.
- Prefira os padroes existentes: Next.js App Router, TypeScript estrito, alias
  `@/`, componentes em `app/components`, regras em `lib` e SQL parametrizado com `pg`.
- Mantenha banco, S3, segredos e autenticacao no servidor. Respeite a fronteira
  client/server dos componentes. Nao introduza frameworks sem necessidade da tarefa.
- Limite o diff ao escopo solicitado; nao reverta trabalho de outras atividades.

## Regras do dominio

- Inscricao e proposta do Edital sao fluxos distintos. Identidade fica no
  PostgreSQL (`BYTEA`); documentos do Edital ficam no S3.
- Preserve validacao de origem, payload, rate limit, honeypot, MIME, tamanho,
  assinatura binaria, hashes e evidencias de aceite dos termos.
- Preserve autorizacao administrativa (`edital-admin`) e propriedade dos
  documentos. Sessao do Edital nao substitui sessao administrativa.
- Reutilize `lib/edital-requirements.ts`, `lib/edital-completeness.ts` e
  `lib/edital-evaluation.ts` para regras compartilhadas entre UI e backend.
- Preserve transacoes, bloqueio de edicao apos envio e protocolo atomico.
- Sheets e n8n sao best-effort apos persistencia; nao declare entrega garantida
  nem reenvie eventos reais como teste casual.
- `registration_invites` e o antigo fluxo WhatsApp sao legado; nao os estenda.

## Banco e operacao

- Examine SQLs e executores antes de criar ou aplicar migrations: existem
  numeros duplicados e variantes. Nao execute todos em lote por suposicao.
- Para evoluir schema ja aplicado, crie nova migration e documente ordem,
  compatibilidade, verificacao e recuperacao. Confira o ultimo numero existente.
- Nao registre credenciais, tokens, CPFs ou dados pessoais reais no contexto,
  exemplos ou logs. Consulte exemplos de ambiente e consumidores sem exibir `.env` real.
- Deploy, migrations e integracoes externas so devem ser executados dentro do
  escopo autorizado e no ambiente correto.
- Nunca adicione trailer `Co-Authored-By: Claude` a commits.

## Antes de concluir

1. Execute verificacoes proporcionais a mudanca e registre comando, resultado e
   limitacoes. Nao declare teste/build sem execucao.
2. Atualize spec/plano e indices; atualize `.context/project-state.md` com estado,
   pendencias e proximo passo concretos.
3. Atualize arquitetura/desenvolvimento se rotas, contratos, dependencias,
   variaveis ou operacao mudaram, evitando detalhes duplicados.
4. Revise diff e links. Informe alteracoes, verificacoes e pendencias.
   Conclusao local nao significa deploy.

O contexto e versionado e acompanha a mudanca. Estas instrucoes independem de
plugins instalados. Se uma ferramenta sugerir outro destino para specs e planos,
use `.context/`, conforme a convencao deste projeto.
