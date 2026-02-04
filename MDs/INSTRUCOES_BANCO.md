# 🗄️ Instruções para Criar Banco de Dados

> ⚠️ **IMPORTANTE**: Antes de executar qualquer comando, certifique-se de que o arquivo `.env` está configurado com as variáveis de ambiente corretas (`DB_HOST`, `DB_USER`, `DB_PASSWORD`, etc.).

## Opção 1: Via pgAdmin (Recomendado)

1. **Abra o pgAdmin**
2. **Conecte ao servidor**
3. **Clique com botão direito** no banco `` (banco padrão)
4. **Selecione**: Query Tool
5. **Execute o script**: `database/migrations/000_create_database.sql`
6. **Ou execute diretamente**:
   ```sql
   CREATE DATABASE landing_page_comunidade;
   ```

## Opção 2: Via psql (Linha de Comando)

```powershell
# Conecte ao banco postgres
$env:PGPASSWORD="$env:DB_PASSWORD"
psql -h $env:DB_HOST -U $env:DB_USER -d postgres -c "CREATE DATABASE landing_page_comunidade;"
```

## Opção 3: Via Script TypeScript

**Execute no diretório do projeto:**
```powershell
npx tsx scripts/create-database.ts
```

---

## ✅ Após Criar o Banco

### 1. Atualize o .env

Edite o arquivo `.env` e altere:

```env
DB_NAME=landing_page_comunidade
```

E também atualize o `DATABASE_URL`:

```env
DATABASE_URL="postgresql://$DB_USER:$DB_PASSWORD@$DB_HOST:$DB_PORT/$DB_NAME"
```

### 2. Execute as Migrations

Depois de criar o banco e atualizar o `.env`, execute:

```powershell
npx tsx scripts/setup-database.ts
```

Este script irá:
- ✅ Criar as tabelas (`terms_of_use`, `registrations`, `registration_invites`)
- ✅ Inserir o termo inicial (v1.0)
- ✅ Verificar se tudo está funcionando

---

## 📋 Checklist

- [ ] Banco `landing_page_comunidade` criado
- [ ] `.env` atualizado com `DB_NAME=landing_page_comunidade`
- [ ] `.env` atualizado com `DATABASE_URL` correto
- [ ] Migrations executadas (`npx tsx scripts/setup-database.ts`)
- [ ] Tabelas criadas e verificadas

---

## 🔍 Verificar se Funcionou

Execute no pgAdmin ou psql:

```sql
-- Conecte ao banco landing_page_comunidade
\c landing_page_comunidade

-- Verificar tabelas
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public';

-- Deve retornar:
-- terms_of_use
-- registrations  
-- registration_invites

-- Verificar termo inserido
SELECT id, version, title, is_active FROM terms_of_use;
```

