import {
  EDITAL_DOCUMENT_CANONICAL_MIME_TYPES,
  type EditalDocumentKind,
} from './edital-document-types';

type DocumentAccessDisposition = {
  documentKind: EditalDocumentKind | null;
  downloadFileName?: string;
};

const THUMBNAILABLE_MIME_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
]);

function normalizeMimeType(mimeType: string | null | undefined): string {
  return mimeType?.split(';', 1)[0]?.trim().toLowerCase() ?? '';
}

function getDocumentKindFromMime(mimeType: string | null | undefined): EditalDocumentKind | null {
  const normalizedMimeType = normalizeMimeType(mimeType);

  for (const [kind, canonicalMimeType] of Object.entries(EDITAL_DOCUMENT_CANONICAL_MIME_TYPES)) {
    if (normalizedMimeType === canonicalMimeType) {
      return kind as EditalDocumentKind;
    }
  }

  return null;
}

function getFilenameExtension(filename: string | null | undefined): string | null {
  const match = filename?.trim().match(/\.([a-z0-9]+)$/i);
  return match?.[1]?.toUpperCase() ?? null;
}

function sanitizeDownloadFileName(filename: string | null | undefined, kind: 'doc' | 'docx'): string {
  const fallback = `documento.${kind}`;
  const candidate = filename?.trim() || fallback;
  const sanitized = candidate.replace(/[^\w.\-() ]/g, '_').slice(0, 255).trim();
  const withValue = sanitized || fallback;

  return withValue.toLowerCase().endsWith(`.${kind}`) ? withValue : `${withValue}.${kind}`;
}

export function isThumbnailMimeTypeSupported(mimeType: string | null | undefined): boolean {
  return THUMBNAILABLE_MIME_TYPES.has(normalizeMimeType(mimeType));
}

export function getDocumentAccessDisposition(
  mimeType: string | null | undefined,
  originalFilename: string | null | undefined
): DocumentAccessDisposition {
  const documentKind = getDocumentKindFromMime(mimeType);

  if (documentKind === 'doc' || documentKind === 'docx') {
    return {
      documentKind,
      downloadFileName: sanitizeDownloadFileName(originalFilename, documentKind),
    };
  }

  return { documentKind };
}

export function getDocumentFallbackExtension(
  mimeType: string | null | undefined,
  originalFilename: string | null | undefined
): string {
  const documentKind = getDocumentKindFromMime(mimeType);
  if (documentKind) {
    return documentKind.toUpperCase();
  }

  return getFilenameExtension(originalFilename) ?? 'ARQUIVO';
}
