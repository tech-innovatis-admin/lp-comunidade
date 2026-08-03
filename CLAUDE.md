# CLAUDE.md

Guia de trabalho para o agente neste repositorio.

## Visao do projeto

Aplicacao Next.js 15 da comunidade InnovaNation. O sistema cobre:

- landing page publica com formulario de inscricao
- fluxo do Edital PPI com gate por CPF e wizard de proposta
- painel admin para avaliacao das propostas

O fluxo de inscricao da comunidade guarda dados pessoais, documento de identidade, prova de consentimento e metadados juridicos em PostgreSQL, depois sincroniza com Google Sheets e webhook N8N.

## Idioma e tom

- Use pt-BR
- Seja objetivo e tecnico
- Nao adicione explicacoes desnecessarias

## Commits

- Nunca adicione trailer `Co-Authored-By: Claude`

## Comandos uteis

```powershell
npm run dev
npm run build
npm start
npm run lint
npm run migrate
npm run update-term-v1.0
```

## Testes

Nao ha suite automatizada de testes neste repositorio. `scripts/test-webhook.js` e um script manual para exercitar o webhook do N8N.

## Migrations

- As migrations ficam em `database/migrations/*.sql`
- Elas sao aplicadas manualmente
- Antes de criar uma nova, confira sempre o ultimo numero existente

## Fluxo de inscricao

`app/components/RegistrationFormSection.tsx` -> `lib/api.ts` -> `POST /api/inscricoes`

`/inscricao` mostra o comunicado de pre-cadastro e `/inscricao/formulario` leva ao formulario dedicado; ao concluir com sucesso, o frontend tenta liberar `/edital/proposta` automaticamente.

O endpoint de inscricao:

1. Rejeita requisicoes grandes, tipo errado e origem nao confiavel
2. Aplica rate limit em memoria
3. Usa honeypot `website`
4. Valida texto, CPF, email e endereco
5. Valida arquivo por MIME, tamanho e assinatura binaria
6. Confere os termos ativos
7. Garante unicidade de email/CPF em nivel de aplicacao
8. Calcula fingerprint da inscricao
9. Salva o documento no PostgreSQL como `BYTEA`
10. Dispara Google Sheets e N8N como integracoes best-effort apos o commit

Os documentos sao servidos por `GET /api/documents/[id]` com verificacao de integridade por hash.

## Camadas de seguranca

- `middleware.ts` aplica CSP nonce e headers de seguranca
- `lib/security.ts` concentra checagem de origem, rate limit, regex de conteudo suspeito e assinatura binaria
- `api/health` responde apenas para request interna ou `HEALTHCHECK_TOKEN`

## Modelo de dados

- `terms_of_use`
- `registrations`
- `edital_submissions`
- `edital_submission_documents`

`registration_invites` e o fluxo antigo de WhatsApp. Existe apenas como legado historico e nao deve ser estendido.

## Fluxo do Edital

- `/edital` faz o gate por CPF
- `/edital/proposta` renderiza o wizard
- `POST /api/editais/validar-cpf` valida cadastro confirmado e gera token assinado
- `POST /api/editais/proposta/rascunho` salva o draft
- `POST /api/editais/proposta/documento` envia arquivos do Edital para S3
- `POST /api/editais/proposta/enviar` finaliza a submissao e gera o termo PDF

## Painel admin

- `/admin/login`
- `/admin/editais`
- `/admin/editais/[id]`

O acesso usa login individual com permissao `edital-admin` na base compartilhada de usuarios/plataformas.

## Integracoes

- Google Sheets: `lib/google-sheets.ts`
- N8N: `WEBHOOK_N8N_URL`
- S3: credenciais do Google e arquivos do Edital
- PostgreSQL: documentos da inscricao e dados transacionais

## Deploy

- Build Docker para `linux/arm64`
- `next.config.ts` usa `output: "standalone"`
- Scripts em `ps1/` sao para Windows
- Scripts em `scripts/` cuidam do host EC2 e das migrations

## Documentacao local

- `README.md`
- `MDs/README.md`
- `MDs/BACKEND.md`
- `MDs/DEPLOY.md`
- `MDs/SEGURANCA_JURIDICA.md`
- `MDs/VISUALIZACAO_DOCUMENTOS.md`
