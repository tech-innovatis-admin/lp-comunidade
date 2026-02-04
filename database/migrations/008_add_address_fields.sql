-- Migration: Adiciona campos de endereço detalhados (CEP)
-- Data: 2026-02-04
-- Descrição: adiciona colunas para CEP, logradouro, número, bairro, cidade e estado

ALTER TABLE registrations
  ADD COLUMN IF NOT EXISTS address_zip VARCHAR(9),
  ADD COLUMN IF NOT EXISTS address_street VARCHAR(255),
  ADD COLUMN IF NOT EXISTS address_number VARCHAR(50),
  ADD COLUMN IF NOT EXISTS address_neighborhood VARCHAR(255),
  ADD COLUMN IF NOT EXISTS address_city VARCHAR(255),
  ADD COLUMN IF NOT EXISTS address_state VARCHAR(2);

CREATE INDEX IF NOT EXISTS idx_registrations_address_zip ON registrations(address_zip);
CREATE INDEX IF NOT EXISTS idx_registrations_address_city ON registrations(address_city);
