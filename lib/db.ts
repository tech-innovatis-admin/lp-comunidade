/**
 * Utilitário de conexão com PostgreSQL
 * Gerencia pool de conexões e queries
 */

import { Pool } from 'pg';

// Configuração do pool de conexões
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'innovanation',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  max: 20, // Máximo de conexões no pool
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

// Teste de conexão ao inicializar
pool.on('connect', () => {
  console.log('✅ Conectado ao PostgreSQL');
});

pool.on('error', (err) => {
  console.error('❌ Erro inesperado no pool do PostgreSQL:', err);
});

/**
 * Executa uma query e retorna os resultados
 */
export async function query<T = any>(
  text: string,
  params?: any[]
): Promise<T[]> {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    console.log(`📊 Query executada em ${duration}ms:`, text.substring(0, 50));
    return res.rows;
  } catch (error) {
    console.error('❌ Erro na query:', error);
    throw error;
  }
}

/**
 * Executa uma query e retorna apenas o primeiro resultado
 */
export async function queryOne<T = any>(
  text: string,
  params?: any[]
): Promise<T | null> {
  const results = await query<T>(text, params);
  return results.length > 0 ? results[0] : null;
}

/**
 * Executa uma transação
 */
export async function transaction<T>(
  callback: (client: any) => Promise<T>
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export default pool;

