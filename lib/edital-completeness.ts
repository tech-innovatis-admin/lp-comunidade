import { EditalSubmissionDocument, EditalMissingItem, EditalWizardData } from './edital-proposta-api';
import {
  getSubmissionRequiredDocumentCodes,
  EDITAL_PHOTO_DOCUMENT_CODE,
  EDITAL_MIN_PHOTO_COUNT,
} from './edital-requirements';

const REQUIRED_FIELDS: Array<{ field: string; getValue: (data: EditalWizardData) => string }> = [
  { field: 'institution_name', getValue: (data) => data.institutionName },
  { field: 'institution_cnpj', getValue: (data) => data.institutionCnpj },
  { field: 'lab_name', getValue: (data) => data.labName },
  { field: 'lab_area', getValue: (data) => data.labArea },
  { field: 'lab_academic_unit', getValue: (data) => data.labAcademicUnit },
  { field: 'lab_structure_description', getValue: (data) => data.labStructureDescription },
  { field: 'main_improvement_objective', getValue: (data) => data.mainImprovementObjective },
  { field: 'technical_justification', getValue: (data) => data.technicalJustification },
  { field: 'expected_results', getValue: (data) => data.expectedResults },
];

export function computeEditalMissingItems(
  data: EditalWizardData,
  documents: EditalSubmissionDocument[]
): EditalMissingItem[] {
  const missing: EditalMissingItem[] = [];

  for (const { field, getValue } of REQUIRED_FIELDS) {
    const value = getValue(data);
    if (!value || value.trim().length === 0) {
      missing.push({ type: 'field', field });
    }
  }

  const presentCodes = new Set(documents.map((doc) => doc.requirementCode));
  for (const code of getSubmissionRequiredDocumentCodes()) {
    if (!presentCodes.has(code)) {
      missing.push({ type: 'document', requirementCode: code });
    }
  }

  const photoCount = documents.filter((doc) => doc.requirementCode === EDITAL_PHOTO_DOCUMENT_CODE).length;
  if (photoCount < EDITAL_MIN_PHOTO_COUNT) {
    missing.push({ type: 'photo', required: EDITAL_MIN_PHOTO_COUNT, found: photoCount });
  }

  return missing;
}

export const EDITAL_FIELD_LABELS: Record<string, string> = {
  institution_name: 'Nome da instituição',
  institution_cnpj: 'CNPJ da instituição',
  lab_name: 'Nome do laboratório',
  lab_area: 'Área de atuação do laboratório',
  lab_academic_unit: 'Unidade acadêmica, centro, núcleo ou setor',
  lab_structure_description: 'Descrição da estrutura do laboratório',
  main_improvement_objective: 'Objetivo principal da melhoria pretendida',
  technical_justification: 'Justificativa técnica',
  expected_results: 'Resultados esperados',
};

export const EDITAL_DOCUMENT_LABELS: Record<string, string> = {
  '8.1.1': 'Documento oficial de identificação com foto',
  '8.1.2': 'CPF do responsável',
  '8.1.3': 'Comprovante de vínculo institucional',
  '8.1.4': 'Currículo atualizado',
  '8.1.5': 'Comprovante de CNPJ da instituição',
  '8.1.6': 'Carta de anuência da instituição',
  '8.1.7': 'Documento de identificação do laboratório',
  '8.1.15': 'Declaração de responsabilidade',
  '8.1.16': 'Termo de compromisso de contrapartida',
};

export const EDITAL_STEP_BY_FIELD: Record<string, string> = {
  institution_name: 'instituicao',
  institution_cnpj: 'instituicao',
  lab_name: 'instituicao',
  lab_area: 'instituicao',
  lab_academic_unit: 'instituicao',
  lab_structure_description: 'fotos',
  main_improvement_objective: 'proposta',
  technical_justification: 'proposta',
  expected_results: 'proposta',
};

export const EDITAL_STEP_BY_DOCUMENT_CODE: Record<string, string> = {
  '8.1.1': 'equipe',
  '8.1.2': 'equipe',
  '8.1.3': 'equipe',
  '8.1.4': 'equipe',
  '8.1.5': 'instituicao',
  '8.1.6': 'instituicao',
  '8.1.7': 'instituicao',
  '8.1.15': 'declaracoes',
  '8.1.16': 'declaracoes',
};
