// 8.1.8 (registro fotográfico do laboratório) não entra nesta lista: é satisfeito
// pela contagem mínima de fotos com EDITAL_PHOTO_DOCUMENT_CODE ('foto'), nunca por
// um documento único com esse código literal — incluí-lo aqui tornaria o item
// permanentemente impossível de satisfazer em POST /enviar.
export const EDITAL_REQUIRED_DOCUMENT_CODES = [
  '8.1.1',
  '8.1.2',
  '8.1.3',
  '8.1.4',
  '8.1.5',
  '8.1.6',
  '8.1.7',
  '8.1.9',
  '8.1.15',
  '8.1.16',
] as const;

export const EDITAL_AUTO_GENERATED_DOCUMENT_CODE = '8.1.10' as const;
export const EDITAL_PHOTO_DOCUMENT_CODE = 'foto' as const;

export const EDITAL_MAX_TEXT_LENGTH = 5000;
export const EDITAL_MAX_BUDGET_ITEMS = 20;
export const EDITAL_MAX_BUDGET_DESCRIPTION_LENGTH = 200;
export const EDITAL_MAX_BUDGET_JUSTIFICATION_LENGTH = 500;
export const EDITAL_MAX_DOCUMENT_BYTES = 10 * 1024 * 1024;
export const EDITAL_MAX_PHOTO_BYTES = 5 * 1024 * 1024;
export const EDITAL_MAX_PHOTO_COUNT = 8;
export const EDITAL_MIN_PHOTO_COUNT = 3;

export type EditalDocumentRequirementCode =
  | (typeof EDITAL_REQUIRED_DOCUMENT_CODES)[number]
  | typeof EDITAL_AUTO_GENERATED_DOCUMENT_CODE
  | typeof EDITAL_PHOTO_DOCUMENT_CODE;

export function isEditalDocumentRequirementCode(value: string): value is EditalDocumentRequirementCode {
  return (
    (EDITAL_REQUIRED_DOCUMENT_CODES as readonly string[]).includes(value) ||
    value === EDITAL_AUTO_GENERATED_DOCUMENT_CODE ||
    value === EDITAL_PHOTO_DOCUMENT_CODE
  );
}

export function isRequiredDocumentCode(value: string): value is (typeof EDITAL_REQUIRED_DOCUMENT_CODES)[number] {
  return (EDITAL_REQUIRED_DOCUMENT_CODES as readonly string[]).includes(value);
}

export function isPhotoDocumentCode(value: string): value is typeof EDITAL_PHOTO_DOCUMENT_CODE {
  return value === EDITAL_PHOTO_DOCUMENT_CODE;
}

export function getSubmissionRequiredDocumentCodes(): Array<(typeof EDITAL_REQUIRED_DOCUMENT_CODES)[number]> {
  return [...EDITAL_REQUIRED_DOCUMENT_CODES];
}
