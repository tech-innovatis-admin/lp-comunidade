/**
 * GET /api/editais/documento/:id/thumbnail
 * Serve a miniatura (JPEG) de um documento do Edital PPI, gerando e
 * cacheando no S3 na primeira visita. Servido pelo próprio domínio (sem
 * redirect para o S3) para satisfazer o img-src 'self' do CSP sem precisar
 * allowlistar o bucket. Protegido pela mesma sessão admin das rotas /link.
 */

import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db';
import { getFileBytes, uploadFileToKey } from '@/lib/s3';
import { verifyAdminSessionToken, ADMIN_SESSION_COOKIE_NAME } from '@/lib/admin-auth';
import { generateThumbnailFromPdf, generateThumbnailFromImage } from '@/lib/thumbnail';

interface DocumentRow {
  id: number;
  submission_id: number;
  s3_key: string;
  mime_type: string;
  thumbnail_s3_key: string | null;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = request.cookies.get(ADMIN_SESSION_COOKIE_NAME)?.value;
    if (!verifyAdminSessionToken(token)) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { id } = await params;
    const documentId = Number.parseInt(id, 10);

    if (!Number.isFinite(documentId)) {
      return NextResponse.json({ error: 'Documento inválido' }, { status: 400 });
    }

    const document = await queryOne<DocumentRow>(
      `SELECT id, submission_id, s3_key, mime_type, thumbnail_s3_key
       FROM edital_submission_documents
       WHERE id = $1
       LIMIT 1`,
      [documentId]
    );

    if (!document) {
      return NextResponse.json({ error: 'Documento não encontrado' }, { status: 404 });
    }

    let thumbnailKey = document.thumbnail_s3_key;

    if (!thumbnailKey) {
      const originalBytes = await getFileBytes(document.s3_key);
      const thumbnailBuffer = document.mime_type === 'application/pdf'
        ? await generateThumbnailFromPdf(originalBytes)
        : await generateThumbnailFromImage(originalBytes);

      thumbnailKey = `edital-submissions/${document.submission_id}/thumbnails/${document.id}.jpg`;
      await uploadFileToKey(thumbnailBuffer, thumbnailKey, 'image/jpeg');

      await query(
        `UPDATE edital_submission_documents SET thumbnail_s3_key = $1 WHERE id = $2`,
        [thumbnailKey, documentId]
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
    console.error('[editais-documento-thumbnail] Erro ao gerar miniatura:', error);
    return NextResponse.json({ error: 'Erro ao gerar miniatura' }, { status: 500 });
  }
}
