-- Migration: Suporte a miniaturas no painel admin
-- Data: 2026-07-23
-- Descrição: colunas para cachear a miniatura (1ª página renderizada, para
-- PDFs; versão redimensionada, para fotos/certificado) gerada sob demanda
-- na primeira visualização de cada documento no painel admin.

ALTER TABLE edital_submission_documents ADD COLUMN IF NOT EXISTS thumbnail_s3_key TEXT;
ALTER TABLE registrations ADD COLUMN IF NOT EXISTS community_certificate_thumbnail_s3_key TEXT;

COMMENT ON COLUMN edital_submission_documents.thumbnail_s3_key IS 'Chave S3 da miniatura (JPEG, ~400px) gerada sob demanda na primeira visualização do documento no painel admin. NULL até a primeira geração.';
COMMENT ON COLUMN registrations.community_certificate_thumbnail_s3_key IS 'Chave S3 da miniatura (JPEG, ~400px) do Certificado de Inscrição na Comunidade, gerada sob demanda na primeira visualização no painel admin. NULL até a primeira geração.';
