const { Pool } = require('pg');
const fs = require('fs');

const pool = new Pool({
  connectionString: 'postgresql://postgres:InnovaLabs86@nexus-db-prod.ci1kcsyewm34.us-east-1.rds.amazonaws.com:5432/landing_page_comunidade',
  ssl: { rejectUnauthorized: false }
});

(async () => {
  try {
    const sql = fs.readFileSync('database/migrations/008_add_extra_legal_fields.sql', 'utf8');
    await pool.query(sql);
    console.log('✅ Migration 008 executada com sucesso!');
  } catch (error) {
    console.error('❌ Erro na migration:', error.message);
  } finally {
    await pool.end();
  }
})();

