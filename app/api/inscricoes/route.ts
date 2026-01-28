/**
 * POST /api/inscricoes
 * Recebe inscrições na comunidade InnovaNation
 */

import { NextRequest, NextResponse } from 'next/server';
import { queryOne, query, transaction } from '@/lib/db';
import { isValidFileType, isValidFileSize } from '@/lib/s3';
import { calculateHash, calculateFileHash, generateSecureToken, isValidCPF, isValidEmail, getClientIP } from '@/lib/utils';
import { appendRegistrationToSheet } from '@/lib/google-sheets';

/**
 * Envia dados para webhook N8N
 * @param data Dados completos do registro
 */
async function sendToN8NWebhook(data: any) {
  const webhookUrl = 'https://v1teste.app.n8n.cloud/webhook/kriscia-comunidade';

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      console.error(`Webhook N8N falhou: ${response.status} ${response.statusText}`);
      return false;
    }

    console.log('✅ Webhook N8N enviado com sucesso');
    return true;
  } catch (error) {
    console.error('❌ Erro ao enviar webhook N8N:', error);
    return false;
  }
}

export async function POST(request: NextRequest) {
  try {
    // Parse do FormData
    const formData = await request.formData();

    // Extrai campos do formulário
    const fullName = formData.get('fullName')?.toString() || '';
    const profession = formData.get('profession')?.toString() || '';
    const organization = formData.get('organization')?.toString() || '';
    const cpf = formData.get('cpf')?.toString() || '';
    const phone = formData.get('phone')?.toString() || '';
    const email = formData.get('email')?.toString() || '';
    const address = formData.get('address')?.toString() || '';
    const projects = formData.get('projects')?.toString() || '';
    const termsId = formData.get('termsId')?.toString();
    const termsVersion = formData.get('termsVersion')?.toString();
    const variant = formData.get('variant')?.toString() || 'MANUAL';
    const idDocumentFile = formData.get('idDocumentFile') as File | null;

    // Validações básicas
    if (!fullName || fullName.trim().length === 0) {
      return NextResponse.json(
        { error: 'Nome completo é obrigatório' },
        { status: 400 }
      );
    }

    if (!cpf || !isValidCPF(cpf)) {
      return NextResponse.json(
        { error: 'CPF inválido' },
        { status: 400 }
      );
    }

    if (!email || !isValidEmail(email)) {
      return NextResponse.json(
        { error: 'E-mail inválido' },
        { status: 400 }
      );
    }

    if (!idDocumentFile) {
      return NextResponse.json(
        { error: 'Documento de identidade é obrigatório' },
        { status: 400 }
      );
    }

    // Valida arquivo
    if (!isValidFileType(idDocumentFile.type)) {
      return NextResponse.json(
        { error: 'Tipo de arquivo não permitido. Use JPG, PNG ou PDF' },
        { status: 400 }
      );
    }

    const fileBuffer = Buffer.from(await idDocumentFile.arrayBuffer());
    if (!isValidFileSize(fileBuffer.length)) {
      return NextResponse.json(
        { error: 'Arquivo muito grande. Máximo 10MB' },
        { status: 400 }
      );
    }

    // Calcula hash SHA-256 do documento para garantia de integridade jurídica
    const documentHash = calculateFileHash(fileBuffer);
    const documentSize = fileBuffer.length;
    const originalFilename = idDocumentFile.name;
    const mimeType = idDocumentFile.type;

    // Obtém IP e User-Agent
    const clientIP = getClientIP(request.headers);
    const userAgent = request.headers.get('user-agent') || '';

    // Headers adicionais para rastreabilidade jurídica completa
    const acceptLanguage = request.headers.get('accept-language') || null;
    const referer = request.headers.get('referer') || null;

    // Normaliza X-Forwarded-For removendo prefixo IPv6 mapeado
    let xForwardedFor = request.headers.get('x-forwarded-for') || null;
    if (xForwardedFor) {
      // Remove prefixo ::ffff: de todos os IPs na lista
      xForwardedFor = xForwardedFor
        .split(',')
        .map(ip => {
          const trimmed = ip.trim();
          return trimmed.startsWith('::ffff:') ? trimmed.substring(7) : trimmed;
        })
        .join(', ');
    }

    const secChUa = request.headers.get('sec-ch-ua') || null;
    const secChUaPlatform = request.headers.get('sec-ch-ua-platform') || null;
    const secChUaMobile = request.headers.get('sec-ch-ua-mobile') || null;

    // Busca termo ativo COM HASH para registro jurídico
    const activeTerm = await queryOne<{
      id: number;
      version: string;
      content: string;
      content_hash: string;
    }>(
      `
        SELECT id, version, content, content_hash
        FROM terms_of_use
        WHERE is_active = TRUE
        ORDER BY created_at DESC
        LIMIT 1
      `
    );

    if (!activeTerm) {
      return NextResponse.json(
        { error: 'Nenhum termo ativo encontrado' },
        { status: 500 }
      );
    }

    // Valida consistência dos termos
    // Converte para string para comparação segura
    if (termsId && activeTerm.id.toString() !== termsId.toString()) {
      console.error(`Termos ID incompatíveis: Recebido ${termsId}, Ativo ${activeTerm.id}`);
      return NextResponse.json(
        { error: 'Termos desatualizados. Por favor, recarregue a página' },
        { status: 400 }
      );
    }

    if (termsVersion && termsVersion.trim() !== activeTerm.version.trim()) {
      console.error(`Termos Versão incompatíveis: Recebido "${termsVersion}", Ativo "${activeTerm.version}"`);
      return NextResponse.json(
        { error: 'Termos desatualizados. Por favor, recarregue a página' },
        { status: 400 }
      );
    }

    // Verifica duplicatas (email e CPF únicos)
    const cleanCpf = cpf.replace(/\D/g, '');
    const cleanEmail = email.trim().toLowerCase();

    // Verifica se email já existe
    const existingEmail = await queryOne<{ id: number }>(
      'SELECT id FROM registrations WHERE email = $1 LIMIT 1',
      [cleanEmail]
    );

    if (existingEmail) {
      return NextResponse.json(
        {
          error: 'Email já cadastrado',
          message: 'Este endereço de e-mail já foi utilizado para uma inscrição. Cada pessoa pode fazer apenas uma inscrição.'
        },
        { status: 409 }
      );
    }

    // Verifica se CPF já existe
    const existingCpf = await queryOne<{ id: number }>(
      'SELECT id FROM registrations WHERE cpf = $1 LIMIT 1',
      [cleanCpf]
    );

    if (existingCpf) {
      return NextResponse.json(
        {
          error: 'CPF já cadastrado',
          message: 'Este CPF já foi utilizado para uma inscrição. Cada pessoa pode fazer apenas uma inscrição.'
        },
        { status: 409 }
      );
    }

    // Calcula fingerprint do registro (hash de todos os dados críticos)
    // Serve como prova de integridade total do registro
    const fingerprintData = [
      fullName.trim(),
      cleanCpf,
      cleanEmail,
      documentHash,
      activeTerm.content_hash,
      activeTerm.version,
      clientIP,
      userAgent,
    ].join('|');
    const registrationFingerprint = calculateHash(fingerprintData);

    // Insere registro no banco usando transação
    // IMPORTANTE: Documento é armazenado diretamente no PostgreSQL para garantia jurídica
    // - Integridade transacional (ACID)
    // - Backup automático junto com os dados
    // - Hash SHA-256 para verificação de integridade
    // - Impossível perder arquivo sem perder registro
    const result = await transaction(async (client) => {
      // Insere inscrição com documento armazenado diretamente no banco
      // REGISTRO JURÍDICO COMPLETO:
      // - Documento de identidade (BYTEA)
      // - Hash do documento (SHA-256)
      // - Aceite explícito dos termos (TRUE)
      // - Hash dos termos no momento do aceite
      // - Versão dos termos no momento do aceite
      // - IP do cliente
      // - User-Agent
      // - Headers adicionais (Accept-Language, Referer, X-Forwarded-For, Client Hints)
      // - Fingerprint de integridade
      // - Timestamp do servidor
      const registrationResult = await client.query(
        `
          INSERT INTO registrations (
            full_name, profession, organization, cpf, phone, email, address, projects,
            id_document_data, id_document_hash, id_document_size_bytes, 
            id_document_original_filename, id_document_mime_type,
            terms_id, terms_accepted, terms_accepted_at, terms_accepted_ip, terms_user_agent,
            terms_content_hash_at_acceptance, terms_version_at_acceptance,
            accept_language, referer, x_forwarded_for, sec_ch_ua, sec_ch_ua_platform, sec_ch_ua_mobile,
            registration_fingerprint,
            status, variant
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, TRUE, NOW(), $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, 'PENDING', 'MANUAL')
          RETURNING id
        `,
        [
          fullName.trim(),
          profession.trim() || null,
          organization.trim() || null,
          cleanCpf,
          phone.trim() || null,
          email.trim().toLowerCase(),
          address.trim() || null,
          projects.trim() || null,
          fileBuffer, // BYTEA - documento armazenado diretamente no PostgreSQL (garantia jurídica)
          documentHash, // SHA-256 para verificação de integridade do documento
          documentSize, // Tamanho em bytes
          originalFilename, // Nome original do arquivo
          mimeType, // Tipo MIME (image/jpeg, application/pdf, etc)
          activeTerm.id, // FK para tabela de termos
          clientIP, // IP do cliente para rastreabilidade
          userAgent, // User-Agent para identificação do dispositivo
          activeTerm.content_hash, // Hash dos termos no momento EXATO do aceite
          activeTerm.version, // Versão dos termos (ex: v1.0)
          acceptLanguage, // Idioma do navegador
          referer, // URL de origem
          xForwardedFor, // IP real quando há proxy/load balancer
          secChUa, // Informações detalhadas do navegador (Client Hints)
          secChUaPlatform, // Sistema operacional
          secChUaMobile, // Se é dispositivo móvel
          registrationFingerprint, // Hash de integridade de todo o registro
        ]
      );

      const registrationId = registrationResult.rows[0].id;

      // Integração com Google Sheets
      // Executamos de forma assíncrona dentro da transação? Não, idealmente após o commit.
      // Mas como estamos dentro de uma função transaction wrapper, o commit acontece ao retornar.
      // Vamos retornar os dados necessários para executar APÓS a transação.
      // Gera URL permanente para visualização do documento
      // Usa a própria API como fonte (endpoint /api/documents/[id])
      const baseUrl = process.env.PUBLIC_BASE_URL || 'https://comunidade.innovatismc.com';
      const documentViewUrl = `${baseUrl}/api/documents/${registrationId}`;

      // Prepara dados completos para Google Sheets e N8N
      const completeData = {
        id: registrationId,
        full_name: fullName.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim() || '',
        cpf: cleanCpf,
        profession: profession.trim() || '',
        organization: organization.trim() || '',
        address: address.trim() || '',
        projects: projects.trim() || '',
        status: 'PENDING',
        document_view_url: documentViewUrl, // URL permanente para visualização na planilha
        // Dados adicionais para N8N (não vão para Sheets)
        document_hash: documentHash,
        document_size: documentSize,
        document_mime_type: mimeType,
        document_original_filename: originalFilename,
        terms_version: activeTerm.version,
        terms_content_hash: activeTerm.content_hash,
        registration_fingerprint: registrationFingerprint,
        client_ip: clientIP,
        user_agent: userAgent,
        accept_language: acceptLanguage,
        referer: referer,
        x_forwarded_for: xForwardedFor,
        sec_ch_ua: secChUa,
        sec_ch_ua_platform: secChUaPlatform,
        sec_ch_ua_mobile: secChUaMobile,
        variant: variant,
        created_at: new Date().toISOString()
      };

      return {
        registrationId,
        registrationData: completeData
      };
    });

    // Executa integrações após sucesso no banco (fora da transação)
    if (result.registrationData) {
      // Prepara dados específicos para Google Sheets (apenas campos necessários)
      const sheetsData = {
        id: result.registrationData.id,
        full_name: result.registrationData.full_name,
        email: result.registrationData.email,
        phone: result.registrationData.phone,
        cpf: result.registrationData.cpf,
        profession: result.registrationData.profession,
        organization: result.registrationData.organization,
        address: result.registrationData.address,
        projects: result.registrationData.projects,
        status: result.registrationData.status,
        document_view_url: result.registrationData.document_view_url
      };

      // 1. Integração com Google Sheets
      appendRegistrationToSheet(sheetsData)
        .catch(err => console.error('Erro na exportação assíncrona para Sheets:', err));

      // 2. Webhook N8N - envia dados completos
      sendToN8NWebhook(result.registrationData)
        .catch(err => console.error('Erro no webhook N8N (não afeta o cadastro):', err));
    }

    return NextResponse.json({
      status: 'ok',
    });
  } catch (error) {
    console.error('Erro ao processar inscrição:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

