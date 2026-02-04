const { Pool } = require('pg');
const fs = require('fs');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:InnovaLabs86@nexus-db-prod.cmjoumo2iiux.us-east-1.rds.amazonaws.com:5432/landing_page_comunidade',
  ssl: { rejectUnauthorized: false }
});

(async () => {
  try {
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
  } catch (error) {
    console.error('❌ Erro na migration:', error.message);
  } finally {
    await pool.end();
  }
})();

