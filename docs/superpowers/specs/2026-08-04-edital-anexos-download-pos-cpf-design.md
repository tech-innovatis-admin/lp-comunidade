# Edital — etapa de download dos anexos pós-CPF

**Data:** 2026-08-04  
**Status:** aprovado

## Objetivo

Após validar o CPF com sucesso (e antes do wizard), mostrar tela com 2 modelos para download. O usuário só segue ao formulário após confirmar que baixou os modelos.

## Mapeamento

| Arquivo | Código | Nome |
|---------|--------|------|
| Anexo I | 8.1.15 | Declaração de responsabilidade |
| Anexo II | 8.1.16 | Termo de compromisso de contrapartida |

Arquivos servidos em:
- `/edital/anexo-i-declaracao-responsabilidade.pdf`
- `/edital/anexo-ii-termo-contrapartida.pdf`

(fonte: PDFs movidos para `public/edital/`)

## Fluxo UI

1. CPF ok + ainda sem proposta enviada → estado `templates` no `EditalCpfGate`
2. Dois links/cards de download
3. Checkbox obrigatório confirmando download e ciência do envio na etapa Declarações
4. Continuar → `/edital/proposta` só com checkbox marcado
5. Já enviou proposta → pula essa tela

## Ajuste de copy

`TelaDeclaracoes`: corrigir rótulos Anexo I / Anexo II (hoje II/III).

## Fora de escopo

- Forçar download real (tracking de clique) — basta checkbox
- Alterar API de upload
