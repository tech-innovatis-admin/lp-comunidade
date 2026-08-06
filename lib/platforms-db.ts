/**
 * Pool para o banco compartilhado de usuários/plataformas Innovatis
 * (PLATFORMS_DB_*). Usado pelo login do painel admin (senha + SSO Cognito).
 * Escrita restrita ao vínculo `cognito_sub` no fluxo SSO.
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
  connectionTimeoutMillis: 10000,
});

platformsPool.on('error', (err) => {
  console.error('❌ Erro inesperado no pool do banco de plataformas:', err);
});

export const EDITAL_ADMIN_PLATFORM_TAG = 'edital-admin';

export interface PlatformUserRow {
  id: number;
  username: string | null;
  name: string;
  email: string | null;
  hash: string;
  platforms: string[] | null;
  cognito_sub: string | null;
}

export async function findPlatformUserByUsername(username: string): Promise<PlatformUserRow | null> {
  const result = await platformsPool.query<PlatformUserRow>(
    `SELECT id::integer, username, name, email, hash, platforms, cognito_sub
     FROM users
     WHERE LOWER(username) = LOWER($1)
     LIMIT 1`,
    [username]
  );

  return result.rows[0] || null;
}

export async function findPlatformUserByCognitoSub(sub: string): Promise<PlatformUserRow | null> {
  const result = await platformsPool.query<PlatformUserRow>(
    `SELECT id::integer, username, name, email, hash, platforms, cognito_sub
     FROM users
     WHERE cognito_sub = $1
     LIMIT 1`,
    [sub]
  );

  return result.rows[0] || null;
}

export async function findPlatformUserByEmail(email: string): Promise<PlatformUserRow | null> {
  const result = await platformsPool.query<PlatformUserRow>(
    `SELECT id::integer, username, name, email, hash, platforms, cognito_sub
     FROM users
     WHERE LOWER(email) = LOWER($1)
     LIMIT 1`,
    [email]
  );

  return result.rows[0] || null;
}

export async function linkPlatformUserCognitoSub(userId: number, sub: string): Promise<void> {
  await platformsPool.query(
    `UPDATE users
     SET cognito_sub = $2,
         auth_provider = CASE
           WHEN auth_provider = 'LEGACY' THEN 'HYBRID'
           ELSE auth_provider
         END,
         auth_migrated_at = COALESCE(auth_migrated_at, NOW()),
         auth_last_sync_at = NOW(),
         updated_at = NOW()
     WHERE id = $1
       AND (cognito_sub IS NULL OR cognito_sub = $2)`,
    [userId, sub]
  );
}

export function hasEditalAdminAccess(user: PlatformUserRow | null | undefined): boolean {
  return !!user && (user.platforms || []).includes(EDITAL_ADMIN_PLATFORM_TAG);
}
