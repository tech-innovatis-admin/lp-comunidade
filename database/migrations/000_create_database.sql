-- Script para criar banco de dados separado para Landing Page Comunidade
-- Execute este script conectado ao banco 'postgres' (banco padrão)

-- Criar banco de dados
CREATE DATABASE landing_page_comunidade
    WITH 
    OWNER = postgres
    ENCODING = 'UTF8'
    LC_COLLATE = 'en_US.utf8'
    LC_CTYPE = 'en_US.utf8'
    TABLESPACE = pg_default
    CONNECTION LIMIT = -1;

-- Comentário
COMMENT ON DATABASE landing_page_comunidade IS 'Banco de dados para Landing Page da Comunidade InnovaNation';

