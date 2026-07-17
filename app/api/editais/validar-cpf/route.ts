/**
 * POST /api/editais/validar-cpf
 * Valida se um CPF corresponde a uma inscrição confirmada na comunidade InnovaNation
 * (registrations.terms_accepted = TRUE) antes de liberar o formulário do Edital PPI.
 */

import { NextRequest, NextResponse } from 'next/server';
import { queryOne } from '@/lib/db';
import { calculateHash, isValidCPF } from '@/lib/utils';
import { applyNoStore, enforceRateLimit, isTrustedOrigin } from '@/lib/security';
import { createEditalToken } from '@/lib/edital-auth';

interface RegistrationRow {
  id: number;
  full_name: string;
  email: string | null;
  phone: string | null;
  profession: string | null;
  organization: string | null;
  address_zip: string | null;
  address_street: string | null;
  address_number: string | null;
  address_neighborhood: string | null;
  address_city: string | null;
  address_state: string | null;
}

function jsonResponse(body: unknown, init?: ResponseInit) {
  return applyNoStore(NextResponse.json(body, init));
}

export async function POST(request: NextRequest) {
  try {
    if (!isTrustedOrigin(request)) {
      return jsonResponse({ error: 'Origem não autorizada' }, { status: 403 });
    }

    const rateLimit = enforceRateLimit(request, 'edital-validar-cpf', 5, 15 * 60 * 1000);
    if (!rateLimit.allowed) {
      return jsonResponse(
        { error: 'Muitas tentativas. Tente novamente em alguns minutos.' },
        {
          status: 429,
          headers: {
            'Retry-After': rateLimit.retryAfterSeconds.toString(),
          },
        }
      );
    }

    let body: { cpf?: unknown; website?: unknown };
    try {
      body = await request.json();
    } catch {
      return jsonResponse({ error: 'CPF inválido' }, { status: 400 });
    }

    const website = typeof body.website === 'string' ? body.website : '';
    if (website.trim().length > 0) {
      console.warn('[edital-validar-cpf] honeypot acionado');
      return jsonResponse({ error: 'not_found' }, { status: 404 });
    }

    const cpf = typeof body.cpf === 'string' ? body.cpf : '';
    if (!isValidCPF(cpf)) {
      return jsonResponse({ error: 'CPF inválido' }, { status: 400 });
    }

    const cleanCpf = cpf.replace(/\D/g, '');

    const registration = await queryOne<RegistrationRow>(
      `SELECT id, full_name, email, phone, profession, organization,
              address_zip, address_street, address_number, address_neighborhood,
              address_city, address_state
       FROM registrations
       WHERE cpf = $1 AND terms_accepted = TRUE
       LIMIT 1`,
      [cleanCpf]
    );

    if (!registration) {
      console.warn('[edital-validar-cpf] CPF não encontrado', { cpfHash: calculateHash(cleanCpf) });
      return jsonResponse({ error: 'not_found' }, { status: 404 });
    }

    // registrations.id é BIGSERIAL; o driver pg retorna colunas BIGINT como string
    // (sem type parser customizado para OID 20 neste projeto), então normalizamos
    // explicitamente para number antes de embutir no payload assinado do token.
    const token = createEditalToken(Number(registration.id));

    return jsonResponse({
      ok: true,
      token,
      prefill: {
        fullName: registration.full_name,
        email: registration.email,
        phone: registration.phone,
        profession: registration.profession,
        organization: registration.organization,
        cep: registration.address_zip,
        logradouro: registration.address_street,
        numero: registration.address_number,
        bairro: registration.address_neighborhood,
        cidade: registration.address_city,
        estado: registration.address_state,
      },
    });
  } catch (error) {
    console.error('[edital-validar-cpf] Erro ao validar CPF:', error);
    return jsonResponse({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
