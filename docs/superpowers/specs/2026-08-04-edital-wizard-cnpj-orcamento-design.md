# Edital — restore de step, CNPJ e máscara de orçamento

**Data:** 2026-08-04  
**Status:** aprovado

## Objetivo

1. Corrigir abertura do wizard na aba Revisão quando o rascunho está vazio (fluxo pós-cadastro).
2. Máscara + validação + formatação de CNPJ na aba Instituição.
3. Máscara + formatação BRL e teto de valor nos itens de orçamento.

## 1. Restore de step (opção A)

Em `EditalPropostaWizard`, ao carregar o draft:

- Se o rascunho estiver **vazio** (sem conteúdo relevante de textos, documentos ou orçamento) → `currentStep = 'equipe'` e ignorar/limpar `localStorage` `edital_proposta_last_step`.
- Se o rascunho tiver **conteúdo** → restaurar a última aba salva, se válida.

Critério de “vazio”: equivalente a `EMPTY_WIZARD_DATA` (strings vazias, `budgetItems` vazio) e sem documentos no draft.

## 2. CNPJ

- UI em `TelaInstituicao`: máscara `00.000.000/0000-00` ao digitar.
- Validação de dígitos verificadores (`isValidCNPJ` em `lib/utils.ts`, espelhando CPF).
- Payload/persistência: **somente dígitos** (14).
- Feedback inline se incompleto/inválido; impedir avanço/salvar step instituição com CNPJ inválido quando o campo estiver preenchido o suficiente (14 dígitos e checksum falho) ou ao persistir.

## 3. Orçamento

- UI em `TelaProposta`: formatação BRL na digitação (ex. `1.234.567,89`).
- Valor interno `number`; teto **R$ 999.999.999,00** (`999_999_999`).
- Backend `normalizeBudgetItems` em `rascunho/route.ts`: rejeitar `valor_estimado > 999_999_999`.
- Constante compartilhada em `lib/edital-requirements.ts` (ex. `EDITAL_MAX_BUDGET_ITEM_VALUE`).

## Fora de escopo

- Alterar fluxo do gate CPF / inscrição.
- Mudanças no painel admin além do que já exibe esses campos.
