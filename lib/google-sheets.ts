import { google } from 'googleapis';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';

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
    const s3Region = process.env.GOOGLE_CREDENTIALS_S3_REGION || 'us-east-2';
    const s3Client = new S3Client({
      region: s3Region,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
      },
    });

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

export async function appendRegistrationToSheet(registration: RegistrationData) {
  try {
    // Obtém autenticação
    const auth = await getGoogleAuth();
    
    // Obtém ID da planilha (por ID ou nome)
    const sheetId = await getSheetId(auth, process.env.GOOGLE_SHEET_NAME);

    const sheets = google.sheets({ version: 'v4', auth });

    // Prepara os dados para a planilha
    // Ordem das colunas: ID, Data, Nome, Email, Telefone, CPF, Profissão, Empresa, Endereço, Projetos, Status, Documento
    // Se houver URL do documento, insere apenas a URL
    // O Google Sheets automaticamente cria um link clicável quando detecta uma URL válida
    // Solução simples e confiável: inserir URL diretamente (Google Sheets cria link automaticamente)
    const documentCell = registration.document_view_url || 'Armazenado no Banco (PostgreSQL)';
    
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

