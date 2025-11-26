# 🗄️ Executar Migration Manualmente

O script automático está tendo problemas ao dividir o SQL. Execute manualmente:

## Opção 1: Via pgAdmin (Recomendado)

1. **Abra o pgAdmin**
2. **Conecte ao servidor** RDS
3. **Selecione o banco** `landing_page_comunidade`
4. **Clique com botão direito** → **Query Tool**
5. **Abra e execute** o arquivo: `database/migrations/001_create_tables_simple.sql`
6. **Verifique** se as 3 tabelas foram criadas

## Opção 2: Via psql (no seu terminal)

```powershell
$env:PGPASSWORD="InnovaLabs86"
Get-Content "database\migrations\001_create_tables_simple.sql" | psql -h nexus-db-prod.ci1kcsyewm34.us-east-1.rds.amazonaws.com -U postgres -d landing_page_comunidade
```

## Depois de criar as tabelas

Execute para inserir o termo inicial:

```powershell
npx tsx scripts/setup-database.ts
```

Ou insira manualmente via pgAdmin usando o conteúdo de `database/terms/v1.0.html`

