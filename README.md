# 🏢 Landing Page Comunidade InnovaNation

**Status**: ✅ **EM PRODUÇÃO**  
**URL**: https://comunidade.innovatismc.com  
**Último Deploy**: 27 de Novembro de 2025  

Landing page completa para comunidade InnovaNation com:
- ✅ Formulário de inscrição com validação completa
- ✅ Upload de documentos de identidade
- ✅ Integração PostgreSQL + Google Sheets
- ✅ Validação de email e CPF únicos
- ✅ **Webhook N8N automático** para processamento de dados
- ✅ Deploy Docker ARM64 no EC2 t4g.micro

## 🚀 Deploy Rápido

### Build e Push para ECR

```powershell
.\ps1\build-e-push-local.ps1
```

### Deploy no EC2

Conecte no EC2 e execute:

```bash
cd /home/ec2-user/landing-page-innovatis
./scripts/deploy.sh
```

## 📁 Estrutura do Projeto

- `app/` - Aplicação Next.js (rotas, componentes, API)
- `lib/` - Bibliotecas e utilitários (DB, S3, Google Sheets)
- `database/` - Migrações SQL e termos de uso
- `scripts/` - Scripts de deploy e manutenção
  - `troubleshooting/` - Scripts de diagnóstico
- `ps1/` - Scripts PowerShell para Windows
- `MDs/` - Documentação do projeto

## 🔧 Scripts Principais

### PowerShell (Windows)
- `ps1/build-e-push-local.ps1` - Build e push para ECR
- `ps1/upload-para-ec2.ps1` - Upload código para EC2
- `ps1/corrigir-permissoes-final.ps1` - Corrigir permissões SSH

### Bash (EC2)
- `scripts/deploy.sh` - Deploy do container
- `scripts/build-and-push-ec2.sh` - Build no EC2
- `scripts/setup-ec2-build.sh` - Setup inicial do EC2

## 📚 Documentação

Consulte a pasta `MDs/` para documentação completa (inclui ajustes de Nginx para evitar truncamento de PDFs):
- `MDs/README.md` - Visão geral
- `MDs/BACKEND.md` - Documentação do backend
- `MDs/DEPLOY_RAPIDO_LOCAL.md` - Guia de deploy
- `MDs/DEPLOY.md` - Configuração completa (Nginx/SSL) e troubleshooting de PDFs

## 🛠️ Tecnologias

- **Frontend**: Next.js 15, React, Tailwind CSS, TypeScript
- **Backend**: Next.js API Routes, PostgreSQL (RDS), Node.js ARM64
- **Infra**: Docker ARM64, AWS ECR/EC2 t4g, Nginx, Let's Encrypt SSL
- **Integrações**: Google Sheets API, AWS SDK v3, **N8N Webhook**
- **Validações**: Email único, CPF único, Documentos obrigatórios
- **Segurança**: Hash SHA-256, Armazenamento BYTEA PostgreSQL

## 🌐 URLs

- **Produção:** https://comunidade.innovatismc.com
- **Health Check:** https://comunidade.innovatismc.com/api/health
- **Webhook N8N:** `https://v1teste.app.n8n.cloud/webhook/kriscia-comunidade`

