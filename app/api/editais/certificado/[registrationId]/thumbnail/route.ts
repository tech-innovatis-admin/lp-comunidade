/**
 * GET /api/editais/certificado/:registrationId/thumbnail
 * Serve a miniatura (JPEG) do Certificado de Inscrição na Comunidade,
 * gerando e cacheando no S3 na primeira visita. Mesmo padrão de
 * /api/editais/documento/[id]/thumbnail — servido pelo próprio domínio,
 * sem precisar allowlistar o S3 no CSP.
 */

import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db';
import { getFileBytes, uploadFileToKey } from '@/lib/s3';
import { verifyAdminSessionToken, ADMIN_SESSION_COOKIE_NAME } from '@/lib/admin-auth';
import { generateThumbnailFromPdf } from '@/lib/thumbnail';

interface RegistrationRow {
  id: number;
  community_certificate_s3_key: string | null;
  community_certificate_thumbnail_s3_key: string | null;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ registrationId: string }> }
) {
  try {
    const token = request.cookies.get(ADMIN_SESSION_COOKIE_NAME)?.value;
    if (!verifyAdminSessionToken(token)) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { registrationId } = await params;
    const id = Number.parseInt(registrationId, 10);

    if (!Number.isFinite(id)) {
      return NextResponse.json({ error: 'Cadastro inválido' }, { status: 400 });
    }

    const registration = await queryOne<RegistrationRow>(
      `SELECT id, community_certificate_s3_key, community_certificate_thumbnail_s3_key
       FROM registrations
       WHERE id = $1
       LIMIT 1`,
      [id]
    );

    if (!registration?.community_certificate_s3_key) {
      return NextResponse.json({ error: 'Certificado não encontrado' }, { status: 404 });
    }

    let thumbnailKey = registration.community_certificate_thumbnail_s3_key;

    if (!thumbnailKey) {
      const originalBytes = await getFileBytes(registration.community_certificate_s3_key);
      const thumbnailBuffer = await generateThumbnailFromPdf(originalBytes);

      thumbnailKey = `community-certificates/${id}-thumb.jpg`;
      await uploadFileToKey(thumbnailBuffer, thumbnailKey, 'image/jpeg');

      await query(
        `UPDATE registrations SET community_certificate_thumbnail_s3_key = $1 WHERE id = $2`,
        [thumbnailKey, id]
      );
    }

    const thumbnailBytes = await getFileBytes(thumbnailKey);

    return new NextResponse(thumbnailBytes, {
      status: 200,
      headers: {
        'Content-Type': 'image/jpeg',
        'Cache-Control': 'private, max-age=3600',
      },
    });
  } catch (error) {
    console.error('[editais-certificado-thumbnail] Erro ao gerar miniatura:', error);
    return NextResponse.json({ error: 'Erro ao gerar miniatura' }, { status: 500 });
  }
}
