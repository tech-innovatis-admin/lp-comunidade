const { Pool } = require('pg');
const fs = require('fs');

require('dotenv').config();

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL nao configurada.');
  console.error('Exemplo: DATABASE_URL=postgresql://usuario:senha@host:porta/database');
  process.exit(1);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

(async () => {
  try {
    const migrations = [
      'database/migrations/008_add_extra_legal_fields.sql',
      'database/migrations/008_add_address_fields.sql',
      'database/migrations/009_create_edital_submissions.sql',
      'database/migrations/010_add_community_certificate_to_registrations.sql',
      'database/migrations/011_add_thumbnail_support.sql',
      'database/migrations/012_add_edital_evaluation.sql'
    ];

    for (const file of migrations) {
      console.log(`Executando: ${file}...`);
      const sql = fs.readFileSync(file, 'utf8');
      await pool.query(sql);
      console.log(`Migration ${file} executada com sucesso.`);
    }
  } catch (error) {
    console.error('Erro na migration:', error.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
})();
