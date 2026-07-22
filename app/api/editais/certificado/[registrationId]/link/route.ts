/**
 * GET /api/editais/certificado/:registrationId/link
 * Redirecionamento permanente para o Certificado de Inscrição na Comunidade,
 * usado na planilha de acompanhamento do time interno. Mesmo padrão sem
 * autenticação extra de /api/editais/documento/[id]/link.
 */

import { NextRequest, NextResponse } from 'next/server';
import { queryOne } from '@/lib/db';
import { getSignedFileUrl } from '@/lib/s3';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ registrationId: string }> }
) {
  try {
    const { registrationId } = await params;
    const id = Number.parseInt(registrationId, 10);

    if (!Number.isFinite(id)) {
      return NextResponse.json({ error: 'Cadastro inválido' }, { status: 400 });
    }

    const registration = await queryOne<{ community_certificate_s3_key: string | null }>(
      `SELECT community_certificate_s3_key
       FROM registrations
       WHERE id = $1
       LIMIT 1`,
      [id]
    );

    if (!registration?.community_certificate_s3_key) {
      return NextResponse.json({ error: 'Certificado não encontrado' }, { status: 404 });
    }

    const url = await getSignedFileUrl(registration.community_certificate_s3_key, 300);

    return NextResponse.redirect(url, {
      status: 302,
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (error) {
    console.error('[editais-certificado-link] Erro ao gerar link:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
