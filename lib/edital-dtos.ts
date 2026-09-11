import type {
  EditalBudgetItem,
  EditalSubmissionDocumentDto,
  EditalSubmissionDto,
  EditalSubmissionStatus,
} from './edital-client-types';

type InternalDate = Date | string | null | undefined;

export type EditalSubmissionDocumentRow = {
  id: number | string;
  requirement_code: string;
  original_filename: string | null;
  mime_type: string;
  size_bytes: number | string;
  uploaded_at: Date | string;
};

export type EditalSubmissionRow = {
  id: number | string;
  status: EditalSubmissionStatus;
  team_description: string | null;
  institution_name: string | null;
  institution_cnpj: string | null;
  lab_name: string | null;
  lab_area: string | null;
  lab_academic_unit: string | null;
  lab_structure_description: string | null;
  main_improvement_objective: string | null;
  lab_served_public: string | null;
  budget_items: unknown;
  technical_justification: string | null;
  expected_results: string | null;
  created_at: InternalDate;
  updated_at: InternalDate;
  submitted_at: InternalDate;
  documents?: EditalSubmissionDocumentRow[];
};

function toNumber(value: number | string): number {
  return typeof value === 'number' ? value : Number(value);
}

export function toIsoDate(value: InternalDate): string | null {
  if (!value) {
    return null;
  }

  return new Date(value).toISOString();
}

function toBudgetItems(value: unknown): EditalBudgetItem[] | null {
  if (!Array.isArray(value)) {
    return null;
  }

  return value.map((item) => {
    const entry = item as Record<string, unknown>;
    return {
      descricao: typeof entry.descricao === 'string' ? entry.descricao : '',
      valor_estimado: typeof entry.valor_estimado === 'number' ? entry.valor_estimado : Number(entry.valor_estimado),
      justificativa: typeof entry.justificativa === 'string' ? entry.justificativa : '',
    };
  });
}

export function toDocumentDto(row: EditalSubmissionDocumentRow): EditalSubmissionDocumentDto {
  return {
    id: toNumber(row.id),
    requirementCode: row.requirement_code,
    originalFilename: row.original_filename,
    mimeType: row.mime_type,
    sizeBytes: toNumber(row.size_bytes),
    uploadedAt: toIsoDate(row.uploaded_at) ?? '',
  };
}

export function toSubmissionDto(row: EditalSubmissionRow): EditalSubmissionDto {
  return {
    id: toNumber(row.id),
    status: row.status,
    teamDescription: row.team_description,
    institutionName: row.institution_name,
    institutionCnpj: row.institution_cnpj,
    labName: row.lab_name,
    labArea: row.lab_area,
    labAcademicUnit: row.lab_academic_unit,
    labStructureDescription: row.lab_structure_description,
    mainImprovementObjective: row.main_improvement_objective,
    labServedPublic: row.lab_served_public,
    budgetItems: toBudgetItems(row.budget_items),
    technicalJustification: row.technical_justification,
    expectedResults: row.expected_results,
    createdAt: toIsoDate(row.created_at),
    updatedAt: toIsoDate(row.updated_at),
    submittedAt: toIsoDate(row.submitted_at),
    documents: (row.documents ?? []).map(toDocumentDto),
  };
}
