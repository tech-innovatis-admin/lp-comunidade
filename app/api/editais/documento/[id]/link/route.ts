/**
 * GET /api/editais/documento/:id/link
 * Redirecionamento permanente para visualização de um documento do Edital PPI.
 * Gera uma URL assinada nova a cada acesso (nunca expira do ponto de vista de quem
 * usa o link), para uso em locais que precisam de um link estável — como o painel
 * admin e a planilha de acompanhamento do time interno. Protegido por sessão admin
 * (não pelo token do candidato — quem acessa aqui é o time revisando, não quem
 * submeteu a proposta).
 */

import { NextRequest, NextResponse } from 'next/server';
import { queryOne } from '@/lib/db';
import { getSignedFileUrl } from '@/lib/s3';
import { verifyAdminSession } from '@/lib/admin-session';
import { getDocumentAccessDisposition } from '@/lib/edital-document-access';
import { parseDatabaseId } from '@/lib/database-id';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await verifyAdminSession();
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { id } = await params;
    const documentId = parseDatabaseId(id);

    if (documentId === null) {
      return NextResponse.json({ error: 'Documento inválido' }, { status: 400 });
    }

    const document = await queryOne<{ s3_key: string; mime_type: string; original_filename: string | null }>(
      `SELECT s3_key, mime_type, original_filename
       FROM edital_submission_documents
       WHERE id = $1
       LIMIT 1`,
      [documentId]
    );

    if (!document) {
      return NextResponse.json({ error: 'Documento não encontrado' }, { status: 404 });
    }

    const disposition = getDocumentAccessDisposition(document.mime_type, document.original_filename);
    const url = await getSignedFileUrl(document.s3_key, 300, disposition.downloadFileName);

    return NextResponse.redirect(url, {
      status: 302,
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (error) {
    console.error('[editais-documento-link] Erro ao gerar link:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
