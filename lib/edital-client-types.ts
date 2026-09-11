export type EditalSubmissionStatus = 'DRAFT' | 'SUBMITTED';

export type EditalDraftStep = 'equipe' | 'instituicao' | 'fotos' | 'proposta';

export interface EditalBudgetItem {
  descricao: string;
  valor_estimado: number;
  justificativa: string;
}

export interface EditalSubmissionDocumentDto {
  id: number;
  requirementCode: string;
  originalFilename: string | null;
  mimeType: string;
  sizeBytes: number;
  uploadedAt: string;
}

export interface EditalSubmissionDto {
  id: number;
  status: EditalSubmissionStatus;
  teamDescription: string | null;
  institutionName: string | null;
  institutionCnpj: string | null;
  labName: string | null;
  labArea: string | null;
  labAcademicUnit: string | null;
  labStructureDescription: string | null;
  mainImprovementObjective: string | null;
  labServedPublic: string | null;
  budgetItems: EditalBudgetItem[] | null;
  technicalJustification: string | null;
  expectedResults: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  submittedAt: string | null;
  documents: EditalSubmissionDocumentDto[];
}

export type EditalDraftRequestDto =
  | { step: 'equipe'; data: { team_description: string | null } }
  | {
      step: 'instituicao';
      data: {
        institution_name: string | null;
        institution_cnpj: string | null;
        lab_name: string | null;
        lab_area: string | null;
        lab_served_public: string | null;
        lab_academic_unit: string | null;
      };
    }
  | { step: 'fotos'; data: { lab_structure_description: string | null } }
  | {
      step: 'proposta';
      data: {
        budget_items: EditalBudgetItem[] | null;
        technical_justification: string | null;
        expected_results: string | null;
        main_improvement_objective: string | null;
      };
    };

export interface EditalDraftResponseDto {
  ok: true;
  submission?: EditalSubmissionDto | null;
  submissionId?: number | null;
  updatedAt?: string | null;
}

export type EditalMissingItem =
  | { type: 'document'; requirementCode: string }
  | { type: 'photo'; required: number; found: number }
  | { type: 'field'; field: string };

export interface EditalValidationDto {
  error: string;
  message?: string;
  missing?: EditalMissingItem[];
}

export interface EditalDocumentUploadResponseDto {
  documentId: number;
  requirementCode: string;
  filename: string;
  mimeType: string;
  uploadedAt: string;
}

export interface EditalWizardData {
  teamDescription: string;
  institutionName: string;
  institutionCnpj: string;
  labName: string;
  labArea: string;
  labAcademicUnit: string;
  labStructureDescription: string;
  mainImprovementObjective: string;
  labServedPublic: string;
  budgetItems: EditalBudgetItem[];
  technicalJustification: string;
  expectedResults: string;
}

export const EMPTY_WIZARD_DATA: EditalWizardData = {
  teamDescription: '',
  institutionName: '',
  institutionCnpj: '',
  labName: '',
  labArea: '',
  labAcademicUnit: '',
  labStructureDescription: '',
  mainImprovementObjective: '',
  labServedPublic: '',
  budgetItems: [],
  technicalJustification: '',
  expectedResults: '',
};
