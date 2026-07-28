# Visualizacao de Documentos no Google Sheets

## Objetivo

Permitir que o time interno veja o documento anexado pela inscricao diretamente na planilha de acompanhamento.

## Fluxo atual

1. O documento da inscricao fica salvo no PostgreSQL como `BYTEA`
2. O backend monta uma URL publica intermediaria em `/acesso-documento/[id]`
3. A URL e exportada para o Google Sheets
4. O Sheets exibe o link clicavel na coluna de documento
5. Ao acessar o link, a aplicacao redireciona para `/admin/login?next=/admin/editais?tab=pendentes` se nao houver sessao admin
6. Com sessao valida, o acesso cai direto em `/admin/editais?tab=pendentes`

## Formato da planilha

Exemplo de celula:

```text
=HYPERLINK("https://comunidade.innovatismc.com/acesso-documento/7","Ver documento")
```

## Arquivos envolvidos

- `app/api/inscricoes/route.ts`
- `app/acesso-documento/[id]/page.tsx`
- `lib/google-sheets.ts`

## Observacoes

- o link nao expira
- o endpoint de download direto continua existindo, mas o link exportado pela planilha usa o acesso autenticado
- a validacao de integridade continua no endpoint publico de download direto
- essa visibilidade existe apenas para o documento da inscricao da comunidade, nao para os arquivos do Edital

## Teste local

```powershell
npm run dev
curl http://localhost:3000/acesso-documento/1
```

## Se houver inscricoes antigas

Se a planilha antiga nao tiver a URL do documento, basta reenviar a linha com o formato atual ou atualizar manualmente a coluna correspondente.
