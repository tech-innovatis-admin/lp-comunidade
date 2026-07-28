# Documentacao do Backend - Landing Page InnovaNation

## Visao geral

O backend e implementado com Next.js API Routes e cobre tres blocos principais:

- inscricao publica da comunidade
- fluxo do Edital PPI
- painel admin para avaliacao das propostas

O sistema roda em producao em `https://comunidade.innovatismc.com` e usa:

- PostgreSQL para dados transacionais
- AWS S3 para credenciais do Google e arquivos do Edital
- Google Sheets para acompanhamento operacional
- webhook N8N para automacoes best-effort

## Fluxos principais

### 1. Inscricao da comunidade

Rota: `POST /api/inscricoes`

Responsabilidades:

- validar origem, tamanho da requisicao e tipo `multipart/form-data`
- aplicar rate limit e honeypot
- validar CPF, email e campos de endereco
- validar arquivo enviado por MIME, tamanho e assinatura binaria
- registrar termos ativos e hash do conteudo aceito
- salvar o documento de identidade no PostgreSQL como `BYTEA`
- calcular hash SHA-256 do documento e fingerprint da inscricao
- disparar Google Sheets e N8N apÃ³s o commit, sem bloquear o usuario

Campos esperados pelo formulario:

- `fullName`
- `profession`
- `organization`
- `cpf`
- `phone`
- `email`
- `cep`
- `logradouro`
- `numero`
- `bairro`
- `cidade`
- `estado`
- `projects`
- `termsId`
- `termsVersion`
- `variant` fixado em `MANUAL`
- `website` como honeypot
- `idDocumentFile`

Pagina dedicada: `/inscricao`

- apresenta o comunicado de pre-cadastro
- serve como entrada principal para quem precisa concluir o cadastro antes do Edital
- direciona para `/inscricao/formulario`

Pagina do formulario: `/inscricao/formulario`

- reutiliza o mesmo formulario da home
- executa o handoff automatico para o Edital apos o envio bem-sucedido

### 2. Visualizacao de documentos

Rota: `GET /api/documents/[id]`

Comportamento:

- exige sessao admin valida
- retorna o documento de identidade armazenado no PostgreSQL
- recalcula o hash a cada leitura e compara com o hash persistido
- bloqueia retorno se a integridade nao bater
- redireciona para `/admin/login?next=/api/documents/[id]` quando a sessao nao existe

### 3. Edital PPI

Rota de gate: `POST /api/editais/validar-cpf`

Fluxo:

- valida se o CPF pertence a um cadastro confirmado
- gera token assinado para o wizard
- gera certificado da comunidade, se ainda nao existir
- devolve os dados de prefill para a interface

Rota de rascunho: `POST /api/editais/proposta/rascunho`

- salva o estado parcial da proposta
- trava edicao quando a proposta ja foi enviada

Rota de arquivo: `POST /api/editais/proposta/documento`
Rota de leitura: `GET /api/editais/proposta/documento/[id]`

- arquivos do Edital ficam no S3
- o download usa URL assinada
- a validacao de arquivo segue a mesma regra de MIME, tamanho e assinatura binaria

Rota de envio final: `POST /api/editais/proposta/enviar`

- revalida a completude antes e dentro da transacao
- gera o termo de comprovacao de participacao em PDF
- grava o status como `SUBMITTED`
- dispara Google Sheets e N8N como integracoes best-effort

### 4. Admin do Edital

Rota de login: `POST /api/admin/login`
Rota de logout: `POST /api/admin/logout`

Painel:

- `/admin/login`
- `/admin/editais`
- `/admin/editais/[id]`

O login e individual e consulta uma base compartilhada de usuarios/plataformas. O acesso ao painel depende da plataforma `edital-admin`.

## Modelagem de dados

### Banco principal

As migrations vivem em `database/migrations/` e hoje cobrem:

