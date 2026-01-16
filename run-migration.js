const { Pool } = require('pg');
const fs = require('fs');
require('dotenv').config(); // Carrega variáveis de ambiente

// Validação da variável de ambiente obrigatória
if (!process.env.DATABASE_URL) {
  console.error('❌ Erro: Variável DATABASE_URL não configurada');
  console.error('Configure a variável no arquivo .env');
  console.error('Exemplo: DATABASE_URL=postgresql://usuario:senha@host:porta/database');
  process.exit(1);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
 // SSL já está incluído na DATABASE_URL
});

(async () => {
  try {
    console.log('🚀 Executando migration 008...');
    
    const sql = fs.readFileSync('database/migrations/008_add_extra_legal_fields.sql', 'utf8');
    await pool.query(sql);
    
    console.log('✅ Migration 008 executada com sucesso!');
    
  } catch (error) {
    console.error('❌ Erro na migration:', error.message);
    
  } finally {
    await pool.end();
  }
})();