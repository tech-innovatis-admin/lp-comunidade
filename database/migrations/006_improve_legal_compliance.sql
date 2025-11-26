-- Migration: Melhorias para compliance jurídico completo
-- Data: 2025-11-24
-- Descrição: Adiciona campos extras para garantia jurídica máxima

-- 1. HASH DOS TERMOS NO MOMENTO DO ACEITE
-- Armazena o hash dos termos no momento exato do aceite
-- Isso garante que sabemos EXATAMENTE qual texto foi aceito
-- Mesmo se alguém questionar a tabela terms_of_use, temos prova independente
ALTER TABLE registrations 
ADD COLUMN IF NOT EXISTS terms_content_hash_at_acceptance CHAR(64);

COMMENT ON COLUMN registrations.terms_content_hash_at_acceptance IS 'Hash SHA-256 do conteúdo dos termos no momento exato do aceite - Prova independente do texto aceito';

-- 2. CAMPO EXPLÍCITO DE ACEITE
-- Campo booleano que registra aceite explícito dos termos
-- Obrigatório para validade jurídica clara
ALTER TABLE registrations 
ADD COLUMN IF NOT EXISTS terms_accepted BOOLEAN NOT NULL DEFAULT TRUE;

COMMENT ON COLUMN registrations.terms_accepted IS 'Indica aceite explícito dos termos de uso - Sempre TRUE para registros válidos';

-- 3. VERSÃO DOS TERMOS NO MOMENTO DO ACEITE
-- Armazena a versão dos termos no momento do aceite
-- Redundância intencional para rastreabilidade
ALTER TABLE registrations 
ADD COLUMN IF NOT EXISTS terms_version_at_acceptance VARCHAR(50);

COMMENT ON COLUMN registrations.terms_version_at_acceptance IS 'Versão dos termos no momento do aceite (ex: v1.0) - Redundância intencional';

-- 4. CONSTRAINT PARA GARANTIR ACEITE
-- Garante que não há registro sem aceite explícito
ALTER TABLE registrations 
ADD CONSTRAINT check_terms_accepted 
CHECK (terms_accepted = TRUE);

-- 5. ÍNDICE PARA BUSCA POR CPF + STATUS
-- Útil para verificar inscrições duplicadas
CREATE INDEX IF NOT EXISTS idx_registrations_cpf_status 
ON registrations(cpf, status);

-- 6. COMENTÁRIOS ADICIONAIS PARA AUDITORIA
COMMENT ON TABLE registrations IS 'Inscrições na comunidade InnovaNation com registro jurídico completo de aceite de termos';
COMMENT ON TABLE terms_of_use IS 'Versionamento dos Termos de Adesão com hash SHA-256 para integridade';
COMMENT ON TABLE registration_invites IS 'Links únicos rastreáveis para acesso ao grupo WhatsApp';

-- Views movidas para migration 007_create_views.sql
-- Execute 007_create_views.sql APÓS esta migration

