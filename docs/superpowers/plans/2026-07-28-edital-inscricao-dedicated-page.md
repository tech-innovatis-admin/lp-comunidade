# Cadastro Dedicado do Edital Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** criar uma pagina dedicada de cadastro da comunidade e, apos o envio com sucesso, redirecionar automaticamente a pessoa para `/edital/proposta`.

**Architecture:** reutilizar o formulario atual em uma rota nova (`/inscricao`), sem mudar o contrato do backend de inscricao. O componente de formulario ganha um modo de fluxo para acionar, apos o submit bem-sucedido, a validacao do CPF no gate do Edital, salvar a sessao assinado e navegar para o wizard. O gate de CPF do Edital deixa de empurrar o usuario para a home e passa a conduzir diretamente para a rota dedicada de cadastro.

**Tech Stack:** Next.js 15 App Router, React 19, TypeScript, fetch nativo, `lib/edital-api.ts`, `lib/edital-session.ts`, `next/navigation`.

## Global Constraints

- Preservar o comportamento atual da home: o formulario continua funcionando normalmente em `/#formulario`.
- Nao alterar o contrato de `POST /api/inscricoes`.
- O redirecionamento para o Edital so pode acontecer depois de inscricao concluida com sucesso.
- Se a validacao do Edital falhar depois do cadastro, o envio nao pode ser perdido.
- Manter toda a copia em pt-BR e sem mudar o design global da landing page.
- Nao introduzir dependencias novas.

---

### Task 1: Criar a pagina dedicada de cadastro

**Files:**
- Create: `app/inscricao/page.tsx`
- Modify: `app/components/RegistrationFormSection.tsx`

**Interfaces:**
- Consumes: `RegistrationFormSection` com um modo de fluxo configuravel.
- Produces: pagina publica `/inscricao` com o mesmo formulario da home, mas com orientacao explicita para quem vai seguir para o Edital.

- [ ] **Step 1: Definir o modo de uso do formulario**

Adicionar um prop simples no formulario, por exemplo `flowMode?: 'home' | 'edital'`, com valor padrao `home`.

No modo `edital`, o formulario deve manter a mesma logica de validacao, mas exibir copy ajustada para o contexto de cadastro para acesso ao Edital.

- [ ] **Step 2: Criar a pagina `/inscricao`**

Renderizar um hero curto, objetivo e mobile-friendly, seguido do `RegistrationFormSection` em modo `edital`.

Manter a pagina sem dependencia de scroll da home e sem trazer seções extras desnecessarias.

- [ ] **Step 3: Verificar a renderizacao local**

Subir a aplicacao e confirmar que `/inscricao` abre a pagina dedicada e que a home continua exibindo o formulario atual sem regressao visual.

---

### Task 2: Implementar o handoff automatico para o Edital

**Files:**
- Modify: `app/components/RegistrationFormSection.tsx`
- Read: `lib/edital-api.ts`
- Read: `lib/edital-session.ts`

**Interfaces:**
- Consumes: `submitRegistration(formData)`, `validateCpfForEdital(cpf, website)`, `setEditalSession(session)`.
- Produces: fluxo de sucesso capaz de registrar a inscricao e, em seguida, liberar automaticamente `/edital/proposta`.

- [ ] **Step 1: Acrescentar a transicao de pos-submit no modo `edital`**

Depois de `submitRegistration` retornar sucesso, capturar o CPF ja normalizado e chamar `validateCpfForEdital` com o mesmo valor.

No caminho feliz, gravar a sessao com `setEditalSession({ token, prefill })` e usar `router.push('/edital/proposta')`.

- [ ] **Step 2: Tratar falha apos cadastro sem perder o envio**

Se a validacao do Edital falhar depois do cadastro concluido, mostrar uma mensagem que explique o estado da inscricao e ofereca um caminho claro para tentar validar novamente ou voltar para `/edital`.

Nao refazer o cadastro nem limpar o estado de sucesso do envio.

- [ ] **Step 3: Manter o comportamento atual da home**

Garantir que o modo `home` continue exibindo a mesma experiencia atual: sucesso com o fluxo existente, sem redirecionamento automatico para o Edital.

- [ ] **Step 4: Validar o novo fluxo de sucesso**

Testar manualmente o encadeamento `submitRegistration -> validateCpfForEdital -> setEditalSession -> /edital/proposta` usando um CPF real ja confirmado na base.

---

### Task 3: Ajustar o gate do Edital e a copia de fallback

**Files:**
- Modify: `app/components/EditalCpfGate.tsx`
- Modify: `app/edital/page.tsx` se for necessario para ajuste de texto ou CTA

**Interfaces:**
- Consumes: o estado `blocked` atual do gate.
- Produces: fallback que envia o usuario para `/inscricao` em vez de mandar de volta para a home.

- [ ] **Step 1: Trocar o destino do botao principal**

No estado `blocked`, substituir o link para `/#formulario` por `/inscricao`.

- [ ] **Step 2: Ajustar a mensagem de orientacao**

Reescrever a copia para deixar claro que a pessoa deve concluir o cadastro na pagina dedicada antes de voltar ao gate do Edital.

- [ ] **Step 3: Conferir os dois estados de retorno**

Confirmar que o estado de `alreadySubmitted` continua levando para o wizard existente e que o estado `blocked` agora aponta para a nova pagina de cadastro.

---

### Task 4: Atualizar documentacao e validar a entrega

**Files:**
- Modify: `README.md`
- Modify: `MDs/README.md`
- Modify: `MDs/BACKEND.md`
- Modify: `MDs/INDICE_DOCUMENTACAO.md`
- Modify: `CLAUDE.md`

**Interfaces:**
- Consumes: o comportamento final da rota `/inscricao` e o novo fallback do Edital.
- Produces: documentacao alinhada com o fluxo real, sem instrucoes antigas que mandem o usuario de volta para a home.

- [ ] **Step 1: Atualizar a documentacao de entrada**

Adicionar a rota `/inscricao` como caminho dedicado do cadastro e descrever o handoff automatico para `/edital/proposta`.

- [ ] **Step 2: Atualizar a documentacao tecnica**

Registrar o novo fluxo no backend e no indice da documentacao, sem reintroduzir o fluxo legado de WhatsApp como parte da operacao ativa.

- [ ] **Step 3: Rodar validacao minima**

Executar:

```powershell
npm run lint
npm run build
```

Esperado: ambos concluem sem erro.

- [ ] **Step 4: Fazer a revisao final do fluxo**

Verificar manualmente:

1. `/edital` com CPF inexistente leva para `/inscricao`
2. `/inscricao` conclui o cadastro
3. apos o cadastro, o sistema entra no Edital sem voltar para a home
4. a home continua com o formulario atual funcionando normalmente

