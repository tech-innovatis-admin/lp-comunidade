## O que mudou
<!-- Resumo curto: o que foi feito e por quê. Se resolve uma issue/ticket, linke aqui. -->

## Tipo de mudança
- [ ] Feature nova
- [ ] Correção de bug
- [ ] Refatoração (sem mudança de comportamento)
- [ ] Infra/DevOps/CI
- [ ] Mudança de schema/banco de dados

## Como testar
<!-- Passo a passo pra quem for revisar reproduzir localmente.
Ex: "rodar `npm run dev`, acessar /upload, enviar um documento de teste" -->

## Screenshots / evidência (se front-end)
<!-- Prints ou GIF de antes/depois, se for mudança visual -->

## Checklist antes de pedir review
- [ ] Testei localmente
- [ ] Adicionei/atualizei testes automatizados
- [ ] Sem `console.log` ou código comentado sobrando
- [ ] Pipeline (build + testes) passou

## Checklist específico — dados sensíveis
- [ ] Endpoint novo/alterado tem checagem de autorização (não só autenticação)
- [ ] Nenhum dado sensível (documento, CPF, nome completo) aparece em log
- [ ] Storage do documento tem controle de acesso configurado (não é público)
- [ ] Upload valida tipo e tamanho de arquivo no backend

## Impacto e risco
<!-- Esse PR pode quebrar algo em produção? Precisa de deploy coordenado,
feature flag, ou rollback plan? -->

## Observações para o revisor
<!-- Algo específico que você quer que eu preste atenção?
Ex: "não tenho certeza se a abordagem X foi a melhor, aceito sugestão" -->