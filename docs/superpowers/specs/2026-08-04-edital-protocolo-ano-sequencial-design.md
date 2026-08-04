# Edital — protocolo ANO + sequencial

**Data:** 2026-08-04  
**Status:** aprovado

## Objetivo

Substituir o uso do `id` interno como “protocolo” por um número legível: `YYYY` + sequência de 4 dígitos (ex.: `20260001`), gerado **somente no envio final**.

## Decisões

- Geração no `POST /api/editais/proposta/enviar` (status → `SUBMITTED`).
- Sequência **reinicia a cada ano**.
- Ano pelo fuso `America/Fortaleza`.
- Sem backfill (banco será resetado / ainda não há produção).
- URL admin continua `/admin/editais/{id}`; protocolo é campo de negócio.
- Abordagem: coluna `protocol_number` + tabela `edital_protocol_sequences`.

## Schema (migration 014)

```sql
ALTER TABLE edital_submissions
  ADD COLUMN protocol_number VARCHAR(12) UNIQUE;

CREATE TABLE edital_protocol_sequences (
  year INT PRIMARY KEY,
  last_value INT NOT NULL DEFAULT 0
);
```

## Geração (transação do enviar)

1. Calcular `year` em America/Fortaleza.
2. `INSERT ... ON CONFLICT (year) DO UPDATE SET last_value = last_value + 1 RETURNING last_value` (ou equivalente com lock).
3. `protocol_number = `${year}${String(seq).padStart(4, '0')}``.
4. Persistir em `edital_submissions.protocol_number` junto com o submit.

Idempotência: se já `SUBMITTED` com protocolo, não regenerar.

## Consumidores

- Webhook N8N / Sheets: campo `protocolNumber` (e manter `id` interno).
- E-mails N8N devem preferir `protocolNumber` (ajuste operacional no workflow).
- Admin lista/detalhe: exibir protocolo.
- Script `resend-edital-webhook.js`: incluir `protocolNumber`.

## Fora de escopo

- Trocar PK/`id` pelo protocolo.
- Backfill histórico.
