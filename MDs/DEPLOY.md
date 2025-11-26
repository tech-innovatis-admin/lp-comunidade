# 🚀 Guia de Deploy - Landing Page Comunidade InnovaNation

**Status**: ✅ Em Produção  
**URL**: https://comunidade.innovatismc.com  
**Última atualização**: 26 de Novembro de 2025

---

## 📋 Resumo da Arquitetura

- **Aplicação**: Next.js 15 (ARM64)
- **Container**: Docker no EC2 (porta 3002)
- **Banco**: PostgreSQL (RDS AWS)
- **Storage**: S3 para credenciais Google
- **Integração**: Google Sheets para tracking
- **Proxy**: Nginx com SSL (Let's Encrypt)

---

## 🚀 Deploy Rápido (Recomendado)

### 1. Build e Push Local (PowerShell)

```powershell
cd "C:\Users\campp\OneDrive\Área de Trabalho\v1 - ENTERPRISE\PLATAFORMAS\LP COMUNIDADE\landing-page-innovatis"
.\ps1\build-e-push-local.ps1
```

### 2. Deploy no EC2

```bash
# Conectar no EC2
ssh -i "hub-innovatis-keypair.pem" ec2-user@44.214.214.210

# Pull da nova imagem e reiniciar container
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin 891612552945.dkr.ecr.us-east-1.amazonaws.com
docker pull 891612552945.dkr.ecr.us-east-1.amazonaws.com/landing-comunidade-innovatis:latest
docker stop landing-comunidade
docker rm landing-comunidade
docker run -d \
  --name landing-comunidade \
  --restart unless-stopped \
  --env-file /home/ec2-user/landing-comunidade.env \
  -p 3002:3002 \
  891612552945.dkr.ecr.us-east-1.amazonaws.com/landing-comunidade-innovatis:latest

# Verificar
docker ps
curl http://localhost:3002/api/health
```

---

## 🔧 Configuração Inicial (Primeira vez)

### Arquivo de Variáveis de Ambiente no EC2

```bash
cat > /home/ec2-user/landing-comunidade.env << 'EOF'
NODE_ENV=production
PORT=3002
DB_HOST=nexus-db-prod.ci1kcsyewm34.us-east-1.rds.amazonaws.com
DB_PORT=5432
DB_NAME=landing_page_comunidade
DB_USER=postgres
DB_PASSWORD=InnovaLabs86
DB_SSL=true
DATABASE_URL=postgresql://postgres:InnovaLabs86@nexus-db-prod.ci1kcsyewm34.us-east-1.rds.amazonaws.com:5432/landing_page_comunidade
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=AKIA47GB733YTO5WSIZ2
AWS_SECRET_ACCESS_KEY=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
AWS_S3_BUCKET_NAME=innovanation-documents
GOOGLE_CREDENTIALS_S3_BUCKET=jsoninnovatis
GOOGLE_CREDENTIALS_S3_KEY=chave2.json
GOOGLE_CREDENTIALS_S3_REGION=us-east-2
GOOGLE_SHEET_NAME=InnovaNation - Inscrições Comunidade
PUBLIC_BASE_URL=https://comunidade.innovatismc.com
EOF
```

### Configuração Nginx

```bash
sudo tee /etc/nginx/conf.d/landing-comunidade.conf > /dev/null << 'EOF'
server {
    listen 80;
    server_name comunidade.innovatismc.com;
    location / {
        proxy_pass http://127.0.0.1:3002;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
EOF

sudo nginx -t
sudo systemctl reload nginx
```

### SSL com Certbot

```bash
sudo certbot --nginx -d comunidade.innovatismc.com
```

---

## 🔧 Comandos Úteis (EC2)

```bash
# Ver containers rodando
docker ps

# Ver logs em tempo real
docker logs -f landing-comunidade

# Parar container
docker stop landing-comunidade

# Reiniciar container
docker restart landing-comunidade

# Ver uso de recursos
docker stats landing-comunidade

# Health check
curl http://localhost:3002/api/health

# Ver logs do Nginx
sudo tail -f /var/log/nginx/error.log
```

---

## 🆘 Troubleshooting

### Container não inicia
```bash
docker logs landing-comunidade
sudo netstat -tlnp | grep 3002
```

### Nginx não funciona
```bash
sudo nginx -t
sudo tail -f /var/log/nginx/error.log
```

### Verificar certificados SSL
```bash
sudo certbot certificates
```

---

## 📊 Informações do Ambiente

| Componente | Valor |
|------------|-------|
| EC2 IP | 44.214.214.210 |
| Porta Interna | 3002 |
| ECR Registry | 891612552945.dkr.ecr.us-east-1.amazonaws.com |
| Imagem | landing-comunidade-innovatis:latest |
| RDS Host | nexus-db-prod.ci1kcsyewm34.us-east-1.rds.amazonaws.com |
| Database | landing_page_comunidade |
| S3 Docs | innovanation-documents |
| S3 Creds | jsoninnovatis |
| Google Sheet | InnovaNation - Inscrições Comunidade |

