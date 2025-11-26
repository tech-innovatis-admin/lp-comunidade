/**
 * Script para inserir/atualizar termos de uso no banco
 * Uso: npx tsx scripts/insert-term.ts
 */

import { query, queryOne } from '../lib/db';
import { calculateHash } from '../lib/utils';
import * as fs from 'fs';
import * as path from 'path';

async function insertTerm() {
  try {
    // Lê o conteúdo dos termos de um arquivo (ou pode ser passado como argumento)
    const termsFilePath = process.argv[2] || 'database/terms/v1.0.html';
    
    if (!fs.existsSync(termsFilePath)) {
      console.error('❌ Arquivo de termos não encontrado:', termsFilePath);
      console.log('💡 Uso: npx tsx scripts/insert-term.ts [caminho-do-arquivo]');
      process.exit(1);
    }

    const content = fs.readFileSync(termsFilePath, 'utf-8');
    const version = process.argv[3] || 'v1.0';
    const title = process.argv[4] || 'Termo de Adesão, Reciprocidade e Compromisso de Repasse';

    // Calcula hash do conteúdo
    const contentHash = calculateHash(content);

    // Verifica se já existe uma versão ativa
    const activeTerm = await queryOne<{ id: number }>(
      `SELECT id FROM terms_of_use WHERE is_active = TRUE LIMIT 1`
    );

    // Desativa versões anteriores se houver
    if (activeTerm) {
      await query(`UPDATE terms_of_use SET is_active = FALSE WHERE is_active = TRUE`);
      console.log('📝 Versões anteriores desativadas');
    }

    // Insere nova versão
    await query(
      `
        INSERT INTO terms_of_use (version, title, content, content_hash, is_active)
        VALUES ($1, $2, $3, $4, TRUE)
        ON CONFLICT (version) 
        DO UPDATE SET 
          title = EXCLUDED.title,
          content = EXCLUDED.content,
          content_hash = EXCLUDED.content_hash,
          is_active = TRUE,
          created_at = NOW()
      `,
      [version, title, content, contentHash]
    );

    console.log('✅ Termo inserido/atualizado com sucesso!');
    console.log(`   Versão: ${version}`);
    console.log(`   Hash: ${contentHash}`);
  } catch (error) {
    console.error('❌ Erro ao inserir termo:', error);
    process.exit(1);
  }
}

insertTerm();

