# Seguranca Juridica - Documentos e Termos

## Objetivo

Documentar as garantias de integridade e rastreabilidade usadas no cadastro da comunidade.

## Estado atual

Os documentos de identidade da inscricao sao armazenados diretamente no PostgreSQL como `BYTEA`.
Cada arquivo recebe hash SHA-256 e metadados suficientes para auditoria.

## Garantias implementadas

### 1. Integridade transacional

- documento e registro entram na mesma transacao
- nao existe persistencia parcial entre banco e arquivo
- rollback reverte o conjunto inteiro

### 2. Integridade binaria

- o hash SHA-256 do documento e salvo junto com o arquivo
- a leitura recalcula o hash e compara com o valor persistido
- qualquer divergencia bloqueia o retorno

### 3. Rastreabilidade

- nome, CPF, email e endereco ficam vinculados ao documento
- `terms_accepted_at`, IP, user-agent e headers auxiliares sao registrados
- a inscricao guarda hash do conteudo dos termos aceitos
- a inscricao guarda fingerprint da submissao

### 4. Backup unico

- os documentos entram no backup do PostgreSQL
- nao ha dependencia de bucket externo para recuperar o documento da inscricao

## Campos relevantes em `registrations`

- `id_document_data`
- `id_document_hash`
- `id_document_size_bytes`
- `id_document_original_filename`
- `id_document_mime_type`
- `terms_accepted`
- `terms_accepted_at`
- `terms_accepted_ip`
- `terms_user_agent`
- `terms_content_hash_at_acceptance`
- `terms_version_at_acceptance`
- `registration_fingerprint`

## Endpoint de documento

Rota: `GET /api/documents/[id]`

Comportamento atual:

- exige sessao admin valida
- retorna o documento apos verificar a integridade
- redireciona para `/admin/login?next=/api/documents/[id]` quando nao ha autenticacao

Isso precisa permanecer documentado porque e um ponto de risco operacional e juridico.
O acesso publico agora fica restrito ao caminho intermediario `/acesso-documento/[id]`, que leva ao login e depois a `/admin/editais?tab=pendentes`.

## Limites e riscos

- o endpoint de download direto ainda expande a superficie de acesso se a sessao admin for vazada
- a seguranca agora depende de auth + integridade do hash
- a unicidade de email e CPF ainda tem janela de corrida por ser validacao de aplicacao e nao somente por constraint unica consolidada

## Como consultar

```sql
SELECT
  id,
  full_name,
  cpf,
  id_document_hash,
  id_document_size_bytes,
  id_document_original_filename,
  created_at
FROM registrations
WHERE id = 123;
```

## Observacao final

Este documento descreve o que o sistema faz hoje. Nao documente como garantia algo que ainda e apenas recomendacao.
