/**
 * Serviço de upload para AWS S3
 * Gerencia upload de documentos de identidade
 */

import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import * as crypto from 'crypto';

// Configuração do cliente S3
// Se as chaves estiverem no .env, usa elas. Caso contrário (Produção com IAM Role), 
// o SDK usará automaticamente a Role da EC2 via Default Credential Provider Chain.
const s3Config: any = {
  region: process.env.AWS_REGION || 'us-east-1',
};

if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
  s3Config.credentials = {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  };
}

const s3Client = new S3Client(s3Config);

const BUCKET_NAME = process.env.AWS_S3_BUCKET_NAME || 'innovanation-documents';

/**
 * Faz upload de um arquivo para o S3
 */
export async function uploadFile(
  file: Buffer,
  fileName: string,
  mimeType: string
): Promise<{ filePath: string; url: string }> {
  // Gera nome único para o arquivo
  const timestamp = Date.now();
  const randomHash = crypto.randomBytes(8).toString('hex');
  const extension = fileName.split('.').pop() || 'bin';
  const uniqueFileName = `documents/${timestamp}-${randomHash}.${extension}`;

  // Upload para S3
  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: uniqueFileName,
    Body: file,
    ContentType: mimeType,
    // Configurar ACL se necessário (ou usar bucket policy)
    // ACL: 'private',
  });

  await s3Client.send(command);

  // Retorna o caminho e URL
  const filePath = uniqueFileName;
  // Usar endpoint genérico ou regional correto para evitar PermanentRedirect
  const region = process.env.AWS_REGION || 'us-east-1';
  const url = `https://${BUCKET_NAME}.s3.${region}.amazonaws.com/${filePath}`;

  return { filePath, url };
}

/**
 * Gera URL assinada para acesso temporário ao arquivo
 */
export async function getSignedFileUrl(filePath: string, expiresIn: number = 3600): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: filePath,
  });

  return await getSignedUrl(s3Client, command, { expiresIn });
}

/**
 * Valida tipo de arquivo permitido
 */
export function isValidFileType(mimeType: string): boolean {
  const allowedTypes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'application/pdf',
  ];
  return allowedTypes.includes(mimeType.toLowerCase());
}

/**
 * Valida tamanho do arquivo (máximo 10MB)
 */
export function isValidFileSize(size: number): boolean {
  const MAX_SIZE = 10 * 1024 * 1024; // 10MB
  return size <= MAX_SIZE;
}