- `terms_of_use`
- `registrations`
- `edital_submissions`
- `edital_submission_documents`
- views de apoio para auditoria, integridade e avaliacao

### Tabelas principais

#### `terms_of_use`

Armazena a versao ativa dos termos com hash de conteudo.

#### `registrations`

Guarda a inscricao da comunidade com:

- dados pessoais
- endereco estruturado
- documento de identidade em `BYTEA`
- hash e metadados do documento
- snapshot dos termos aceitos
- metadata de request para rastreabilidade
- fingerprint da inscricao
- certificado da comunidade

#### `edital_submissions`

Guarda a proposta do Edital por `registration_id`, com status `DRAFT` ou `SUBMITTED`.

#### `edital_submission_documents`

Guarda os arquivos da proposta, com `requirement_code`, `s3_key`, hash, mime e tamanho.

#### `registration_invites`

Tabela legada do fluxo antigo de WhatsApp. Existe em migrations historicas, mas nao deve ser usada como base para novas features.

## Integracoes

### Google Sheets

Arquivo: `lib/google-sheets.ts`

Ordem de autenticacao:

1. JSON do S3
2. JSON completo em variavel de ambiente
3. Variaveis individuais de service account

Uso atual:

- inscricoes -> aba de inscricoes
- propostas do Edital -> aba `PROPOSTAS`

### N8N

O webhook e configurado por `WEBHOOK_N8N_URL`.

Caracteristicas:

- best-effort
- nao bloqueia a resposta do usuario
- falha segura

### AWS S3

Usos atuais:

- credenciais do Google
- arquivos do Edital
- PDFs gerados do fluxo do Edital

Os documentos da inscricao da comunidade nao vao para S3; vao para o PostgreSQL.

## Seguranca

### Camadas aplicadas em `/api/inscricoes`

- limite de tamanho da requisicao
- validacao de `multipart/form-data`
- checagem de origem confiavel
- rate limit por IP e user-agent
- honeypot `website`
- validacao de conteudo suspeito
- validacao de CPF, email e endereco
- assinatura binaria do arquivo
- conferencia dos termos ativos
- hash do documento e fingerprint do registro

### Observacoes importantes

- `/api/documents/[id]` exige login admin; a planilha usa `/acesso-documento/[id]` para passar pelo login do admin e cair em `/admin/editais?tab=pendentes`
- `api/health` so responde para request interna ou com `HEALTHCHECK_TOKEN`
- o fluxo antigo de WhatsApp nao deve ser reativado sem decisao explicita

## Variaveis de ambiente

Principais variaveis usadas pelo backend:

- `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_SSL`
- `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_S3_BUCKET_NAME`
- `GOOGLE_CREDENTIALS_S3_BUCKET`, `GOOGLE_CREDENTIALS_S3_KEY`, `GOOGLE_CREDENTIALS_S3_REGION`
- `GOOGLE_SHEET_NAME` ou `GOOGLE_SHEET_ID`
- `GOOGLE_SERVICE_ACCOUNT_JSON`
- `GOOGLE_SERVICE_ACCOUNT_EMAIL`, `GOOGLE_PRIVATE_KEY`
- `PUBLIC_BASE_URL`
- `WEBHOOK_N8N_URL`
- `HEALTHCHECK_TOKEN`
- `ADMIN_TOKEN_SECRET`
- `PLATFORMS_DB_HOST`, `PLATFORMS_DB_PORT`, `PLATFORMS_DB_NAME`, `PLATFORMS_DB_USER`, `PLATFORMS_DB_PASSWORD`, `PLATFORMS_DB_SSL`
- `EDITAL_TOKEN_SECRET`
- `BYPASS_DUPLICATE_CHECKS` apenas para teste

## Validacao local

```powershell
npm run lint
npm run build
npm run migrate
```

## Observacao final

Quando houver mudanca de fluxo, contrato de API, autenticacao ou env, este arquivo deve ser atualizado junto com o codigo.
