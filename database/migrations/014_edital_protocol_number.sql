-- 014_edital_protocol_number.sql
-- Protocolo legível ANO + sequencial (ex.: 20260001), gerado no envio final.

ALTER TABLE edital_submissions
  ADD COLUMN IF NOT EXISTS protocol_number VARCHAR(12) UNIQUE;

CREATE TABLE IF NOT EXISTS edital_protocol_sequences (
  year INT PRIMARY KEY,
  last_value INT NOT NULL DEFAULT 0
);
