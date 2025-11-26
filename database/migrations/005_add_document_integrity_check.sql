-- Migration: Adiciona função para verificação de integridade de documentos
-- Data: 2025-11-24
-- Descrição: Função para verificar integridade de documentos usando hash SHA-256
-- NOTA: A verificação real do hash deve ser feita na aplicação Node.js
-- Esta função é apenas para referência/documentação

-- Comentário sobre verificação de integridade
COMMENT ON COLUMN registrations.id_document_hash IS 'Hash SHA-256 do documento - Verificação feita na aplicação Node.js';

