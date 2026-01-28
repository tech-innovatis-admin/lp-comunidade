/**
 * GET /api/health
 * Endpoint para verificar se as configurações estão corretas
 */

import { NextResponse } from 'next/server';
import { queryOne } from '@/lib/db';

export async function GET() {
  const checks = {
    database: false,
    s3: false,
    terms: false,
    env: {
      DB_HOST: !!process.env.DB_HOST,
      DB_NAME: !!process.env.DB_NAME,
      AWS_ACCESS_KEY_ID: !!process.env.AWS_ACCESS_KEY_ID,
      AWS_S3_BUCKET_NAME: !!process.env.AWS_S3_BUCKET_NAME,
      GOOGLE_CREDENTIALS_S3_BUCKET: !!process.env.GOOGLE_CREDENTIALS_S3_BUCKET,
      GOOGLE_SHEET_NAME: !!process.env.GOOGLE_SHEET_NAME,
    }
  };

  // Teste banco de dados
  try {
    const result = await queryOne<{ now: Date }>('SELECT NOW() as now');
    checks.database = !!result;
  } catch (error) {
    console.error('Erro ao conectar banco:', error);
  }

  // Teste S3 (verifica se credenciais existem)
  try {
    const { S3Client, ListBucketsCommand } = await import('@aws-sdk/client-s3');

    const s3Config: any = {
      region: process.env.AWS_REGION || 'us-east-1',
    };

    if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
      s3Config.credentials = {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      };
    }

    const s3Client = new S3Client(s3Config);
    const result = await s3Client.send(new ListBucketsCommand({}));
    checks.s3 = (result.Buckets?.length || 0) > 0;
  } catch (error) {
    console.error('Erro ao conectar S3:', error);
  }

  // Teste termos
  try {
    const term = await queryOne<{ id: number }>('SELECT id FROM terms_of_use WHERE is_active = TRUE LIMIT 1');
    checks.terms = !!term;
  } catch (error) {
    console.error('Erro ao buscar termos:', error);
  }

  const allOk = checks.database && checks.s3 && checks.terms;

  return NextResponse.json({
    status: allOk ? 'ok' : 'error',
    checks,
    message: allOk ? 'Todas as configurações estão OK!' : 'Algumas configurações falharam'
  });
}

