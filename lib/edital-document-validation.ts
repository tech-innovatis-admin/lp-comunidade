import {
  EDITAL_DOCUMENT_CANONICAL_MIME_TYPES,
  type EditalDocumentKind,
} from './edital-document-types';

type ValidEditalDocument = {
  valid: true;
  kind: EditalDocumentKind;
  mimeType: string;
};

type InvalidEditalDocument = {
  valid: false;
  error: string;
};

export type EditalDocumentValidationResult = ValidEditalDocument | InvalidEditalDocument;

const INVALID_DOCUMENT_ERROR = 'Formato de documento inválido. Envie um arquivo PDF, DOC e DOCX válido.';
const OOXML_CONTENT_TYPES_MARKER = Buffer.from('[Content_Types].xml');
const OOXML_WORD_DOCUMENT_MARKER = Buffer.from('word/document.xml');
const OLE_SIGNATURE = Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]);
const PDF_SIGNATURE = Buffer.from('%PDF-');
const ZIP_SIGNATURE = Buffer.from([0x50, 0x4b, 0x03, 0x04]);

const ACCEPTED_REPORTED_MIME_TYPES: Record<EditalDocumentKind, Set<string>> = {
  pdf: new Set(['application/pdf']),
  doc: new Set(['application/msword', 'application/octet-stream']),
  docx: new Set([
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/zip',
    'application/octet-stream',
  ]),
};

function normalizeMimeType(mimeType: string): string {
  return mimeType.split(';', 1)[0]?.trim().toLowerCase() ?? '';
}

function getKindFromExtension(filename: string): EditalDocumentKind | null {
  const normalizedFilename = filename.trim().toLowerCase();

  if (normalizedFilename.endsWith('.pdf')) {
    return 'pdf';
  }

  if (normalizedFilename.endsWith('.docx')) {
    return 'docx';
  }

  if (normalizedFilename.endsWith('.doc')) {
    return 'doc';
  }

  return null;
}

function reportedMimeMatchesKind(kind: EditalDocumentKind, reportedMimeType: string): boolean {
  return ACCEPTED_REPORTED_MIME_TYPES[kind].has(normalizeMimeType(reportedMimeType));
}

function hasPrefix(buffer: Buffer, signature: Buffer): boolean {
  return buffer.length >= signature.length && buffer.subarray(0, signature.length).equals(signature);
}

function hasPdfSignature(buffer: Buffer): boolean {
  return hasPrefix(buffer, PDF_SIGNATURE);
}

function hasOleSignature(buffer: Buffer): boolean {
  return hasPrefix(buffer, OLE_SIGNATURE);
}

function hasDocxSignature(buffer: Buffer): boolean {
  return (
    hasPrefix(buffer, ZIP_SIGNATURE) &&
    buffer.includes(OOXML_CONTENT_TYPES_MARKER) &&
    buffer.includes(OOXML_WORD_DOCUMENT_MARKER)
  );
}

function signatureMatchesKind(kind: EditalDocumentKind, buffer: Buffer): boolean {
  if (kind === 'pdf') {
    return hasPdfSignature(buffer);
  }

  if (kind === 'doc') {
    return hasOleSignature(buffer);
  }

  return hasDocxSignature(buffer);
}

export function getEditalDocumentKindFromMime(mimeType: string): EditalDocumentKind | null {
  const normalizedMimeType = normalizeMimeType(mimeType);

  for (const [kind, canonicalMimeType] of Object.entries(EDITAL_DOCUMENT_CANONICAL_MIME_TYPES)) {
    if (normalizedMimeType === canonicalMimeType) {
      return kind as EditalDocumentKind;
    }
  }

  return null;
}

export function getEditalDocumentKind(filename: string, reportedMimeType: string): EditalDocumentKind | null {
  const kind = getKindFromExtension(filename);

  if (!kind || !reportedMimeMatchesKind(kind, reportedMimeType)) {
    return null;
  }

  return kind;
}

export function validateEditalDocumentBuffer(
  filename: string,
  reportedMimeType: string,
  buffer: Buffer
): EditalDocumentValidationResult {
  const kind = getEditalDocumentKind(filename, reportedMimeType);

  if (!kind || !signatureMatchesKind(kind, buffer)) {
    return {
      valid: false,
      error: INVALID_DOCUMENT_ERROR,
    };
  }

  return {
    valid: true,
    kind,
    mimeType: EDITAL_DOCUMENT_CANONICAL_MIME_TYPES[kind],
  };
}
