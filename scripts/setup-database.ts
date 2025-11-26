/**
 * Script para configurar o banco de dados
 * Executa migrations e insere termo inicial
 */

import 'dotenv/config';
import { query, queryOne } from '../lib/db';
import { calculateHash } from '../lib/utils';
import * as fs from 'fs';
import * as path from 'path';

async function setupDatabase() {
  try {
    console.log('🚀 Iniciando setup do banco de dados...\n');

    // 1. Verifica se as tabelas já existem
    const tablesCheck = await queryOne<{ count: string }>(
      `SELECT COUNT(*) as count FROM information_schema.tables 
       WHERE table_schema = 'public' 
       AND table_name IN ('terms_of_use', 'registrations', 'registration_invites')`
    );

    if (parseInt(tablesCheck?.count || '0') < 3) {
      console.log('📄 Executando migration 001_create_tables.sql...');
      const migration1 = fs.readFileSync(
        path.join(process.cwd(), 'database/migrations/001_create_tables.sql'),
        'utf-8'
      );
      
      // Remove comentários e executa o SQL completo
      const cleanSQL = migration1
        .split('\n')
        .filter(line => !line.trim().startsWith('--'))
        .join('\n')
        .trim();

      // Executa o SQL completo de uma vez
      try {
        await query(cleanSQL);
      } catch (error: any) {
        // Ignora erros de "já existe" mas mostra outros
        if (!error.message?.includes('already exists') && 
            !error.message?.includes('duplicate') &&
            !error.message?.includes('relation')?.includes('already exists')) {
          console.error('Erro ao executar migration:', error.message);
          throw error;
        }
      }
      console.log('✅ Tabelas criadas com sucesso!\n');
    } else {
      console.log('✅ Tabelas já existem.\n');
    }

    // 2. Verifica se já existe termo ativo
    const activeTerm = await queryOne<{ id: number }>(
      `SELECT id FROM terms_of_use WHERE is_active = TRUE LIMIT 1`
    );

    if (!activeTerm) {
      console.log('📝 Inserindo termo inicial...');
      
      // Lê o arquivo HTML dos termos
      const termsFilePath = path.join(process.cwd(), 'database/terms/v1.0.html');
      let content = '';

      if (fs.existsSync(termsFilePath)) {
        content = fs.readFileSync(termsFilePath, 'utf-8');
      } else {
        // Fallback: usa o conteúdo do TermsModal
        content = `
          <h1>TERMO DE ADESÃO, RECIPROCIDADE E COMPROMISSO DE REPASSE</h1>
          <p>Este Termo estabelece as condições de Adesão, Reciprocidade, Responsabilidade, Confidencialidade, Sigilo e Repasse de Remuneração aplicáveis à participação e atuação do PARCEIRO (pessoa física ou jurídica) em projetos ou negócios prospectados e/ou intermediados pela INNOVATIS GESTÃO & CONSULTORIA LTDA., por meio da sua rede de comunicação (Comunidade WhatsApp).</p>
          <p>Ao ingressar no grupo de comunicação e/ou aceitar participar de qualquer iniciativa de prospecção ou projeto intermediado pela INNOVATIS, o PARCEIRO adere e concorda com as seguintes cláusulas:</p>
          <h2>1. Do Objeto e Compromisso</h2>
          <p>O PARCEIRO se compromete a celebrar e executar projetos de Extensão, Pesquisa e Desenvolvimento, ou outros correlatos, que tenham sido prospectados, captados ou intermediados pela INNOVATIS GESTÃO & CONSULTORIA LTDA.</p>
          <h2>2. Do Repasse e Remuneração da INNOVATIS</h2>
          <p>Em reconhecimento ao serviço de prospecção, captação e/ou intermediação de projetos prestado pela INNOVATIS, esta fará jus a uma remuneração de sucesso (Success Fee), estabelecida da seguinte forma:</p>
          <h3>2.1. Percentual de Repasse:</h3>
          <p>O PARCEIRO se compromete a repassar à INNOVATIS GESTÃO & CONSULTORIA LTDA 10% (dez por cento) do Valor Global Líquido de cada projeto efetivamente contratado e executado cuja origem ou intermediação tenha sido comprovadamente da INNOVATIS.</p>
          <h3>2.2. Base de Cálculo:</h3>
          <p>O Valor Global Líquido do projeto corresponde ao valor total do contrato/projeto recebido pelo PARCEIRO, excluindo-se impostos, taxas e custos operacionais que não componham a base de cálculo de remuneração do PARCEIRO.</p>
          <h3>2.3. Condição de Pagamento (Repasse):</h3>
          <p>O repasse dos 10% (dez por cento) para a INNOVATIS será efetuado em até 5 (cinco) dias úteis após o recebimento dos valores (créditos) correspondentes ao projeto pelo PARCEIRO EXECUTOR, mediante apresentação da documentação fiscal pertinente (Nota Fiscal de Prestação de Serviços ou outro documento legalmente aceito) pela INNOVATIS GESTÃO & CONSULTORIA LTDA.</p>
          <h2>3. Do Sigilo e da Confidencialidade</h2>
          <p>O PARCEIRO reconhece que terá acesso a Informações Confidenciais, que incluem, mas não se limitam a:</p>
          <ul>
            <li>Dados e informações de prospecção, negociação e elaboração de projetos.</li>
            <li>Estratégias de clientes, orçamentos e planos de trabalho.</li>
            <li>Qualquer informação técnica, comercial, financeira ou de know-how da INNOVATIS GESTÃO & CONSULTORIA LTDA e de seus PARCEIROS/clientes.</li>
          </ul>
          <p>O PARCEIRO se compromete a manter a mais completa confidencialidade e sigilo sobre quaisquer Informações Confidenciais obtidas, mesmo após o término da relação de parceria, sob pena de responsabilidade civil e criminal pelos danos causados.</p>
          <p>Caso o PARCEIRO viole, total ou parcialmente, o dever de confidencialidade e sigilo estabelecido, divulgando ou utilizando indevidamente as informações confidenciais a que teve acesso, incorrerá em multa não compensatória equivalente a 20% (vinte por cento) do Valor Global Líquido do projeto relacionado à violação.</p>
          <h2>4. Das Disposições Gerais</h2>
          <h3>4.1. Inexistência de Vínculo:</h3>
          <p>Fica estabelecida a total inexistência de vínculo trabalhista entre as partes, não havendo qualquer relação de subordinação.</p>
          <h3>4.2. Lei Aplicável e Foro:</h3>
          <p>Aplicam-se a este Termo as disposições do Código Civil Brasileiro. Fica eleito o foro de João Pessoa/PB para dirimir quaisquer conflitos.</p>
        `;
      }

      const contentHash = calculateHash(content);
      const version = 'v1.0';
      const title = 'Termo de Adesão, Reciprocidade e Compromisso de Repasse';

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

      console.log('✅ Termo inicial inserido com sucesso!');
      console.log(`   Versão: ${version}`);
      console.log(`   Hash: ${contentHash.substring(0, 16)}...\n`);
    } else {
      console.log('✅ Termo ativo já existe.\n');
    }

    // 3. Verifica estrutura das tabelas
    console.log('📊 Verificando estrutura das tabelas...');
    const tables = await query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('terms_of_use', 'registrations', 'registration_invites')
      ORDER BY table_name
    `);

    console.log(`✅ Tabelas encontradas: ${tables.map((t: any) => t.table_name).join(', ')}\n`);

    console.log('🎉 Setup do banco de dados concluído com sucesso!');
  } catch (error) {
    console.error('❌ Erro ao configurar banco de dados:', error);
    process.exit(1);
  }
}

setupDatabase();

