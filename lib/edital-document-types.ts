export type EditalDocumentKind = 'pdf' | 'doc' | 'docx' | 'jpeg' | 'png' | 'webp'

export const EDITAL_DOCUMENT_ACCEPT = [
  '.pdf',
  '.doc',
  '.docx',
  '.jpg',
  '.jpeg',
  '.png',
  '.webp',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/jpeg',
  'image/png',
  'image/webp',
].join(',')

export const EDITAL_DOCUMENT_CANONICAL_MIME_TYPES: Record<EditalDocumentKind, string> = {
  pdf: 'application/pdf',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
}

export const EDITAL_DOCUMENT_HELPER_TEXT =
  'Formatos aceitos: PDF, DOC, DOCX, JPG, PNG e WEBP (até 10 MB)'
