#!/bin/bash
# Script de migração do banco de dados
# Uso: ./scripts/migrate.sh

set -e

echo "🚀 Iniciando migração do banco de dados..."

# Carrega variáveis de ambiente
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

# Verifica se as variáveis estão definidas
if [ -z "$DB_HOST" ] || [ -z "$DB_NAME" ] || [ -z "$DB_USER" ]; then
    echo "❌ Erro: Variáveis de ambiente do banco de dados não configuradas"
    exit 1
fi

# Executa migrations em ordem
for migration in database/migrations/*.sql; do
    if [ -f "$migration" ]; then
        echo "📄 Executando: $migration"
        PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "${DB_PORT:-5432}" -U "$DB_USER" -d "$DB_NAME" -f "$migration"
    fi
done

echo "✅ Migração concluída!"

