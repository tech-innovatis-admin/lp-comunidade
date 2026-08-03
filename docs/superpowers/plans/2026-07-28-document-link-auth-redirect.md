# Document Link Auth Redirect Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** trocar o link público do documento exportado para a planilha por um caminho de acesso autenticado que redireciona para o login do admin e, após autenticação, abre o painel na aba de inscrições pendentes.

**Architecture:** em vez de expor `/api/documents/[id]` na planilha, a inscrição vai salvar um link intermediário público. Esse endpoint/página valida se existe sessão de admin: se houver, redireciona direto para `/admin/editais?tab=pendentes`; se não houver, envia para `/admin/login` com `next=` apontando para a mesma aba. O login do admin passa a respeitar esse `next` para retornar o usuário ao destino correto depois de autenticar.

**Tech Stack:** Next.js 15 App Router, React 19, TypeScript, `next/navigation`, cookies via `next/headers`, `app/api/inscricoes/route.ts`, `app/admin/login/page.tsx`, `lib/admin-auth.ts`, `lib/google-sheets.ts`.

---

### Task 1: Criar o caminho intermediário autenticado para o link da planilha

**Files:**
- Create: `app/acesso-documento/[id]/page.tsx`
- Modify: `app/api/inscricoes/route.ts`
- Modify: `MDs/VISUALIZACAO_DOCUMENTOS.md`
- Modify: `MDs/BACKEND.md`

**Interfaces:**
- Consumes: `registrationId` da inscrição e sessão admin existente.
- Produces: URL pública intermediária que manda para login quando não há sessão e para `/admin/editais?tab=pendentes` quando há sessão.

- [x] **Step 1: Especificar o comportamento do novo caminho**

`app/acesso-documento/[id]/page.tsx` deve ler o cookie `admin_session` com `cookies()` e usar `verifyAdminSessionToken`.

```ts
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { ADMIN_SESSION_COOKIE_NAME, verifyAdminSessionToken } from '@/lib/admin-auth'

export default async function AcessoDocumentoPage() {
  const cookieStore = await cookies()
  const token = cookieStore.get(ADMIN_SESSION_COOKIE_NAME)?.value
  const target = '/admin/editais?tab=pendentes'

  if (verifyAdminSessionToken(token)) {
    redirect(target)
  }

  redirect(`/admin/login?next=${encodeURIComponent(target)}`)
}
```

- [x] **Step 2: Trocar a URL exportada pela inscrição**

Em `app/api/inscricoes/route.ts`, trocar a construção atual do link:

```ts
const documentViewUrl = fileBuffer ? `${baseUrl}/api/documents/${registrationId}` : null;
```

para:

```ts
const documentViewUrl = fileBuffer ? `${baseUrl}/acesso-documento/${registrationId}` : null;
```

O valor exportado na planilha passa a apontar para o acesso autenticado, sem expor mais o endpoint bruto do documento.

- [x] **Step 3: Atualizar a documentação do fluxo**

Em `MDs/VISUALIZACAO_DOCUMENTOS.md` e `MDs/BACKEND.md`, substituir a descrição do link da planilha para refletir que ele aponta para o acesso autenticado e não para `GET /api/documents/[id]` diretamente.

---

### Task 2: Fazer o login respeitar o retorno e abrir a aba correta

**Files:**
- Modify: `app/admin/login/page.tsx`

**Interfaces:**
- Consumes: query string `next`.
- Produces: navegação pós-login para o destino solicitado, com fallback seguro para `/admin/editais?tab=pendentes`.

- [x] **Step 1: Ler o parâmetro `next` na página de login**

Adicionar `useSearchParams` de `next/navigation` e derivar o destino final antes do submit:

```ts
const searchParams = useSearchParams()
const nextPath = searchParams.get('next') || '/admin/editais?tab=pendentes'
```

- [x] **Step 2: Usar o destino após autenticar**

Trocar o trecho final:

```ts
router.push('/admin/editais')
router.refresh()
```

por:

```ts
router.push(nextPath)
router.refresh()
```

Se o login vier do link da planilha, o usuário volta direto para a aba `pendentes`.

- [x] **Step 3: Manter o fallback atual**

Se `next` vier ausente, vazio ou inválido, o login continua levando para `/admin/editais?tab=pendentes`.

---

### Task 3: Validar o fluxo ponta a ponta e ajustar a documentação operacional

**Files:**
- Modify: `README.md`
- Modify: `MDs/README.md`
- Modify: `MDs/INDICE_DOCUMENTACAO.md` se houver referência ao link público do documento

**Interfaces:**
- Consumes: nova URL intermediária e login com retorno.
- Produces: documentação alinhada ao comportamento real.

- [x] **Step 1: Atualizar a documentação de visão geral**

Descrever que o link de documento exportado pela planilha agora cai em um acesso autenticado que:

1. leva para `/admin/login` quando não há sessão;
2. retorna para `/admin/editais?tab=pendentes` depois do login;
3. preserva o uso interno da aba de inscrições para revisão dos anexos.

- [x] **Step 2: Rodar validação mínima**

Executar:

```powershell
npm.cmd run build
```

Se o build passar, executar smoke test manual na sequência.

- [x] **Step 3: Fazer smoke test do novo link**

Validação executada:

- `npm.cmd run build`
- `npm.cmd run dev -- -p 3013`
- smoke HTTP em `/acesso-documento/7` com `307`
- smoke HTTP em `/admin/login?next=%2Fadmin%2Feditais%3Ftab%3Dpendentes` com `200`

Verificar manualmente:

1. abrir `/acesso-documento/123` sem sessão admin;
2. confirmar redirect para `/admin/login?next=%2Fadmin%2Feditais%3Ftab%3Dpendentes`;
3. autenticar com sucesso;
4. confirmar entrada em `/admin/editais?tab=pendentes`.
