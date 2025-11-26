-- Migration: Campos Jurídicos Adicionais
-- Data: 2025-11-25
-- Descrição: Adiciona campos extras para rastreabilidade jurídica máxima

-- 1. IDIOMA DO NAVEGADOR (Accept-Language)
-- Identifica o idioma configurado no navegador do usuário
-- Útil para provar localização/origem do usuário
ALTER TABLE registrations 
ADD COLUMN IF NOT EXISTS accept_language VARCHAR(255);

COMMENT ON COLUMN registrations.accept_language IS 'Header Accept-Language do navegador - Identifica idioma/localização do usuário';

-- 2. REFERER (URL de origem)
-- De onde o usuário veio antes de acessar a landing page
-- Útil para rastrear origem do tráfego e provar contexto de acesso
ALTER TABLE registrations 
ADD COLUMN IF NOT EXISTS referer TEXT;

COMMENT ON COLUMN registrations.referer IS 'Header Referer - URL de onde o usuário veio antes de acessar a landing';

-- 3. X-FORWARDED-FOR (IP real quando há proxy/load balancer)
-- Em produção com load balancer/CDN, o IP real vem neste header
-- Armazenamos separadamente para garantir captura do IP correto
ALTER TABLE registrations 
ADD COLUMN IF NOT EXISTS x_forwarded_for VARCHAR(500);

COMMENT ON COLUMN registrations.x_forwarded_for IS 'Header X-Forwarded-For - Lista de IPs quando há proxy/load balancer (IP real é o primeiro)';

-- 4. SEC-CH-UA (Client Hints - Informações detalhadas do navegador)
-- Informações mais precisas sobre navegador e versão
ALTER TABLE registrations 
ADD COLUMN IF NOT EXISTS sec_ch_ua TEXT;

COMMENT ON COLUMN registrations.sec_ch_ua IS 'Header Sec-CH-UA - Informações detalhadas do navegador (Client Hints)';

-- 5. SEC-CH-UA-PLATFORM (Sistema Operacional detalhado)
-- Sistema operacional do usuário
ALTER TABLE registrations 
ADD COLUMN IF NOT EXISTS sec_ch_ua_platform VARCHAR(100);

COMMENT ON COLUMN registrations.sec_ch_ua_platform IS 'Header Sec-CH-UA-Platform - Sistema operacional do usuário';

-- 6. SEC-CH-UA-MOBILE (Dispositivo móvel)
-- Indica se é dispositivo móvel
ALTER TABLE registrations 
ADD COLUMN IF NOT EXISTS sec_ch_ua_mobile VARCHAR(10);

COMMENT ON COLUMN registrations.sec_ch_ua_mobile IS 'Header Sec-CH-UA-Mobile - Indica se é dispositivo móvel (?0 = não, ?1 = sim)';

-- 7. FINGERPRINT DO REGISTRO (Hash único de todos os dados)
-- Hash SHA-256 de todos os dados do registro para verificação de integridade
ALTER TABLE registrations 
ADD COLUMN IF NOT EXISTS registration_fingerprint CHAR(64);

COMMENT ON COLUMN registrations.registration_fingerprint IS 'Hash SHA-256 de todos os dados do registro - Prova de integridade total do registro';

-- Atualiza comentário da tabela
COMMENT ON TABLE registrations IS 'Inscrições na comunidade InnovaNation com registro jurídico COMPLETO: dados pessoais, documento de identidade, aceite de termos, IP, navegador, idioma, origem e fingerprint de integridade';

