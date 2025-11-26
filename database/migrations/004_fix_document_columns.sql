-- Migration: Adicionar colunas de documento (versão corrigida)
-- Execute cada comando separadamente se houver erro

-- 1. Adiciona coluna para armazenar documento
ALTER TABLE registrations ADD COLUMN IF NOT EXISTS id_document_data BYTEA;

-- 2. Adiciona coluna para hash SHA-256
ALTER TABLE registrations ADD COLUMN IF NOT EXISTS id_document_hash CHAR(64);

-- 3. Adiciona coluna para tamanho em bytes
ALTER TABLE registrations ADD COLUMN IF NOT EXISTS id_document_size_bytes INTEGER;

-- 4. Adiciona coluna para nome original do arquivo
ALTER TABLE registrations ADD COLUMN IF NOT EXISTS id_document_original_filename VARCHAR(255);

-- 5. Índice para busca por hash
CREATE INDEX IF NOT EXISTS idx_registrations_document_hash ON registrations(id_document_hash) WHERE id_document_hash IS NOT NULL;

