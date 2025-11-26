import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

function calculateHash(content: string): string {
  return crypto.createHash('sha256').update(content, 'utf8').digest('hex');
}

async function updateTermV1_0() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:InnovaLabs86@nexus-db-prod.ci1kcsyewm34.us-east-1.rds.amazonaws.com:5432/landing_page_comunidade',
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('📝 Lendo arquivo v1.0.html atualizado...');
    const termsFilePath = path.join(process.cwd(), 'database/terms/v1.0.html');
    const content = fs.readFileSync(termsFilePath, 'utf-8');
    
    const contentHash = calculateHash(content);
    console.log('✅ Novo Hash calculado:', contentHash);

    console.log('🔄 Atualizando versão v1.0 no banco...');
    await pool.query(`
      UPDATE terms_of_use 
      SET content = $1, content_hash = $2, created_at = NOW()
      WHERE version = 'v1.0'
    `, [content, contentHash]);
    
    console.log('✅ Versão v1.0 atualizada com sucesso!');
    console.log('   - Multa: 20% do Valor Global Líquido');
    
  } catch (error) {
    console.error('❌ Erro:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

updateTermV1_0();

