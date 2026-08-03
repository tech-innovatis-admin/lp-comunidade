/**
 * GET /api/documents/:id
 * Endpoint seguro para download de documentos de identidade
 * Agora exige sessão admin; links públicos devem usar /acesso-documento/[id]
 * para chegar ao login e à aba de pendências.
 */

import { NextRequest, NextResponse } from 'next/server';
import { queryOne } from '@/lib/db';
import { calculateFileHash } from '@/lib/utils';
import { ADMIN_SESSION_COOKIE_NAME, verifyAdminSessionToken } from '@/lib/admin-auth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const registrationId = parseInt(id);

    if (!registrationId || isNaN(registrationId)) {
      return NextResponse.json(
        { error: 'ID de inscrição inválido' },
        { status: 400 }
      );
    }

    const token = request.cookies.get(ADMIN_SESSION_COOKIE_NAME)?.value;
    if (!verifyAdminSessionToken(token)) {
      return NextResponse.redirect(
        new URL(`/admin/login?next=${encodeURIComponent(`/api/documents/${registrationId}`)}`, request.url),
        { status: 307 }
      );
    }

    // Busca registro com documento
    const registration = await queryOne<{
      id: number;
      full_name: string;
      cpf: string;
      id_document_data: Buffer;
      id_document_hash: string;
      id_document_mime_type: string;
      id_document_original_filename: string;
      created_at: Date;
    }>(
      `
        SELECT 
          id, full_name, cpf,
          id_document_data,
          id_document_hash,
          id_document_mime_type,
          id_document_original_filename,
          created_at
        FROM registrations
        WHERE id = $1
        AND id_document_data IS NOT NULL
      `,
      [registrationId]
    );

    if (!registration) {
      return NextResponse.json(
        { error: 'Inscrição não encontrada ou documento não disponível' },
        { status: 404 }
      );
    }

    // Verifica integridade do documento usando hash SHA-256
    const documentBuffer = Buffer.from(registration.id_document_data);
    const calculatedHash = calculateFileHash(documentBuffer);

    if (calculatedHash !== registration.id_document_hash) {
      console.error(`⚠️ ALERTA DE INTEGRIDADE: Documento ${registrationId} corrompido!`);
      return NextResponse.json(
        { 
          error: 'Documento corrompido - falha na verificação de integridade',
          message: 'O documento não passou na verificação de integridade. Entre em contato com o suporte.'
        },
        { status: 500 }
      );
    }

    // Retorna documento com headers apropriados
    return new NextResponse(documentBuffer, {
      status: 200,
      headers: {
        'Content-Type': registration.id_document_mime_type || 'application/octet-stream',
        'Content-Disposition': `inline; filename="${registration.id_document_original_filename || 'documento.pdf'}"`,
        'Content-Length': documentBuffer.length.toString(),
        'X-Document-Hash': registration.id_document_hash,
        'X-Document-Integrity': 'verified',
        'Cache-Control': 'private, no-cache, no-store, must-revalidate',
      },
    });
  } catch (error) {
    console.error('Erro ao recuperar documento:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

