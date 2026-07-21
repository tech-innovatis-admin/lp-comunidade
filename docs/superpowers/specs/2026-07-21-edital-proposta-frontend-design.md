# Frontend do wizard de submissão — `/edital/proposta`

**Data:** 2026-07-21
**Status:** Aprovado.

## Contexto

O backend do fluxo de submissão de proposta ao Edital PPI está completo (Plano 1, ver
`docs/superpowers/plans/2026-07-17-edital-proposta-backend-plan.md`, PR
[#7](https://github.com/tech-innovatis-admin/lp-comunidade/pull/7)): migração +
`edital_submissions`/`edital_submission_documents`, endpoints de rascunho, upload/
download de documento e envio final, tudo sob o header `X-Edital-Token` emitido pelo
gate de CPF (`/edital`, já implementado — ver
`docs/superpowers/specs/2026-07-15-edital-cpf-gate-design.md`).

Este spec cobre o **Plano 2 (Frontend)**: a página `/edital/proposta`, um wizard de 6
telas que consome essa API, deixado como "Fora de escopo" no spec original do fluxo
(`docs/superpowers/specs/2026-07-17-edital-proposta-form-design.md`, que ainda serve de
referência para o desenho das 6 telas e das regras de negócio — este documento foca na
arquitetura de componentes React e no fluxo de dados do lado do cliente).

## Arquitetura de componentes

```
app/edital/proposta/page.tsx                    → página (Server Component), só monta o wizard
app/components/edital/EditalPropostaWizard.tsx   → estado central (useState), navegação, chamadas de API, guarda de token/redirect
app/components/edital/EditalStepper.tsx          → indicador de progresso, 6 etapas clicáveis a qualquer momento
app/components/edital/TelaEquipe.tsx             → Tela 1: dados do responsável (prefill do gate, somente leitura) + equipe + docs 8.1.1-8.1.4
app/components/edital/TelaInstituicao.tsx        → Tela 2: instituição/laboratório + docs 8.1.5-8.1.7
app/components/edital/TelaFotos.tsx              → Tela 3: galeria de fotos (mín. 3, máx. 8) + planta/layout opcional (8.1.9)
app/components/edital/TelaProposta.tsx           → Tela 4: itens de orçamento (lista dinâmica) + justificativa técnica + resultados esperados
app/components/edital/TelaDeclaracoes.tsx        → Tela 5: docs 8.1.15 (Declaração de Responsabilidade) e 8.1.16 (Termo de Contrapartida)
app/components/edital/TelaRevisao.tsx            → Tela 6: checklist de completude + envio; também usada, sem os botões, como tela somente-leitura pós-envio
app/components/edital/DocumentUploadSlot.tsx     → 1 slot de documento único: upload → POST, preview do que já existe, substituir, remover (DELETE)
app/components/edital/PhotoGallerySlot.tsx       → variante para fotos múltiplas (grade, mín./máx., preview, remover individual)
lib/edital-proposta-api.ts                       → cliente tipado das 4 rotas (rascunho GET/POST, documento POST/GET/DELETE, enviar POST), mesmo padrão de erro tipado de lib/edital-api.ts
```

O container (`EditalPropostaWizard`) é o único que fala com a API de rascunho/envio e
que guarda o estado completo da submissão; as 6 telas são componentes de apresentação
que recebem dados e callbacks via props (`data`, `onFieldChange`, `documents`). Os
slots de upload são a exceção: chamam `POST/DELETE /documento` diretamente (mesma
responsabilidade única que `IdentityUploadSection` já tem hoje para o formulário de
inscrição) e notificam o wizard via callback quando a lista de documentos muda.

## Fluxo de dados

### Montagem

1. Lê `sessionStorage.edital_session` (mesma chave usada por `EditalCpfGate.tsx`).
   Ausente → redireciona para `/edital` imediatamente.
2. Com token, chama `GET /api/editais/proposta/rascunho`.
   - `submission: null` → estado zerado, começa na Tela 1 (mas o stepper permite ir a
     qualquer tela mesmo vazia).
   - `submission.status === 'DRAFT'` → popula o estado do wizard com os campos e
     documentos retornados. A última tela vista é lembrada só localmente
     (`localStorage`, chave separada da sessão) — puramente cosmético, não é uma
     garantia de navegação.
   - `submission.status === 'SUBMITTED'` → renderiza `TelaRevisao` em modo somente-
     leitura (sem os botões "Enviar"/editar), reaproveitando o mesmo componente do
     checklist final.
   - `401 { error: 'token_expired' }` (nesta chamada ou em qualquer chamada
     subsequente) → limpa `sessionStorage`, redireciona para `/edital?expired=1`.
     `EditalCpfGate`/`app/edital/page.tsx` passam a checar esse query param e mostrar
     um aviso "sessão expirada, informe seu CPF novamente" acima do formulário de CPF.

### Autosave ao navegar

Trocar de tela (clique no stepper, "Avançar" ou "Voltar") dispara
`POST /rascunho` com os campos daquela etapa antes ou em paralelo à troca visual —
otimista: a navegação não espera a resposta. Um indicador discreto no canto da tela
mostra `Salvando... / Salvo`. Falha de rede no autosave não bloqueia nem perde o
estado local — só mostra um aviso não-bloqueante; a próxima navegação tenta salvar de
novo com o estado atualizado.

Cada tela também expõe um botão "Salvar e continuar depois" explícito, que dispara o
mesmo `POST /rascunho` e mostra uma confirmação visível (não apenas o indicador
discreto), para quem quer ter certeza antes de fechar a aba.

### Upload de documento

`DocumentUploadSlot`/`PhotoGallerySlot` chamam `POST /documento` (multipart) no
`onChange` do input — mesmo ciclo de validação client-side que `IdentityUploadSection`
já usa (tipo de arquivo, tamanho) como primeira barreira de UX, sabendo que o servidor
revalida tudo (assinatura de arquivo, tamanho) de qualquer forma. Sucesso atualiza a
lista de documentos no estado do wizard via callback; erro mostra mensagem inline no
próprio slot, sem afetar as demais telas. Remover um documento chama
`DELETE /documento/:id` e atualiza a mesma lista.

### Envio final

Botão "Enviar proposta" (Tela 6) chama `POST /enviar`:
- `400 { error: 'incomplete', missing: [...] }` → permanece na Tela 6, traduz cada
  item de `missing` para um rótulo amigável (ex.: código de documento →
  "Comprovante de vínculo institucional") e rola até o primeiro item pendente. Nunca
  navega para longe da tela de revisão nesse caso.
- Timeout ou erro de rede na chamada em si (sem resposta HTTP) → mensagem genérica de
  erro com opção de tentar novamente, sem alterar o estado da submissão.
- `409 { error: 'already_submitted' }` → trata exatamente como um `GET` que já retornou
  `SUBMITTED`: troca para a visão somente-leitura.
- `200 { ok: true, submittedAt }` → tela de confirmação de sucesso.

## Tela 6 — Revisão: nível de detalhe

Checklist de completude por item obrigatório (não um resumo com prévia de conteúdo):
cada um dos ~18 itens (11 códigos de documento obrigatórios — `8.1.1`–`8.1.9`,
`8.1.15`, `8.1.16` — + mínimo de fotos + os 6 campos de texto obrigatórios) aparece com
um indicador ✓/✗, e cada item é um link que
volta para a tela onde ele é preenchido. Não reexibe o texto digitado nos campos —
apenas confirma presença/ausência. A mesma tela serve de tela de confirmação
somente-leitura pós-envio (ver "Fluxo de dados" acima), só que sem os links de edição
nem o botão de enviar.

## Navegação entre telas

Stepper com as 6 etapas sempre clicáveis, sem bloqueio por completude — coerente com a
regra já estabelecida de que a validação de completude só acontece no endpoint
`enviar`, nunca no rascunho. A pessoa pode pular para qualquer tela a qualquer momento
para revisar ou editar uma etapa anterior sem precisar navegar sequencialmente.

## Integração com o gate (`/edital`)

`EditalCpfGate.tsx` hoje mostra um botão "Continuar" desabilitado com a mensagem
"as próximas etapas estarão disponíveis em breve" no estado `granted`. Este plano troca
esse botão por um `Link` real para `/edital/proposta` (o token e o prefill já estão
salvos em `sessionStorage` nesse ponto, então a navegação simplesmente entra no wizard
com a sessão já pronta). `app/edital/page.tsx` também passa a ler `?expired=1` da URL
para mostrar o aviso de sessão expirada mencionado acima.

## Fora de escopo (explícito)

- Telas de administração/homologação da Innovatis.
- Qualquer mudança no backend (Plano 1, já implementado e revisado).
- Geração automática de ANEXO II/III — seguem como upload manual de PDF assinado, sem
  preview de conteúdo de PDF dentro do wizard (só nome do arquivo/tamanho, como o
  `IdentityUploadSection` já faz para PDFs).
- Testes automatizados (não há suite de testes neste repo).
- Acessibilidade além do razoável por padrão (labels, `aria-label` em botões de ação,
  seguindo o que os componentes existentes já fazem) — sem auditoria dedicada de a11y.
