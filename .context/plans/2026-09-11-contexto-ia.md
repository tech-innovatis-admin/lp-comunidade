# Plano: contexto para desenvolvimento com IA

Data: 2026-09-11
Status: concluido
Spec: [requisitos](../specs/2026-09-11-contexto-ia.md).
Objetivo: criar instrucoes comuns e contexto versionado consultavel por qualquer IA.

## Arquitetura e restricoes

Markdown local sem dependencias novas. Entrada em AGENTS.md, referencias curtas
em CLAUDE.md/GEMINI.md, contexto por assunto e historico indexado sem mover arquivos.
Preservar alteracoes preexistentes de auth, rotas e manifests. Nenhuma operacao
em banco, integracao externa ou deploy faz parte desta atividade.

## Etapas

- [x] Inventariar arquivos e ler instrucoes/documentacao existentes.
- [x] Conferir rotas, helpers, SQL, manifests, CI e deploy para contexto factual.
- [x] Criar AGENTS.md e referencias curtas de Claude/Gemini.
- [x] Criar indice, arquitetura, desenvolvimento e estado em `.context/`.
- [x] Catalogar specs/planos historicos e criar modelos e documentos desta tarefa.
- [x] Adicionar entradas ao README.
- [x] Conferir todos os links locais, cobertura dos indices e diff documental.
- [x] Registrar evidencias e encerrar estado/spec/plano.

## Verificacoes

Inspecao confirma npm test limitado a auth central, CI apenas com build,
executor de migrations sem 014 e mudancas locais de SSO preexistentes.

Em 2026-09-11:

- `git diff --check -- AGENTS.md CLAUDE.md GEMINI.md README.md .context`: exit 0.
- Checagem local com Node (`node -e`, fs/path): 14 arquivos Markdown, 70 links
  locais existentes, 14 specs e 11 planos historicos indexados; exit 0.
- A mesma checagem conferiu referencias de Claude/Gemini para AGENTS.md e
  whitespace inclusive nos arquivos novos ainda nao rastreados.
- `git status --short`: alteracoes desta atividade limitadas a documentacao;
  trabalho preexistente de autenticacao permanece no checkout.
- Build, testes da aplicacao e servicos externos nao executados: escopo documental.

## Retomada

Documentacao concluida localmente, sem commit ou deploy nesta atividade.
Na proxima tarefa, consultar AGENTS.md e o estado do projeto; criar ou selecionar
spec/plano do assunto. Pendencias de auth e operacao permanecem no estado do projeto.
