-- Migration: Inserção do termo inicial
-- Data: 2025-01-XX
-- Descrição: Insere a primeira versão dos termos de uso (v1.0)

-- IMPORTANTE: Substitua o conteúdo abaixo pelo texto real dos Termos de Adesão
-- O hash será calculado automaticamente pelo backend ao inserir

INSERT INTO terms_of_use (version, title, content, content_hash, is_active)
VALUES (
    'v1.0',
    'Termo de Adesão, Reciprocidade e Compromisso de Repasse',
    'TEXTO COMPLETO DOS TERMOS AQUI - Substitua este texto pelo conteúdo real dos Termos de Adesão, Reciprocidade e Compromisso de Repasse da InnovaNation.',
    '', -- O hash será calculado pelo backend usando SHA-256
    TRUE
)
ON CONFLICT (version) DO NOTHING;

