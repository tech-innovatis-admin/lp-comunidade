/**
 * GET /api/terms/active
 * Retorna a versão ativa dos Termos de Uso
 */

import { NextResponse } from 'next/server';
import { queryOne } from '@/lib/db';
import { applyNoStore, containsDangerousHtml } from '@/lib/security';

export async function GET() {
  try {
    const term = await queryOne<{
      id: number;
      version: string;
      title: string;
      content: string;
      content_hash: string;
      created_at: Date;
    }>(
      `
        SELECT id, version, title, content, content_hash, created_at
        FROM terms_of_use
        WHERE is_active = TRUE
        ORDER BY created_at DESC
        LIMIT 1
      `
    );

    if (!term) {
      return applyNoStore(NextResponse.json(
        { error: 'Nenhum termo ativo encontrado' },
        { status: 404 }
      ));
    }

    if (containsDangerousHtml(term.content)) {
      console.error('Conteudo de termos bloqueado por conter HTML perigoso.');
      return applyNoStore(NextResponse.json(
        { error: 'Conteudo de termos temporariamente indisponivel' },
        { status: 503 }
      ));
    }

    return applyNoStore(NextResponse.json({
      id: term.id,
      version: term.version,
      title: term.title,
      content_html: term.content,
      content_hash: term.content_hash,
      created_at: term.created_at.toISOString(),
    }));
  } catch (error) {
    console.error('Erro ao buscar termos ativos:', error);
    return applyNoStore(NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    ));
  }
}
