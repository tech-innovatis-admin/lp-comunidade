/**
 * Serviço de upload para AWS S3
 * Gerencia upload de documentos de identidade
 */

import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import * as crypto from 'crypto';

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

export async function uploadFile(
  file: Buffer,
  fileName: string,
  mimeType: string,
  keyPrefix: string = 'documents'
): Promise<{ filePath: string; url: string }> {
  const timestamp = Date.now();
  const randomHash = crypto.randomBytes(8).toString('hex');
  const extension = fileName.split('.').pop() || 'bin';
  const uniqueFileName = `${keyPrefix}/${timestamp}-${randomHash}.${extension}`;

  return uploadFileToKey(file, uniqueFileName, mimeType);
}

export async function uploadFileToKey(
  file: Buffer,
  filePath: string,
  mimeType: string
): Promise<{ filePath: string; url: string }> {
  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: filePath,
    Body: file,
    ContentType: mimeType,
  });

  await s3Client.send(command);

  const region = process.env.AWS_REGION || 'us-east-1';
  const url = `https://${BUCKET_NAME}.s3.${region}.amazonaws.com/${filePath}`;

  return { filePath, url };
}

export async function getSignedFileUrl(filePath: string, expiresIn: number = 3600): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: filePath,
  });

  return await getSignedUrl(s3Client, command, { expiresIn });
}

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

export function isValidFileSize(size: number): boolean {
  const MAX_SIZE = 10 * 1024 * 1024;
  return size <= MAX_SIZE;
}
