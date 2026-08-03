# Landing Page InnovaNation

Este diretorio concentra a documentacao tecnica do sistema em producao.

## Visao atual

O projeto e uma aplicacao Next.js 15 para a comunidade InnovaNation, com:

- landing page publica e formulario de inscricao
- rota dedicada `/inscricao` como comunicado de pre-cadastro
- rota `/inscricao/formulario` para quem precisa concluir o cadastro antes do Edital
- armazenamento do documento de identidade no PostgreSQL como `BYTEA`
- sincronizacao com Google Sheets
- webhook N8N disparado apos a inscricao
- fluxo do Edital PPI com gate por CPF, wizard de proposta e painel admin

## Fluxos ativos

### Inscricao da comunidade

1. O usuario envia o formulario em `/api/inscricoes`
2. O backend valida CPF, email, origem, arquivo e termos ativos
3. O documento de identidade entra na mesma transacao do registro
4. A inscricao e exportada para Google Sheets e N8N como integracoes best-effort
5. O link do documento vai para `/acesso-documento/[id]`, que redireciona para o login do admin e depois para `/admin/editais?tab=pendentes`
6. A rota `/inscricao` apresenta o comunicado de pre-cadastro e leva a `/inscricao/formulario`
7. A rota `/inscricao/formulario` entrega o formulario e, ao concluir com sucesso, tenta liberar o Edital automaticamente

### Edital PPI

1. O usuario informa o CPF em `/edital`
2. O backend valida se o cadastro da comunidade esta confirmado
3. A aplicacao emite um token de sessao assinado para o wizard
4. O usuario preenche o rascunho, anexa documentos e envia a proposta
5. O time interno acompanha as propostas em `/admin/editais`

## O que ficou legado

- O fluxo de WhatsApp com convite unico nao faz parte do fluxo ativo
- As variaveis legadas de WhatsApp continuam no `env.example` apenas para compatibilidade historica
- A tabela `registration_invites` existe nas migrations antigas, mas nao deve ser usada para novos desenvolvimentos

## Arquivos principais

- [README.md](../README.md) - resumo do projeto
- [BACKEND.md](./BACKEND.md) - endpoints, schema e integracoes
- [DEPLOY.md](./DEPLOY.md) - operacao e deploy
- [SEGURANCA_JURIDICA.md](./SEGURANCA_JURIDICA.md) - prova juridica e integridade
- [VISUALIZACAO_DOCUMENTOS.md](./VISUALIZACAO_DOCUMENTOS.md) - documentos no Google Sheets
- [INDICE_DOCUMENTACAO.md](./INDICE_DOCUMENTACAO.md) - mapa dos documentos

## Comandos uteis

```powershell
npm run dev
npm run build
npm run lint
npm run migrate
```

## Regras de manutencao

- Sempre confirme o comportamento no codigo antes de alterar a documentacao
- Quando mudar fluxo, regra de negocio, autenticacao ou env, atualize o doc correspondente
- Nao reintroduza links ou parametros do fluxo WhatsApp legado sem decisao explicita
