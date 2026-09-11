# Contexto para desenvolvimento com IA

Data: 2026-09-11
Status: implementada
Origem: solicitacao do usuario nesta atividade.
Plano: [implantacao](../plans/2026-09-11-contexto-ia.md).

## Objetivo

Centralizar instrucoes em AGENTS.md e fornecer memoria versionada para que
agentes consultem o contexto antes de cada atividade e o mantenham atualizado.

## Escopo e decisoes

- AGENTS.md como entrada comum; CLAUDE.md e GEMINI.md como referencias curtas.
- `.context/` com indice, arquitetura, desenvolvimento e estado observado.
- Diretorios de specs e planos com modelos, indices e documentos desta tarefa.
- Historico de `docs/superpowers/` indexado nos caminhos existentes para preservar
  referencias no codigo e na documentacao. Novos documentos ficam em `.context/`.
- README aponta para as novas entradas. Nao altera comportamento da aplicacao,
  dependencias, banco ou deploy. Preserva mudancas locais de auth.

## Aceite

1. Ambos os arquivos de agentes apontam para AGENTS.md sem regras duplicadas.
2. AGENTS.md exige consulta inicial e atualizacao ao concluir/retomar tarefas.
3. Contexto descreve camadas e fluxos reais com referencias ao codigo.
4. Estado diferencia codigo local, pendencias observadas e producao nao verificada.
5. Todos os 14 documentos de specs e 11 planos historicos estao indexados.
6. Modelos orientam criterios de aceite, passos, decisoes e evidencias de validacao.
7. Links locais resolvem e o diff documental nao tem erros de whitespace.

## Limites

Consulta obrigatoria e uma instrucao para os agentes, nao um mecanismo de
execucao automatica. Nenhum hook ou plugin foi introduzido. Nao e auditoria
de seguranca nem certificacao funcional de todo o sistema.
