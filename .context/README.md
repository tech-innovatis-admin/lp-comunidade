# Contexto de desenvolvimento

Memoria versionada da InnovaNation. Comece por [AGENTS.md](../AGENTS.md) e
[project-state.md](project-state.md) em toda atividade.

| Documento | Uso |
| --- | --- |
| [architecture.md](architecture.md) | Estrutura, fluxos, dados e autenticacao |
| [project-state.md](project-state.md) | Estado observado, trabalho em curso e lacunas |
| [development.md](development.md) | Ambiente, comandos e verificacao |
| [specs/README.md](specs/README.md) | Requisitos e indice historico |
| [plans/README.md](plans/README.md) | Execucao, retomada e indice historico |

## Ciclo de trabalho

Leia o contexto base, selecione os documentos do assunto e confira o codigo.
Registre objetivo, criterios de aceite e plano antes de mudancas relevantes.
Atualize passos e decisoes durante a atividade. Ao concluir ou interromper,
registre evidencias e ponto de retomada.

Specs descrevem o que e por que; planos descrevem como, progresso e verificacao.
O estado e uma fotografia curta, nao um diario de conversas. Arquitetura descreve
codigo observado, nao promessas de planos futuros.

## Manutencao

- Use nomes `YYYY-MM-DD-assunto.md` e links relativos entre spec e plano.
- Specs: `rascunho`, `aprovada`, `implementada`, `substituida` ou `cancelada`.
- Planos: `planejado`, `em andamento`, `bloqueado`, `concluido` ou `cancelado`.
- Nao presuma aprovacao por existir documento. Registre origem do requisito e
  duvidas que alterem escopo. Nao marque historico como concluido sem evidencia.
- Atualize indices na mesma alteracao e indique documentos substituidos com links.
- Registre data e evidencia das afirmacoes. Nao armazene segredos, dumps,
  transcricoes extensas ou artefatos gerados aqui.

## Documentacao anterior

[MDs](../MDs/INDICE_DOCUMENTACAO.md) e [docs/superpowers](../docs/superpowers)
permanecem nos caminhos originais para preservar referencias. Os indices de
specs e planos catalogam esse historico; documentos novos ficam em `.context/`.

O [guia Cognito](../docs/AUTH_COGNITO_SSO.md) e anterior a extensao local de
broker. Confira estado e codigo antes de aplicar orientacoes historicas.
