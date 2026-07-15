# Gate de validação de CPF para o formulário do Edital PPI

**Data:** 2026-07-15
**Status:** Aprovado para plano de implementação

## Contexto

A Innovatis vai publicar o Edital PPI 2026 (Apoio ao Fortalecimento de Ambientes de Inovação),
que seleciona propostas de laboratórios vinculados a instituições de ensino. A submissão da
proposta exige um formulário próprio (estilo Typeform, uma etapa por tela) com ~16 itens
obrigatórios: identificação da instituição/laboratório, plano de aplicação de recursos,
justificativa técnica, diagnóstico com fotos, e vários documentos anexados (ANEXO I, II e III
do edital).

Um dos critérios de elegibilidade do edital (item 4.3.b) exige que o proponente seja **membro
ativo da comunidade InnovaNation**, e a documentação obrigatória (item 8.1.10) pede um "Termo
de Comprovação de Participação na comunidade InnovaNation". Isso mapeia diretamente para o
cadastro que já existe no sistema: a tabela `registrations` (preenchida hoje pelo formulário da
home, `RegistrationFormSection.tsx` → `POST /api/inscricoes`), onde toda inscrição tem aceite
de termos registrado (`terms_accepted`, sempre `TRUE` no fluxo atual).

Este spec cobre **apenas o portão de entrada** do novo formulário do edital: a etapa que
confirma que a pessoa já é uma inscrita válida na comunidade antes de liberar o restante do
fluxo. As etapas seguintes do Typeform (upload dos documentos do edital, textos do plano de
aplicação, etc.) ficam para um spec futuro.

## Objetivo

Antes de deixar alguém preencher o formulário de submissão do edital, o sistema deve:

1. Pedir o CPF da pessoa.
2. Verificar se existe uma inscrição confirmada (`registrations.cpf` + `terms_accepted = TRUE`)
   com esse CPF.
3. Se **não existir**: bloquear o avanço e direcionar a pessoa para completar a inscrição na
   comunidade primeiro (formulário já existente na home).
4. Se **existir**: liberar o avanço e disponibilizar os dados já cadastrados (nome, e-mail,
   telefone, profissão, organização, endereço) para reaproveitar nas próximas etapas, sem pedir
   de novo.

## Arquitetura

```
/edital (nova rota)
  └─ Etapa "Gate": pede só o CPF
       ↓
  POST /api/editais/validar-cpf
       ↓
  Consulta em `registrations` (tabela já existente)
       ├─ Encontrado + terms_accepted=TRUE
       │     → retorna token assinado (~1h) + dados para prefill
       │     → libera avanço para as próximas etapas (spec futuro)
       │
       └─ Não encontrado
             → tela de bloqueio: "você precisa se inscrever antes" +
               botão para a home (#formulario) + botão "Tentar outro CPF"
```

Não cria tabela nova. Não altera o fluxo de inscrição existente. Não depende de
`IdentityUploadSection.tsx` (componente órfão hoje, não referenciado em `page.tsx`).

## API: `POST /api/editais/validar-cpf`

Segue o mesmo padrão de `/api/inscricoes`, reaproveitando os helpers de `lib/security.ts`.

**Request** (`Content-Type: application/json`, sem upload de arquivo nesta etapa):
```json
{ "cpf": "12345678901" }
```

**Ordem de validação:**
1. `isTrustedOrigin(request)` → 403 se falhar.
2. `enforceRateLimit(request, 'edital-validar-cpf', 5, 15 * 60 * 1000)` → 429 se estourar
   (limite mais restritivo que `/api/inscricoes` porque este endpoint é um alvo de enumeração
   de CPF/PII — ver seção Segurança).
3. Honeypot: campo oculto `website` reaproveitado do form da home — se preenchido, responde
   `{ ok: false, reason: 'not_found' }` sem consultar o banco.
4. `isValidCPF(cpf)` (de `lib/utils.ts`) → 400 se formato/checksum inválido, sem consultar o
   banco.

**Query:**
```sql
SELECT id, full_name, email, phone, profession, organization,
       address_zip, address_street, address_number, address_neighborhood,
       address_city, address_state
FROM registrations
WHERE cpf = $1 AND terms_accepted = TRUE
LIMIT 1
```

**Respostas:**

| Caso | Status | Body |
|---|---|---|
| CPF mal formatado | 400 | `{ error: 'CPF inválido' }` |
| Origem não confiável | 403 | `{ error: 'Origem não autorizada' }` |
| Rate limit estourado | 429 | `{ error: 'Muitas tentativas...' }` + header `Retry-After` |
| Não encontrado / honeypot acionado | 404 | `{ error: 'not_found' }` |
| Erro interno | 500 | `{ error: 'Erro interno do servidor' }` (log no servidor, nunca detalhe pro cliente) |
| Encontrado | 200 | `{ ok: true, token: "...", prefill: { fullName, email, phone, profession, organization, cep, logradouro, numero, bairro, cidade, estado } }` |

Nenhum dado sensível além do necessário para prefill é retornado: sem CPF, documento, hash,
fingerprint, IP ou user-agent do cadastro original.

### Token assinado

Novo módulo `lib/edital-auth.ts`, sem dependência nova (o projeto já resolve hashing/tokens com
`crypto` nativo em `lib/utils.ts` — seguimos o mesmo estilo, sem adicionar `jsonwebtoken`):

```
payload    = base64url(JSON.stringify({ registrationId, iat, exp }))   // exp = iat + 3600 (1h)
signature  = HMAC-SHA256(payload, EDITAL_TOKEN_SECRET)
token      = `${payload}.${base64url(signature)}`
```

