import { google } from 'googleapis';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { EDITAL_REQUIRED_DOCUMENT_CODES, EDITAL_AUTO_GENERATED_DOCUMENT_CODE } from './edital-requirements';

const SCOPES = [
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/drive.readonly', // Necessário para buscar planilha pelo nome
];

interface RegistrationData {
  id: number;
  full_name: string;
  email: string;
  phone: string;
  cpf: string;
  profession: string;
  organization: string;
  address: string;
  projects: string;
  status: string;
  created_at?: Date;
  document_view_url?: string | null; // URL assinada do S3 para visualização do documento
}

/**
 * Busca credenciais JSON do S3 (opcional, como no projeto Python)
 */
async function getCredentialsFromS3(): Promise<any | null> {
  const s3Bucket = process.env.GOOGLE_CREDENTIALS_S3_BUCKET;
  const s3Key = process.env.GOOGLE_CREDENTIALS_S3_KEY;

  if (!s3Bucket || !s3Key) {
    return null;
  }

  try {
    // Bucket jsoninnovatis está em us-east-2, enquanto outros serviços estão em us-east-1
    const s3Region = process.env.GOOGLE_CREDENTIALS_S3_REGION || 'us-east-1';

    // Configuração flexível para suportar IAM Role em Produção
    const s3Config: any = { region: s3Region };
    if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
      s3Config.credentials = {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      };
    }

    const s3Client = new S3Client(s3Config);

    const command = new GetObjectCommand({
      Bucket: s3Bucket,
      Key: s3Key,
    });

    const response = await s3Client.send(command);
    const bodyString = await response.Body?.transformToString();

    if (!bodyString) {
      throw new Error('Arquivo JSON vazio no S3');
    }

    return JSON.parse(bodyString);
  } catch (error) {
    console.error('❌ Google Sheets: Erro ao buscar credenciais do S3:', error);
    return null;
  }
}

/**
 * Obtém credenciais do Google Service Account
 * Suporta três métodos (em ordem de prioridade):
 * 1. JSON completo do S3 (GOOGLE_CREDENTIALS_S3_BUCKET + GOOGLE_CREDENTIALS_S3_KEY) - como no projeto Python
 * 2. JSON completo em variável (GOOGLE_SERVICE_ACCOUNT_JSON)
 * 3. Variáveis individuais (GOOGLE_SERVICE_ACCOUNT_EMAIL + GOOGLE_PRIVATE_KEY)
 */
async function getGoogleAuth() {
  // Método 1: Buscar JSON do S3 (como no projeto Python)
  const s3Creds = await getCredentialsFromS3();
  if (s3Creds) {
    return new google.auth.GoogleAuth({
      credentials: s3Creds,
      scopes: SCOPES,
    });
  }

  // Método 2: JSON completo em variável de ambiente
  const jsonCredentials = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (jsonCredentials) {
    try {
      const creds = JSON.parse(jsonCredentials);
      return new google.auth.GoogleAuth({
        credentials: creds,
        scopes: SCOPES,
      });
    } catch (error) {
      console.error('❌ Google Sheets: Erro ao parsear JSON de credenciais:', error);
      throw error;
    }
  }

  // Método 3: Variáveis individuais (fallback)
  const serviceAccountEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (!serviceAccountEmail || !privateKey) {
    throw new Error('Credenciais não configuradas');
  }

  return new google.auth.JWT({
    email: serviceAccountEmail,
    key: privateKey,
    scopes: SCOPES,
  });
}

/**
 * Obtém o ID da planilha pelo nome ou usa o ID direto
 */
async function getSheetId(auth: any, sheetNameOrId?: string): Promise<string> {
  const sheetId = process.env.GOOGLE_SHEET_ID || sheetNameOrId;

  // Se já for um ID (formato típico: letras/números longos), retorna direto
  if (sheetId && /^[a-zA-Z0-9_-]{44}$/.test(sheetId)) {
    return sheetId;
  }

  // Se não for ID, tenta buscar pelo nome usando Google Drive API
  if (sheetId) {
    try {
      const drive = google.drive({ version: 'v3', auth });
      const response = await drive.files.list({
        q: `name='${sheetId}' and mimeType='application/vnd.google-apps.spreadsheet'`,
        fields: 'files(id, name)',
      });

      if (response.data.files && response.data.files.length > 0) {
        const foundId = response.data.files[0].id;
        console.log(`✅ Google Sheets: Planilha "${sheetId}" encontrada (ID: ${foundId})`);
        return foundId!;
      } else {
        throw new Error(`Planilha "${sheetId}" não encontrada`);
      }
    } catch (error) {
      console.error(`❌ Google Sheets: Erro ao buscar planilha "${sheetId}":`, error);
      throw error;
    }
  }

  throw new Error('GOOGLE_SHEET_ID ou nome da planilha não configurado');
}

