/**
 * GET /api/editais/documento/:id/link
 * Redirecionamento permanente para visualização de um documento do Edital PPI.
 * Gera uma URL assinada nova a cada acesso (nunca expira do ponto de vista de quem
 * usa o link), para uso em locais que precisam de um link estável — como a planilha
 * de acompanhamento do time interno. Sem autenticação por token do candidato,
 * mesmo padrão já adotado em /api/documents/[id] para documentos de inscrição.
 */

import { NextRequest, NextResponse } from 'next/server';
import { queryOne } from '@/lib/db';
import { getSignedFileUrl } from '@/lib/s3';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const documentId = Number.parseInt(id, 10);

    if (!Number.isFinite(documentId)) {
      return NextResponse.json({ error: 'Documento inválido' }, { status: 400 });
    }

    const document = await queryOne<{ s3_key: string }>(
      `SELECT s3_key
       FROM edital_submission_documents
       WHERE id = $1
       LIMIT 1`,
      [documentId]
    );

    if (!document) {
      return NextResponse.json({ error: 'Documento não encontrado' }, { status: 404 });
    }

    // Sem downloadFileName: abre em visualização inline no navegador (PDF/imagem),
    // já que este link é usado pelo time pra revisar o conteúdo, não pra baixar.
    const url = await getSignedFileUrl(document.s3_key, 300);

    return NextResponse.redirect(url, {
      status: 302,
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (error) {
    console.error('[editais-documento-link] Erro ao gerar link:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
