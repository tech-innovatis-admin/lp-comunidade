-- Migration: Cria tabelas de submissÃ£o do Edital PPI
-- Data: 2026-07-17
-- DescriÃ§Ã£o: persiste rascunhos, documentos anexados e status final da proposta

CREATE TABLE edital_submissions (
  id                      BIGSERIAL PRIMARY KEY,
  registration_id         BIGINT NOT NULL UNIQUE REFERENCES registrations(id),
  status                  VARCHAR(20) NOT NULL DEFAULT 'DRAFT',

  team_description        TEXT,

  institution_name        VARCHAR(255),
  institution_cnpj        VARCHAR(20),
  lab_name                VARCHAR(255),
  lab_area                VARCHAR(255),
  lab_served_public       TEXT,

  budget_items            JSONB,
  technical_justification TEXT,
  expected_results        TEXT,

  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  submitted_at            TIMESTAMPTZ
);

CREATE INDEX idx_edital_submissions_registration_id ON edital_submissions(registration_id);
CREATE INDEX idx_edital_submissions_status ON edital_submissions(status);

CREATE TABLE edital_submission_documents (
  id                BIGSERIAL PRIMARY KEY,
  submission_id     BIGINT NOT NULL REFERENCES edital_submissions(id) ON DELETE CASCADE,
  requirement_code  VARCHAR(20) NOT NULL,
  s3_key            TEXT NOT NULL,
  file_hash         CHAR(64) NOT NULL,
  mime_type         VARCHAR(100) NOT NULL,
  size_bytes        INTEGER NOT NULL,
  original_filename VARCHAR(255),
  uploaded_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_edital_submission_documents_submission_id ON edital_submission_documents(submission_id);
CREATE INDEX idx_edital_submission_documents_requirement_code ON edital_submission_documents(requirement_code);

CREATE TRIGGER update_edital_submissions_updated_at
BEFORE UPDATE ON edital_submissions
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
