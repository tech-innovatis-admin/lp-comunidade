/**
 * Script para criar banco de dados separado para Landing Page Comunidade
 */

import 'dotenv/config';
import { Pool } from 'pg';

async function createDatabase() {
  // Conecta ao banco postgres padrão para criar o novo banco
  const adminPool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: 'postgres', // Conecta ao banco padrão
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  });

  const dbName = 'landing_page_comunidade';

  try {
    console.log('🗄️ Criando banco de dados:', dbName);
    
    // Verifica se o banco já existe
    const checkResult = await adminPool.query(
      `SELECT 1 FROM pg_database WHERE datname = $1`,
      [dbName]
    );

    if (checkResult.rows.length > 0) {
      console.log(`⚠️ Banco de dados '${dbName}' já existe!`);
      console.log('✅ Usando banco existente.');
    } else {
      // Cria o banco de dados
      await adminPool.query(`CREATE DATABASE ${dbName}`);
      console.log(`✅ Banco de dados '${dbName}' criado com sucesso!`);
    }

    await adminPool.end();
    
    // Testa conexão com o novo banco
    console.log('\n🔌 Testando conexão com o novo banco...');
    const testPool = new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      database: dbName,
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || '',
      ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
    });

    const testResult = await testPool.query('SELECT NOW()');
    console.log('✅ Conexão OK!', testResult.rows[0].now);
    
    await testPool.end();
    
    console.log('\n📝 Próximo passo:');
    console.log(`   Atualize o .env com: DB_NAME=${dbName}`);
    
  } catch (error: any) {
    console.error('❌ Erro ao criar banco de dados:', error.message);
    await adminPool.end();
    process.exit(1);
  }
}

createDatabase();

