-- Migration: Armazenar documentos diretamente no PostgreSQL para garantia jurídica
-- Data: 2025-11-24
-- Descrição: Move armazenamento de documentos do S3 para PostgreSQL com hash SHA-256

-- Adiciona colunas para armazenar documento diretamente no banco
ALTER TABLE registrations 
ADD COLUMN IF NOT EXISTS id_document_data BYTEA,
ADD COLUMN IF NOT EXISTS id_document_hash CHAR(64),
ADD COLUMN IF NOT EXISTS id_document_size_bytes INTEGER,
ADD COLUMN IF NOT EXISTS id_document_original_filename VARCHAR(255);

-- Comentários nas colunas
COMMENT ON COLUMN registrations.id_document_data IS 'Documento de identidade armazenado como binário (BYTEA) - Garantia jurídica de integridade';
COMMENT ON COLUMN registrations.id_document_hash IS 'Hash SHA-256 do documento para verificação de integridade';
COMMENT ON COLUMN registrations.id_document_size_bytes IS 'Tamanho do arquivo em bytes';
COMMENT ON COLUMN registrations.id_document_original_filename IS 'Nome original do arquivo enviado pelo usuário';

-- Mantém colunas antigas do S3 por compatibilidade (podem ser removidas depois)
-- id_document_file_path e id_document_mime_type continuam existindo

-- Índice para busca por hash (útil para detectar duplicatas)
CREATE INDEX IF NOT EXISTS idx_registrations_document_hash ON registrations(id_document_hash) WHERE id_document_hash IS NOT NULL;

-- Constraint para garantir que documento tenha hash se tiver dados
ALTER TABLE registrations 
ADD CONSTRAINT check_document_integrity 
CHECK (
  (id_document_data IS NULL AND id_document_hash IS NULL) OR
  (id_document_data IS NOT NULL AND id_document_hash IS NOT NULL)
);

