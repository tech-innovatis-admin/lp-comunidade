# Landing Page Comunidade InnovaNation

Status: em producao
URL: https://comunidade.innovatismc.com

Projeto Next.js 15 para a comunidade InnovaNation, com dois fluxos principais:

- Landing page publica com formulario de inscricao
- Rota dedicada `/inscricao` como comunicado de pre-cadastro
- Rota `/inscricao/formulario` para concluir o cadastro antes do Edital
- Fluxo do Edital PPI, com gate por CPF, wizard de proposta e painel admin

## O que o sistema faz hoje

- Recebe inscricoes em `/api/inscricoes`
- Valida CPF, email, origem, tamanho de payload, assinatura de arquivo e termos ativos
- Armazena documento de identidade no PostgreSQL como `BYTEA`, com hash SHA-256
- Envia os dados da inscricao para Google Sheets e webhook N8N, de forma best-effort
- Exibe o link de documento por `/acesso-documento/[id]`, com redirecionamento para login do admin e retorno para `/admin/editais?tab=pendentes`
- Libera o fluxo do Edital em `/edital`, com token de sessao assinado a partir do CPF validado
- Oferece `/inscricao` como pagina de pre-cadastro e `/inscricao/formulario` como pagina do formulario
- Mantem painel admin em `/admin/editais` para avaliacao e desqualificacao de propostas

## Estrutura resumida

- `app/` - rotas, paginas e componentes React
- `lib/` - banco, seguranca, Google Sheets, S3, utilitarios e auth
- `database/` - migrations SQL e termo ativo
- `scripts/` - automacoes de setup, migracao e manutencao
- `ps1/` - scripts PowerShell para Windows
- `MDs/` - documentacao tecnica do projeto

## Scripts principais

```powershell
npm run dev
npm run build
npm run start
npm run lint
npm run migrate
npm run update-term-v1.0
```

## Documentacao principal

- [MDs/README.md](MDs/README.md)
- [MDs/INDICE_DOCUMENTACAO.md](MDs/INDICE_DOCUMENTACAO.md)
- [MDs/BACKEND.md](MDs/BACKEND.md)
- [MDs/DEPLOY.md](MDs/DEPLOY.md)
- [MDs/SEGURANCA_JURIDICA.md](MDs/SEGURANCA_JURIDICA.md)
- [MDs/VISUALIZACAO_DOCUMENTOS.md](MDs/VISUALIZACAO_DOCUMENTOS.md)

## Tecnologias

- Next.js 15, React 19, TypeScript, Tailwind CSS 4
- PostgreSQL, `pg`
- Google Sheets API
- AWS S3
- n8n webhook
- Docker ARM64 para EC2

## Observacoes

- O fluxo legado de WhatsApp nao faz parte do fluxo ativo.
- As variaveis legadas relacionadas a WhatsApp estao marcadas como deprecated em `env.example`.
- O arquivo `MDs/DEPLOY_RAPIDO_LOCAL.md` nao existe mais; use `MDs/DEPLOY.md`.
