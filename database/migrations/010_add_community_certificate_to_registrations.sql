-- Migration: Certificado de Inscrição na Comunidade InnovaNation
-- Data: 2026-07-22
-- Descrição: campos para armazenar o PDF (gerado no gate de CPF do Edital PPI)
-- que comprova a inscrição confirmada na comunidade, para uso interno do time.
-- Independente do fluxo de submissão de proposta ao Edital.

ALTER TABLE registrations ADD COLUMN IF NOT EXISTS community_certificate_s3_key TEXT;
ALTER TABLE registrations ADD COLUMN IF NOT EXISTS community_certificate_hash CHAR(64);
ALTER TABLE registrations ADD COLUMN IF NOT EXISTS community_certificate_generated_at TIMESTAMPTZ;

COMMENT ON COLUMN registrations.community_certificate_s3_key IS 'Chave S3 do Certificado de Inscrição na Comunidade InnovaNation. Gerado uma única vez na primeira validação de CPF bem-sucedida no gate do Edital PPI, para uso interno do time validar que a pessoa está inscrita nos termos da comunidade — não depende de submissão de proposta ao Edital.';
COMMENT ON COLUMN registrations.community_certificate_hash IS 'Hash SHA-256 do PDF do certificado de inscrição, para verificação de integridade.';
COMMENT ON COLUMN registrations.community_certificate_generated_at IS 'Data/hora em que o certificado de inscrição foi gerado pela primeira vez.';
