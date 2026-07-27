-- Migration: Avaliação e desqualificação de propostas do Edital PPI
-- Data: 2026-07-27
-- Descrição: colunas para registrar a avaliação interna (nota por critério,
-- nota final) e a desqualificação manual (com motivo) de cada proposta.
-- Não introduz um novo valor de status — a aba/classificação de cada
-- proposta no painel admin é derivada destas colunas (ver CLAUDE.md).

ALTER TABLE edital_submissions ADD COLUMN IF NOT EXISTS evaluation_scores JSONB;
ALTER TABLE edital_submissions ADD COLUMN IF NOT EXISTS evaluation_total_score SMALLINT;
ALTER TABLE edital_submissions ADD COLUMN IF NOT EXISTS evaluated_by VARCHAR(255);
ALTER TABLE edital_submissions ADD COLUMN IF NOT EXISTS evaluated_at TIMESTAMPTZ;
ALTER TABLE edital_submissions ADD COLUMN IF NOT EXISTS disqualified_at TIMESTAMPTZ;
ALTER TABLE edital_submissions ADD COLUMN IF NOT EXISTS disqualified_reason TEXT;
ALTER TABLE edital_submissions ADD COLUMN IF NOT EXISTS disqualified_by VARCHAR(255);

CREATE INDEX IF NOT EXISTS idx_edital_submissions_evaluation_total_score ON edital_submissions(evaluation_total_score);
CREATE INDEX IF NOT EXISTS idx_edital_submissions_disqualified_at ON edital_submissions(disqualified_at);

COMMENT ON COLUMN edital_submissions.evaluation_scores IS 'Notas por critério de avaliação (item 10.2 do edital), objeto JSON {codigo_criterio: nota}. NULL até a primeira avaliação.';
COMMENT ON COLUMN edital_submissions.evaluation_total_score IS 'Soma das notas em evaluation_scores (0-100), persistida separadamente para permitir ORDER BY no ranking sem calcular o JSONB.';
COMMENT ON COLUMN edital_submissions.evaluated_by IS 'Nome de quem registrou a avaliação (da sessão do painel admin, tabela users compartilhada).';
COMMENT ON COLUMN edital_submissions.evaluated_at IS 'Quando a avaliação foi registrada. NULL até a primeira avaliação.';
COMMENT ON COLUMN edital_submissions.disqualified_at IS 'Quando a proposta foi desqualificada manualmente pelo time. NULL se nunca foi desqualificada ou se a desqualificação foi revertida.';
COMMENT ON COLUMN edital_submissions.disqualified_reason IS 'Motivo informado ao desqualificar. Obrigatório no momento da desqualificação, mas limpo ao reverter.';
COMMENT ON COLUMN edital_submissions.disqualified_by IS 'Nome de quem desqualificou a proposta (da sessão do painel admin).';
