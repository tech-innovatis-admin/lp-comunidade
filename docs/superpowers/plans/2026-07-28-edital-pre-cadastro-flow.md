# Pré-cadastro do Edital Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** transformar `/inscricao` em uma página de pré-cadastro com CTA destacado para a página exclusiva do formulário, mantendo o handoff automático para `/edital/proposta` após o envio bem-sucedido.

**Architecture:** separar a navegação em duas etapas. `/inscricao` passa a ser uma página leve de orientação e conversão, com botão principal para `/inscricao/formulario` e botão secundário de retorno ao Edital. A nova rota `/inscricao/formulario` hospeda o formulário atual, reaproveitando `RegistrationFormSection` em modo de fluxo do Edital para preservar o comportamento de auto-handoff já implementado.

**Tech Stack:** Next.js 15 App Router, React 19, TypeScript, `next/link`, `next/navigation`, `app/components/RegistrationFormSection.tsx`, `app/components/EditalCpfGate.tsx`.

## Global Constraints

- `/inscricao` deve mostrar apenas a página de pré-cadastro, sem o formulário ao lado.
- A página exclusiva do formulário deve ser uma rota separada, definida aqui como `/inscricao/formulario`.
- O botão principal da página de pré-cadastro deve ser mais chamativo e ter o texto `Quero entrar na comunidade InnovaNation`.
- O botão secundário deve continuar levando de volta para `/edital`.
- O fluxo de auto-handoff para `/edital/proposta` após cadastro bem-sucedido deve continuar funcionando.
- O fluxo da home não deve ser quebrado.
- Não alterar regras de backend, apenas navegação, composição de páginas, copy e documentação.
- Manter toda a cópia em pt-BR e sem introduzir novas dependências.

---

### Task 1: Transformar `/inscricao` em página de pré-cadastro

**Files:**
- Modify: `app/inscricao/page.tsx`
- Create: `app/inscricao/formulario/page.tsx`

**Interfaces:**
- Consumes: navegação para `/edital` e `/inscricao/formulario`.
- Produces: uma página leve de pré-cadastro em `/inscricao` e uma página dedicada apenas ao formulário em `/inscricao/formulario`.

- [x] **Step 1: Reescrever a página `/inscricao`**

Remover o formulário da página atual e deixar apenas a seção de comunicado/pré-cadastro.

A nova página deve ter:

- título e texto explicando que a pessoa ainda precisa concluir o cadastro
- botão secundário para voltar ao Edital em `/edital`
- botão principal com o texto `Quero entrar na comunidade InnovaNation`

- [x] **Step 2: Criar a rota `/inscricao/formulario`**

Renderizar a experiência focada só no formulário, sem a seção de comunicado lateral.

A página deve ser simples e mobile-friendly, mas pode reutilizar o wrapper de layout do formulário já existente.

- [x] **Step 3: Confirmar a intenção de navegação**

Garantir que o CTA principal da página de pré-cadastro leve para `/inscricao/formulario` e que o CTA secundário continue apontando para `/edital`.

---

### Task 2: Ajustar o formulário para a página exclusiva

**Files:**
- Modify: `app/components/RegistrationFormSection.tsx`
- Modify: `app/inscricao/formulario/page.tsx`

**Interfaces:**
- Consumes: `RegistrationFormSection` com `flowMode="edital"`.
- Produces: a mesma jornada de cadastro já existente, mas exibida apenas na nova rota de formulário.

- [x] **Step 1: Reaproveitar o modo de fluxo do Edital**

Manter o comportamento atual de `flowMode="edital"` para que o formulário continue fazendo o handoff automático após o envio.

- [x] **Step 2: Garantir que a tela seja “só o formulário”**

Na página `/inscricao/formulario`, usar uma estrutura mínima ao redor do componente para que o usuário veja apenas o formulário e as mensagens necessárias ao fluxo.

- [x] **Step 3: Revisar textos do formulário**

Confirmar que os textos de cabeçalho e botão continuam coerentes com o cadastro para entrada na comunidade e para liberação do Edital.

- [x] **Step 4: Validar o caminho feliz**

Após o cadastro bem-sucedido, a tela deve continuar validando o CPF automaticamente e redirecionando para `/edital/proposta`.

---

### Task 3: Atualizar o gate do Edital e os pontos de entrada

**Files:**
- Modify: `app/components/EditalCpfGate.tsx`
- Modify: `app/edital/page.tsx` se necessário para copy complementar

**Interfaces:**
- Consumes: estado `blocked` do gate do Edital.
- Produces: fallback que leva para `/inscricao` como pré-cadastro, não para a página do formulário.

- [x] **Step 1: Manter o fallback em `/inscricao`**

Confirmar que o estado de CPF não encontrado leva para a página de pré-cadastro.

- [x] **Step 2: Ajustar a copy do fallback**

Explicar que a pessoa deve primeiro ler o comunicado e seguir para o formulário pela página dedicada.

- [x] **Step 3: Conferir o fluxo de retorno**

Garantir que a pessoa que já está pronta para o formulário encontre um botão claro na página `/inscricao` para seguir adiante.

---

### Task 4: Atualizar documentação e validar a entrega

**Files:**
- Modify: `README.md`
- Modify: `MDs/README.md`
- Modify: `MDs/BACKEND.md`
- Modify: `MDs/INDICE_DOCUMENTACAO.md`
- Modify: `CLAUDE.md`

**Interfaces:**
- Consumes: a decisão de separar `/inscricao` em pré-cadastro e `/inscricao/formulario` em formulário exclusivo.
- Produces: documentação alinhada com a navegação real do sistema.

- [x] **Step 1: Atualizar os pontos de entrada**

Descrever `/inscricao` como pré-cadastro e `/inscricao/formulario` como a página do formulário.

- [x] **Step 2: Atualizar a documentação técnica**

Ajustar o fluxo de navegação e os links internos para não deixar a documentação sugerindo que o formulário fica mais na página de comunicado.

- [x] **Step 3: Rodar validação mínima**

Executar:

```powershell
npm.cmd run build
```

Se o lint continuar interativo sem configuração, registrar essa limitação explicitamente em vez de travar a entrega.

- [x] **Step 4: Fazer smoke test manual**

Verificar manualmente:

1. `/edital` com CPF inexistente leva para `/inscricao`
2. `/inscricao` mostra só o comunicado e o CTA principal
3. `/inscricao/formulario` mostra só o formulário
4. o envio bem-sucedido continua redirecionando para `/edital/proposta`

Validação executada:

- `npm.cmd run build`
- smoke HTTP em `/inscricao`, `/inscricao/formulario` e `/edital` com resposta `200`
