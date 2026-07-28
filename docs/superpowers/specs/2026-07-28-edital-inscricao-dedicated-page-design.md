# Cadastro dedicado do Edital - Spec

> **Objetivo:** criar uma página dedicada para o cadastro da comunidade e, após o envio bem-sucedido, redirecionar automaticamente a pessoa para o fluxo do Edital PPI.

**Status:** rascunho para revisão

## Problema

Hoje, quando o CPF informado em `/edital` nao encontra uma inscricao confirmada, o usuario recebe um botao que o leva de volta para a pagina principal. Isso interrompe o fluxo e obriga a pessoa a localizar o formulario manualmente.

O comportamento desejado e:

1. o usuario entra em `/edital`
2. o CPF nao e encontrado
3. o botao leva para uma pagina dedicada de cadastro
4. depois que o cadastro for enviado com sucesso, o sistema valida o CPF novamente
5. se a inscricao estiver confirmada, o usuario e levado direto para `/edital/proposta`

## Objetivo funcional

Reduzir a friccao entre “nao esta cadastrado” e “ja pode enviar a proposta”.

O fluxo precisa ficar encadeado, sem depender da pessoa voltar para a home para encontrar o formulario.

## Solucao proposta

### Rota dedicada de cadastro

Criar uma rota publica, por exemplo `/inscricao`, que renderiza o mesmo formulario atualmente usado na home.

Essa pagina deve:

- reaproveitar o formulario existente
- manter o mesmo comportamento de validacao e submissao
- deixar claro que o objetivo ali e concluir o cadastro para acessar o Edital

### Handoff automatico para o Edital

Ao concluir o cadastro com sucesso na pagina dedicada, o frontend deve:

1. capturar o CPF usado no formulario
2. chamar o endpoint `POST /api/editais/validar-cpf`
3. armazenar a sessao do Edital com o token retornado
4. redirecionar para `/edital/proposta`

Se a validacao do CPF falhar por algum motivo operacional apos o cadastro, a pessoa nao deve perder o envio ja realizado. Nesse caso, a tela precisa mostrar uma saida clara para:

- tentar validar novamente
- voltar para `/edital`

## Arquivos afetados

### Novos

- `app/inscricao/page.tsx`

### Modificados

- `app/components/EditalCpfGate.tsx`
- `app/components/RegistrationFormSection.tsx`
- `app/edital/page.tsx`
- `lib/api.ts`

### Possivelmente modificados, se necessario para copy ou navegaçao

- `app/page.tsx`
- `app/components/Navbar.tsx`
- `app/components/HeroSection.tsx`

## Detalhamento por componente

### `app/components/EditalCpfGate.tsx`

O estado de “CPF nao encontrado” deve trocar o botao atual de retorno para a home por um link para `/inscricao`.

O texto tambem deve deixar claro que o cadastro sera usado imediatamente para liberar o Edital.

### `app/inscricao/page.tsx`

Essa pagina deve renderizar o formulario de inscricao atual em um layout simples, focado na conversao.

A pagina deve ser independente da home para que o usuario chegue nela sem ruido visual.

### `app/components/RegistrationFormSection.tsx`

O componente precisa aceitar um comportamento opcional de pos-submit, para que a mesma implementacao funcione:

- na home, como hoje
- na pagina `/inscricao`, com redirecionamento automatico para o Edital

O contrato de sucesso precisa manter o envio atual e adicionar o handoff do Edital sem quebrar o fluxo existente da home.

### `lib/api.ts`

O cliente de API pode precisar expor um retorno ou helper adicional para o handoff do Edital, se a pagina dedicada decidir chamar a validacao logo apos o cadastro.

Se nao houver necessidade de expor novos helpers, este arquivo deve permanecer inalterado.

### `app/edital/page.tsx`

Manter a pagina como gate de CPF, mas atualizar a experiencia de fallback para o novo fluxo.

Nao deve existir redirecionamento de volta para a home como caminho principal.

## Regras de comportamento

- O cadastro continua sendo um fluxo separado e obrigatorio antes do Edital.
- O auto-redirecionamento so acontece apos inscricao concluida com sucesso.
- O fluxo nao pode apagar o contexto da pessoa se a validacao do Edital falhar depois do cadastro.
- O formulario da home pode continuar existindo; esta mudanca cria uma entrada dedicada para o mesmo formulario.
- Nao alterar regras de backend de inscricao sem necessidade.

## Critrios de aceite

1. Quando o CPF nao existe em `/edital`, o botao principal leva para `/inscricao`.
2. `/inscricao` mostra o formulario de cadastro em pagina dedicada.
3. Depois de cadastrar com sucesso em `/inscricao`, o sistema tenta validar o CPF automaticamente.
4. Se a validacao der certo, o usuario vai direto para `/edital/proposta`.
5. Se a validacao nao der certo por erro transitório, a pessoa recebe uma mensagem util e nao perde o cadastro enviado.
6. O formulario continua funcionando normalmente na home.

## Casos de erro

### CPF nao encontrado no gate do Edital

Comportamento esperado: oferecer `/inscricao` como caminho principal.

### Cadastro concluido, mas validacao do Edital falha

Comportamento esperado: manter a inscricao realizada, mostrar erro de continuidade e permitir nova tentativa.

### Cadastro concluido e pessoa ja tinha proposta submetida

Comportamento esperado: respeitar o retorno atual do gate do Edital e nao reabrir a submissao.

## Riscos e trade-offs

- Reaproveitar o componente de formulario reduz risco, mas exige uma pequena extensao de interface para suportar o handoff.
- Fazer o cadastro redirecionar automaticamente para o Edital melhora a UX, mas depende de duas chamadas seguidas funcionando bem: inscricao e validacao do CPF.
- Criar uma pagina separada aumenta a clareza do fluxo, sem precisar mexer na estrutura da home.

## Fora de escopo

- Alterar o backend de inscricao
- Mudar as regras de elegibilidade do Edital
- Remover o formulario da home
- Reformular o design completo das paginas

## Resultado esperado

O usuario que entra sem cadastro nao volta para a home. Ele cai na pagina de inscricao, conclui o cadastro e segue para o formulario do Edital sem passos extras.
