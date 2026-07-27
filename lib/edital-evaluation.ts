/**
 * Critérios oficiais de avaliação do Edital PPI (item 10.2 do edital), usados
 * tanto no modal de avaliação do painel admin (client) quanto na validação
 * da rota que salva a nota (server) — por isso este arquivo não importa nada
 * específico de servidor (banco, fs, etc), só dados e uma função pura.
 */

export interface EditalEvaluationCriterion {
  code: string;
  label: string;
  maxPoints: number;
}

export const EDITAL_EVALUATION_CRITERIA: EditalEvaluationCriterion[] = [
  { code: 'clareza_diagnostico', label: 'Clareza do diagnóstico e da necessidade apresentada', maxPoints: 15 },
  { code: 'potencial_impacto', label: 'Potencial de impacto acadêmico, educacional, social, tecnológico ou institucional', maxPoints: 20 },
  { code: 'viabilidade_tecnica', label: 'Viabilidade técnica, operacional e financeira da proposta', maxPoints: 20 },
  { code: 'coerencia_plano', label: 'Coerência do Plano de Aplicação dos recursos', maxPoints: 20 },
  { code: 'sustentabilidade', label: 'Sustentabilidade da melhoria após o patrocínio', maxPoints: 10 },
  { code: 'potencial_visibilidade', label: 'Potencial de visibilidade institucional e qualidade da contrapartida de divulgação', maxPoints: 10 },
  { code: 'aderencia_missao', label: 'Aderência à missão, valores e áreas de atuação da Innovatis', maxPoints: 5 },
];

export const EDITAL_EVALUATION_MAX_TOTAL = EDITAL_EVALUATION_CRITERIA.reduce(
  (sum, criterion) => sum + criterion.maxPoints,
  0
);

export const EDITAL_APPROVAL_MIN_SCORE = 70;

export interface EvaluationValidationResult {
  valid: boolean;
  total: number;
  error?: string;
}

export function validateEvaluationScores(scores: Record<string, unknown>): EvaluationValidationResult {
  let total = 0;

  for (const criterion of EDITAL_EVALUATION_CRITERIA) {
    const value = scores[criterion.code];

    if (typeof value !== 'number' || !Number.isInteger(value)) {
      return { valid: false, total: 0, error: `Nota inválida para "${criterion.label}"` };
    }

    if (value < 0 || value > criterion.maxPoints) {
      return {
        valid: false,
        total: 0,
        error: `A nota de "${criterion.label}" deve estar entre 0 e ${criterion.maxPoints}`,
      };
    }

    total += value;
  }

  return { valid: true, total };
}
