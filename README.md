# Landing Page Comunidade InnovaNation

Landing page para inscrições na Comunidade InnovaNation com integração PostgreSQL e Google Sheets.

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

Consulte a pasta `MDs/` para documentação completa:
- `MDs/README.md` - Visão geral
- `MDs/BACKEND.md` - Documentação do backend
- `MDs/DEPLOY_RAPIDO_LOCAL.md` - Guia de deploy

## 🌐 URLs

- **Produção:** https://comunidade.innovatismc.com
- **Health Check:** https://comunidade.innovatismc.com/api/health

