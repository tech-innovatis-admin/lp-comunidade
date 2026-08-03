# Instrucoes para Criar o Banco

## Antes de comecar

Confirme que o `.env` principal esta configurado com `DB_HOST`, `DB_USER`, `DB_PASSWORD` e `DB_NAME`.

## Opcao 1: pgAdmin

1. Abra o pgAdmin
2. Conecte ao servidor PostgreSQL
3. Crie o banco `landing_page_comunidade`
4. Execute as migrations em ordem

## Opcao 2: psql

```powershell
$env:PGPASSWORD="$env:DB_PASSWORD"
psql -h $env:DB_HOST -U $env:DB_USER -d postgres -c "CREATE DATABASE landing_page_comunidade;"
```

## Opcao 3: script local

```powershell
npx tsx scripts/create-database.ts
```

## Depois de criar o banco

1. Ajuste `DB_NAME=landing_page_comunidade`
2. Confirme `DATABASE_URL`
3. Rode o setup de banco

```powershell
npx tsx scripts/setup-database.ts
```

## O que o setup cria

- `terms_of_use`
- `registrations`
- `edital_submissions`
- `edital_submission_documents`
- views de apoio

Observacao: `registration_invites` pode aparecer em migrations antigas, mas nao faz parte do fluxo atual.

## Checklist

- [ ] banco criado
- [ ] `.env` atualizado
- [ ] migrations executadas
- [ ] termo ativo inserido
- [ ] tabelas principais conferidas

## Verificacao rapida

```sql
\c landing_page_comunidade

SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;

SELECT id, version, title, is_active
FROM terms_of_use
ORDER BY id;
```