interface EditalSubmissionData {
  id: number;
  registrationId: number;
  status: 'DRAFT' | 'SUBMITTED';
  fullName: string;
  cpf: string;
  institutionName: string | null;
  institutionCnpj: string | null;
  labName: string | null;
  labArea: string | null;
  labAcademicUnit: string | null;
  labStructureDescription: string | null;
  mainImprovementObjective: string | null;
  teamDescription: string | null;
  technicalJustification: string | null;
  expectedResults: string | null;
  submittedAt: string;
  // Link permanente (via /api/editais/documento/[id]/link) por código de requisito.
  // Ausente no mapa = documento não enviado.
  documentLinks: Record<string, string>;
  // Fotos do laboratório: múltiplos links, um por foto enviada.
  photoLinks: string[];
  // Link permanente (via /api/editais/certificado/[registrationId]/link), ou null
  // se o certificado ainda não foi gerado para essa inscrição.
  communityCertificateUrl: string | null;
}

const EDITAL_DOCUMENT_COLUMN_LABELS: Record<string, string> = {
  '8.1.1': 'Documento de identificação',
  '8.1.2': 'CPF do responsável',
  '8.1.3': 'Comprovante de vínculo institucional',
  '8.1.4': 'Currículo',
  '8.1.5': 'Comprovante de CNPJ',
  '8.1.6': 'Carta de anuência da instituição',
  '8.1.7': 'Identificação do laboratório',
  '8.1.15': 'Declaração de responsabilidade',
  '8.1.16': 'Termo de compromisso de contrapartida',
};

// Ordem fixa de colunas de documentos, além dos códigos obrigatórios: fotos e o
// Termo de Comprovação de Participação (gerado automaticamente no envio).
const EDITAL_DOCUMENT_COLUMN_CODES = [...EDITAL_REQUIRED_DOCUMENT_CODES];

export async function appendEditalSubmissionToSheet(submission: EditalSubmissionData) {
  try {
    // Obtém autenticação
    const auth = await getGoogleAuth();

    // Obtém ID da planilha (por ID ou nome)
    const sheetId = await getSheetId(auth, process.env.GOOGLE_SHEET_NAME);

    const sheets = google.sheets({ version: 'v4', auth });

    const documentColumns = EDITAL_DOCUMENT_COLUMN_CODES.map(
      (code) => submission.documentLinks[code] || 'Não enviado'
    );
    const photosCell = submission.photoLinks.length > 0
      ? submission.photoLinks.join('\n')
      : 'Não enviado';
    const participationTermCell =
      submission.documentLinks[EDITAL_AUTO_GENERATED_DOCUMENT_CODE] || 'Não gerado';
    const communityCertificateCell = submission.communityCertificateUrl || 'Não gerado';

    // Ordem das colunas: ID, Data de exportação, ID da Inscrição, Status, Nome, CPF,
    // Instituição, CNPJ, Laboratório, Área do Laboratório, Unidade acadêmica,
    // Descrição da estrutura do laboratório, Objetivo principal da melhoria,
    // Descrição da Equipe, Justificativa Técnica, Resultados Esperados, Data de Envio,
    // [documentos obrigatórios em ordem fixa], Fotos do laboratório, Termo de Comprovação
    // de Participação, Certificado de Inscrição na Comunidade.
    const values = [
      [
        submission.id,
        new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }),
        submission.registrationId,
        submission.status,
        submission.fullName,
        submission.cpf,
        submission.institutionName || '',
        submission.institutionCnpj || '',
        submission.labName || '',
        submission.labArea || '',
        submission.labAcademicUnit || '',
        submission.labStructureDescription || '',
        submission.mainImprovementObjective || '',
        submission.teamDescription || '',
        submission.technicalJustification || '',
        submission.expectedResults || '',
        submission.submittedAt,
        ...documentColumns,
        photosCell,
        participationTermCell,
        communityCertificateCell,
      ],
    ];

    // Escreve especificamente na aba "PROPOSTAS" — sem fallback para a primeira aba
    // como em appendRegistrationToSheet, porque aqui a primeira aba é "INSCRIÇÃO
    // COMUNIDADE " (dados de inscrição, colunas diferentes); cair nela misturaria
    // dados de proposta do Edital com dados de inscrição.
    await sheets.spreadsheets.values.append({
      spreadsheetId: sheetId,
      range: 'PROPOSTAS!A:AC',
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values,
      },
    });

    console.log(`✅ Google Sheets: Proposta do Edital #${submission.id} exportada com sucesso.`);
  } catch (error) {
    console.error('❌ Google Sheets: Erro ao exportar proposta do Edital:', error);
    // Não lançamos o erro para não prejudicar a experiência do usuário
    // O dado já está salvo no banco de dados com segurança
  }
}

