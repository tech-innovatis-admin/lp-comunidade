/**
 * Pool de conexão somente-leitura para o banco compartilhado de
 * usuários/plataformas da Innovatis (mesmo RDS deste projeto, database
 * separado — ver PLATFORMS_DB_* no .env). Usado só pelo login do painel
 * admin (app/api/admin/login/route.ts) para checar usuário/senha/tag de
 * acesso — este projeto nunca escreve na tabela `users`.
 */

import { Pool } from 'pg';

const platformsPool = new Pool({
  host: process.env.PLATFORMS_DB_HOST,
  port: parseInt(process.env.PLATFORMS_DB_PORT || '5432'),
  database: process.env.PLATFORMS_DB_NAME,
  user: process.env.PLATFORMS_DB_USER,
  password: process.env.PLATFORMS_DB_PASSWORD,
  ssl: process.env.PLATFORMS_DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  max: 5,
  idleTimeoutMillis: 30000,
  // Mesmo motivo do timeout em lib/db.ts: RDS remoto, latencia notavel a partir do dev local.
  connectionTimeoutMillis: 10000,
});

platformsPool.on('error', (err) => {
  console.error('❌ Erro inesperado no pool do banco de plataformas:', err);
});

export interface PlatformUserRow {
  id: number;
  username: string | null;
  name: string;
  hash: string;
  platforms: string[] | null;
}

export async function findPlatformUserByUsername(username: string): Promise<PlatformUserRow | null> {
  const result = await platformsPool.query<PlatformUserRow>(
    `SELECT id, username, name, hash, platforms
     FROM users
     WHERE LOWER(username) = LOWER($1)
     LIMIT 1`,
    [username]
  );

  return result.rows[0] || null;
}
