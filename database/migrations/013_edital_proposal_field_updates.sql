-- 013_edital_proposal_field_updates.sql
-- Novos campos obrigatórios do wizard (unidade acadêmica, estrutura do lab, objetivo).

ALTER TABLE edital_submissions
  ADD COLUMN IF NOT EXISTS lab_academic_unit TEXT,
  ADD COLUMN IF NOT EXISTS lab_structure_description TEXT,
  ADD COLUMN IF NOT EXISTS main_improvement_objective TEXT;