export function getEditalSheetHeaderRow(): string[] {
  return [
    'ID',
    'Data de exportação',
    'ID da Inscrição',
    'Status',
    'Nome',
    'CPF',
    'Instituição',
    'CNPJ',
    'Laboratório',
    'Área do Laboratório',
    'Unidade acadêmica',
    'Descrição da estrutura do laboratório',
    'Objetivo principal da melhoria',
    'Descrição da Equipe',
    'Justificativa Técnica',
    'Resultados Esperados',
    'Data de Envio',
    ...EDITAL_DOCUMENT_COLUMN_CODES.map((code) => EDITAL_DOCUMENT_COLUMN_LABELS[code]),
    'Fotos do Laboratório',
    'Termo de Comprovação de Participação',
    'Certificado de Inscrição na Comunidade',
  ];
}

export async function appendRegistrationToSheet(registration: RegistrationData) {
  try {
    // Obtém autenticação
    const auth = await getGoogleAuth();

    // Obtém ID da planilha (por ID ou nome)
    const sheetId = await getSheetId(auth, process.env.GOOGLE_SHEET_NAME);

    const sheets = google.sheets({ version: 'v4', auth });

    // Prepara os dados para a planilha
    // Ordem das colunas: ID, Data, Nome, Email, Telefone, CPF, Profissão, Empresa, Endereço Completo, Projetos, Status, Documento
    // Se houver URL do documento, insere apenas a URL
    // O Google Sheets automaticamente cria um link clicável quando detecta uma URL válida
    // Solução simples e confiável: inserir URL diretamente (Google Sheets cria link automaticamente)
    const documentCell = registration.document_view_url || 'Nao enviado';

    if (registration.document_view_url) {
      console.log(`🔗 Google Sheets: Inserindo URL do documento: ${registration.document_view_url}`);
    }

    const values = [
      [
        registration.id,
        new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }),
        registration.full_name,
        registration.email,
        registration.phone,
        registration.cpf,
        registration.profession,
        registration.organization,
        registration.address,
        registration.projects,
        registration.status,
        documentCell
      ],
    ];

    // Tenta adicionar na aba "Inscrições". Se falhar, tenta na primeira aba.
    try {
      await sheets.spreadsheets.values.append({
        spreadsheetId: sheetId,
        range: 'Inscrições!A:L',
        valueInputOption: 'USER_ENTERED', // USER_ENTERED interpreta fórmulas
        requestBody: {
          values,
        },
      });
    } catch (sheetError: any) {
      // Se der erro de range (aba não existe), tenta sem especificar aba (vai na primeira)
      console.warn('⚠️ Google Sheets: Aba "Inscrições" não encontrada, tentando na aba padrão.');
      await sheets.spreadsheets.values.append({
        spreadsheetId: sheetId,
        range: 'A:L',
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values,
        },
      });
    }

    console.log(`✅ Google Sheets: Inscrição #${registration.id} exportada com sucesso.`);
  } catch (error) {
    console.error('❌ Google Sheets: Erro ao exportar inscrição:', error);
    // Não lançamos o erro para não prejudicar a experiência do usuário
    // O dado já está salvo no banco de dados com segurança
  }
}
