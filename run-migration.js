const { Pool } = require('pg');
const fs = require('fs');
<<<<<<< HEAD
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:InnovaLabs86@nexus-db-prod.cmjoumo2iiux.us-east-1.rds.amazonaws.com:5432/landing_page_comunidade',
  ssl: { rejectUnauthorized: false }
=======
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
>>>>>>> b7fc44c70e5ca8dd4ff10496453f409deb8c5ce7
});

(async () => {
  try {
<<<<<<< HEAD
    const migrations = [
      'database/migrations/008_add_extra_legal_fields.sql',
      'database/migrations/008_add_address_fields.sql'
    ];

    for (const file of migrations) {
      console.log(`📄 Executando: ${file}...`);
      const sql = fs.readFileSync(file, 'utf8');
      await pool.query(sql);
      console.log(`✅ Migration ${file} executada com sucesso!`);
    }
=======
    console.log('🚀 Executando migration 008...');
    
    const sql = fs.readFileSync('database/migrations/008_add_extra_legal_fields.sql', 'utf8');
    await pool.query(sql);
    
    console.log('✅ Migration 008 executada com sucesso!');
    
>>>>>>> b7fc44c70e5ca8dd4ff10496453f409deb8c5ce7
  } catch (error) {
    console.error('❌ Erro na migration:', error.message);
    
  } finally {
    await pool.end();
  }
})();