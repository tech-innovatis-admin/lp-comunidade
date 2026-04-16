/**
 * GET /api/health
 * Endpoint para verificar se as configurações estão corretas
 */

import { NextRequest, NextResponse } from 'next/server';
import { HeadBucketCommand, S3Client } from '@aws-sdk/client-s3';
import { queryOne } from '@/lib/db';
import { applyNoStore, isInternalRequest } from '@/lib/security';

export async function GET(request: NextRequest) {
  const providedToken = request.headers.get('x-health-token');
  const expectedToken = process.env.HEALTHCHECK_TOKEN;
  const isAuthorized =
    isInternalRequest(request) ||
    (expectedToken !== undefined && expectedToken.length > 0 && providedToken === expectedToken);

  if (!isAuthorized) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const checks = {
    database: false,
    s3: false,
    terms: false,
  };

  try {
    const result = await queryOne<{ now: Date }>('SELECT NOW() as now');
    checks.database = !!result;
  } catch (error) {
    console.error('Erro ao conectar banco:', error);
  }

  try {
    const s3Config: any = {
      region: process.env.AWS_REGION || 'us-east-1',
    };

    if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
      s3Config.credentials = {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      };
    }

    const bucketName = process.env.AWS_S3_BUCKET_NAME;
    if (bucketName) {
      const s3Client = new S3Client(s3Config);
      await s3Client.send(new HeadBucketCommand({ Bucket: bucketName }));
      checks.s3 = true;
    }
  } catch (error) {
    console.error('Erro ao conectar S3:', error);
  }

  try {
    const term = await queryOne<{ id: number }>('SELECT id FROM terms_of_use WHERE is_active = TRUE LIMIT 1');
    checks.terms = !!term;
  } catch (error) {
    console.error('Erro ao buscar termos:', error);
  }

  const allOk = checks.database && checks.s3 && checks.terms;
  const response = NextResponse.json(
    {
      status: allOk ? 'ok' : 'error',
      checks,
      timestamp: new Date().toISOString(),
    },
    { status: allOk ? 200 : 503 }
  );

  return applyNoStore(response);
}
