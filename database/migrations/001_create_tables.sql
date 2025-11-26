-- Migration: Criação das tabelas principais
-- Data: 2025-01-XX
-- Descrição: Criação inicial das tabelas terms_of_use, registrations e registration_invites

-- Tabela de versionamento dos Termos de Uso
CREATE TABLE IF NOT EXISTS terms_of_use (
    id            BIGSERIAL PRIMARY KEY,
    version       VARCHAR(50) NOT NULL UNIQUE,
    title         VARCHAR(255) NOT NULL,
    content       TEXT NOT NULL,
    content_hash  CHAR(64) NOT NULL,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    is_active     BOOLEAN NOT NULL DEFAULT FALSE
);

-- Índice para busca rápida de termos ativos
CREATE INDEX IF NOT EXISTS idx_terms_of_use_active ON terms_of_use(is_active, created_at DESC);

-- Tabela de inscrições
CREATE TABLE IF NOT EXISTS registrations (
    id                      BIGSERIAL PRIMARY KEY,
    -- Dados pessoais
    full_name               VARCHAR(255) NOT NULL,
    profession              VARCHAR(255),
    organization            VARCHAR(255),
    cpf                     VARCHAR(20) NOT NULL,
    phone                   VARCHAR(30),
    email                   VARCHAR(255),
    address                 TEXT,
    projects                TEXT,
    -- Documento de identidade
    id_document_type        VARCHAR(50),
    id_document_file_path   TEXT,
    id_document_mime_type   VARCHAR(100),
    -- Aceite dos termos
    terms_id                BIGINT NOT NULL REFERENCES terms_of_use(id),
    terms_accepted_at       TIMESTAMPTZ NOT NULL,
    terms_accepted_ip       VARCHAR(45),
    terms_user_agent        TEXT,
    -- Status da inscrição
    status                  VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    -- Variante da landing
    variant                 VARCHAR(20) NOT NULL DEFAULT 'MANUAL',
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices para consultas frequentes
CREATE INDEX IF NOT EXISTS idx_registrations_cpf ON registrations(cpf);
CREATE INDEX IF NOT EXISTS idx_registrations_email ON registrations(email);
CREATE INDEX IF NOT EXISTS idx_registrations_status ON registrations(status);
CREATE INDEX IF NOT EXISTS idx_registrations_variant ON registrations(variant);
CREATE INDEX IF NOT EXISTS idx_registrations_terms_id ON registrations(terms_id);
CREATE INDEX IF NOT EXISTS idx_registrations_created_at ON registrations(created_at DESC);

-- Tabela de convites únicos para WhatsApp
CREATE TABLE IF NOT EXISTS registration_invites (
    id                    BIGSERIAL PRIMARY KEY,
    registration_id       BIGINT NOT NULL REFERENCES registrations(id) ON DELETE CASCADE,
    token                 VARCHAR(128) NOT NULL UNIQUE,
    whatsapp_group_url    TEXT NOT NULL,
    created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    used_at               TIMESTAMPTZ,
    used_ip               VARCHAR(45),
    used_user_agent       TEXT
);

-- Índices para convites
CREATE INDEX IF NOT EXISTS idx_registration_invites_token ON registration_invites(token);
CREATE INDEX IF NOT EXISTS idx_registration_invites_registration_id ON registration_invites(registration_id);
CREATE INDEX IF NOT EXISTS idx_registration_invites_used_at ON registration_invites(used_at);

-- Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_registrations_updated_at 
    BEFORE UPDATE ON registrations 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Comentários nas tabelas
COMMENT ON TABLE terms_of_use IS 'Versionamento dos Termos de Adesão, Reciprocidade e Compromisso de Repasse';
COMMENT ON TABLE registrations IS 'Inscrições na comunidade InnovaNation com registro jurídico de aceite';
COMMENT ON TABLE registration_invites IS 'Links únicos rastreáveis para grupo WhatsApp';