- `createEditalToken(registrationId)` monta o token.
- `verifyEditalToken(token)` decodifica, confere assinatura e `exp`; retorna só o
  `registrationId` (ou `null`/lança erro se inválido/expirado).
- Etapas futuras enviam o token no header `X-Edital-Token`. O servidor **sempre** decodifica o
  token e rebusca os dados oficiais no banco pelo `registrationId` — nunca confia em dados que
  o cliente reenviar junto (nome, endereço etc. no payload de submissão final são ignorados em
  favor do que está no banco).

**Variável de ambiente nova:** `EDITAL_TOKEN_SECRET` (entra em `env.example`).
- Em produção (`NODE_ENV === 'production'`): se ausente, a primeira chamada que precisar
  assinar/verificar um token lança erro — não se deve assinar tokens com um segredo previsível.
- Em desenvolvimento: fallback fixo com `console.warn` alertando que é inseguro para produção.

## Front-end — rota `/edital`

**Arquivos novos:**
- `app/edital/page.tsx` — nova rota, herda automaticamente `app/layout.tsx` (CSP nonce,
  `ParticlesBackground`, `MiniFooter`, analytics já vêm de graça).
- `app/components/EditalCpfGate.tsx` — componente client (`'use client'`) com a lógica da etapa.
- `lib/edital-api.ts` — `validateCpfForEdital(cpf)`, no mesmo espírito de `lib/api.ts`.

**Estados do componente** (mesmo padrão de `useState` local usado em `RegistrationFormSection.tsx`,
sem lib de state management nova):

```
'idle'       → input de CPF vazio, botão desabilitado
'validating' → loading, botão com spinner
'blocked'    → CPF não encontrado → tela de bloqueio
'granted'    → CPF validado → resumo dos dados + botão "Continuar"
```

**Fluxo visual:**
1. Tela inicial: campo único de CPF, mesma máscara `formatCPF` (000.000.000-00) e mesmo estilo
   visual (cards `slate-900/40`, accent `#22AE84`) do form da home, para consistência de marca.
2. Ao submeter, chama `validateCpfForEdital`:
   - **404** → estado `blocked`: mensagem "Não encontramos uma inscrição confirmada com esse
     CPF na comunidade InnovaNation" + botão primário "Fazer minha inscrição"
     (`<Link href="/#formulario">`) + botão secundário "Tentar outro CPF" (volta pro `idle`).
   - **429** → mesma mensagem de rate limit já usada em `RegistrationFormSection`.
   - **200** → salva `token` e `prefill` em `sessionStorage` (chave `edital_session`), estado
     vira `granted`, mostra "Bem-vindo(a), {fullName}!" com botão "Continuar" (placeholder até
     a próxima etapa existir).

**Por que `sessionStorage` e não `localStorage`:** o token expira em 1h; não deve sobreviver
entre sessões do navegador. `sessionStorage` some ao fechar a aba, reduzindo a janela de
exposição do prefill (nome, e-mail, telefone, endereço) em máquina compartilhada.

**Contrato de handoff pras próximas etapas** (interface apenas — conteúdo é spec futuro):
qualquer etapa seguinte lê `token` do `sessionStorage`, envia no header `X-Edital-Token`; o
servidor sempre valida e rebusca antes de aceitar qualquer coisa. Se o token expirar no meio do
caminho, a etapa deve tratar 401 redirecionando de volta pra `/edital` com mensagem de "sessão
expirada, informe seu CPF novamente".

## Segurança

**Risco principal: enumeração de CPFs.** O endpoint aceita um CPF e devolve PII (nome, e-mail,
telefone, endereço) de qualquer pessoa cadastrada — alvo natural de força bruta / coleta de
dados de terceiros. Mitigações:

1. Rate limit por IP+UA: **5 tentativas / 15 minutos** (mais restritivo que os 8/10min de
   `/api/inscricoes`, porque esta é uma tela de "login", não de conversão — fricção extra aqui
   é aceitável).
2. Honeypot (campo `website` oculto, reaproveitado do form da home).
3. Validação de formato de CPF (checksum) antes de tocar no banco, para não gastar uma query
   com entradas obviamente inválidas.
4. Log de tentativas malsucedidas usando hash do CPF, nunca o CPF em texto puro.
5. Resposta minimalista: só os campos necessários para prefill, nunca CPF/documento/hash/IP do
   cadastro original.

**Tratamento de erros:**

| Situação | Comportamento |
|---|---|
| CPF com formato inválido | 400, sem tocar no banco |
| Origem não confiável | 403 |
| Rate limit | 429 + `Retry-After` |
| Erro de banco/infra | 500 genérico, log no servidor |
| Token expirado (etapas futuras) | 401 `{ error: 'token_expired' }`; front redireciona pra `/edital` |

## Fora de escopo

- Etapas 2..N do Typeform do edital (upload dos ~10 documentos, plano de aplicação de
  recursos, justificativa técnica, diagnóstico com fotos, declarações — todo o conteúdo do
  ANEXO I, II e III) — **spec futura separada**.
- Geração automática do "Termo de Comprovação de Participação" (item 8.1.10 do edital) a
  partir dos dados já registrados — ideia anotada para explorar depois, não implementada agora.
- Qualquer tela de administração/homologação das propostas pela equipe da Innovatis (seções
  9–11 do edital: homologação, avaliação de mérito, divulgação de resultados).
