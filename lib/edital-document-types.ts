export type EditalDocumentKind = 'pdf' | 'doc' | 'docx';

export const EDITAL_DOCUMENT_ACCEPT = [
  '.pdf',
  '.doc',
  '.docx',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
].join(',');

export const EDITAL_DOCUMENT_CANONICAL_MIME_TYPES: Record<EditalDocumentKind, string> = {
  pdf: 'application/pdf',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
};
