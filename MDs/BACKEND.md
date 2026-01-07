# 📚 Documentação do Backend - Landing Page InnovaNation

## 🎯 Visão Geral

Este documento descreve a implementação do backend para a landing page da comunidade **InnovaNation**, incluindo integração com PostgreSQL (RDS AWS), upload de arquivos para S3, versionamento de termos de uso e geração de links únicos para WhatsApp.

---

## 🏗️ Arquitetura

### Stack Tecnológica

- **Framework**: Next.js 15.4.3 (API Routes)
- **Banco de Dados**: PostgreSQL (RDS AWS)
- **Storage**: AWS S3
- **Runtime**: Node.js 20 (ARM64)
- **Containerização**: Docker

### Estrutura de Pastas

```
├── app/
│   ├── api/
│   │   ├── terms/
│   │   │   └── active/route.ts          # GET /api/terms/active
│   │   ├── inscricoes/
│   │   │   └── route.ts                  # POST /api/inscricoes
│   │   └── convite/
│   │       └── [token]/route.ts          # GET /api/convite/:token
│   └── convite/
│       └── [token]/page.tsx              # Página de redirecionamento
├── lib/
│   ├── db.ts                            # Pool de conexões PostgreSQL
│   ├── s3.ts                            # Serviço de upload S3
│   ├── utils.ts                         # Utilitários (hash, validações)
│   └── api.ts                           # Cliente API (frontend)
├── database/
│   └── migrations/
│       ├── 001_create_tables.sql        # Criação das tabelas
│       └── 002_insert_initial_term.sql  # Termo inicial
└── scripts/
    ├── migrate.sh                       # Script de migração
    └── insert-term.ts                   # Script para inserir termos
```

---

## 🗄️ Banco de Dados

### Tabelas

#### `terms_of_use`
Versionamento dos Termos de Adesão, Reciprocidade e Compromisso de Repasse.

```sql
CREATE TABLE terms_of_use (
    id            BIGSERIAL PRIMARY KEY,
    version       VARCHAR(50) NOT NULL UNIQUE,
    title         VARCHAR(255) NOT NULL,
    content       TEXT NOT NULL,
    content_hash  CHAR(64) NOT NULL,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    is_active     BOOLEAN NOT NULL DEFAULT FALSE
);
```

#### `registrations`
Inscrições na comunidade com registro jurídico completo.

```sql
CREATE TABLE registrations (
    id                      BIGSERIAL PRIMARY KEY,
    full_name               VARCHAR(255) NOT NULL,
    profession              VARCHAR(255),
    organization            VARCHAR(255),
    cpf                     VARCHAR(20) NOT NULL,
    phone                   VARCHAR(30),
    email                   VARCHAR(255),
    address                 TEXT,
    projects                TEXT,
    id_document_file_path   TEXT,
    id_document_mime_type   VARCHAR(100),
    terms_id                BIGINT NOT NULL REFERENCES terms_of_use(id),
    terms_accepted_at       TIMESTAMPTZ NOT NULL,
    terms_accepted_ip       VARCHAR(45),
    terms_user_agent        TEXT,
    status                  VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    variant                 VARCHAR(20) NOT NULL DEFAULT 'MANUAL',
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

#### `registration_invites`
Links únicos rastreáveis para grupo WhatsApp.

```sql
CREATE TABLE registration_invites (
    id                    BIGSERIAL PRIMARY KEY,
    registration_id       BIGINT NOT NULL REFERENCES registrations(id),
    token                 VARCHAR(128) NOT NULL UNIQUE,
    whatsapp_group_url    TEXT NOT NULL,
    created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    used_at               TIMESTAMPTZ,
    used_ip               VARCHAR(45),
    used_user_agent       TEXT
);
```

### Migrações

Execute as migrações em ordem:

```bash
# Via script
./scripts/migrate.sh

# Ou manualmente
psql -h $DB_HOST -U $DB_USER -d $DB_NAME -f database/migrations/001_create_tables.sql
psql -h $DB_HOST -U $DB_USER -d $DB_NAME -f database/migrations/002_insert_initial_term.sql
```

---

## 🔌 Endpoints da API

### GET `/api/terms/active`

Retorna a versão ativa dos Termos de Uso.

**Resposta:**
```json
{
  "id": 1,
  "version": "v1.0",
  "title": "Termo de Adesão, Reciprocidade e Compromisso de Repasse",
  "content_html": "<h1>Termos...</h1>",
  "content_hash": "abc123...",
  "created_at": "2025-01-23T20:00:00Z"
}
```

### POST `/api/inscricoes`

Recebe inscrições na comunidade.

**Content-Type:** `multipart/form-data`

**Campos:**
- `fullName` (string, obrigatório)
- `profession` (string)
- `organization` (string)
- `cpf` (string, obrigatório, validado)
- `phone` (string)
- `email` (string, obrigatório, validado)
- `address` (string)
- `projects` (string, opcional)
- `termsId` (number, obrigatório)
- `termsVersion` (string, obrigatório)
- `variant` (string: "MANUAL" | "WHATSAPP")
- `idDocumentFile` (File, obrigatório)

**Resposta (MANUAL):**
```json
{
  "status": "ok"
}
```

**Resposta (WHATSAPP):**
```json
{
  "status": "ok",
  "inviteUrl": "https://comunidade.innovatis.com.br/convite/abc123..."
}
```

### 🪝 Webhook N8N

Após o processamento bem-sucedido de uma inscrição, o sistema automaticamente envia um webhook para o N8N com todos os dados do cadastro.

**URL do Webhook:** `https://v1teste.app.n8n.cloud/webhook/kriscia-comunidade`

**Método:** `POST`

**Headers:**
```
Content-Type: application/json
```

**Payload Enviado:**
```json
{
  "id": 123,
  "full_name": "João Silva",
  "email": "joao@email.com",
  "phone": "+55 11 99999-9999",
  "cpf": "12345678901",
  "profession": "Desenvolvedor",
  "organization": "Empresa Ltda",
  "address": "Rua ABC, 123",
  "projects": "Projetos de inovação",
  "status": "PENDING",
  "document_view_url": "https://comunidade.innovatismc.com/api/documents/123",
  "document_hash": "abc123def456...",
  "document_size": 2048576,
  "document_mime_type": "application/pdf",
  "document_original_filename": "documento.pdf",
  "terms_version": "v1.0",
  "terms_content_hash": "hash_termos_123...",
  "registration_fingerprint": "fingerprint_456...",
  "client_ip": "192.168.1.100",
  "user_agent": "Mozilla/5.0...",
  "accept_language": "pt-BR,pt;q=0.9",
  "referer": "https://comunidade.innovatismc.com",
  "x_forwarded_for": "192.168.1.100",
  "sec_ch_ua": "\"Google Chrome\";v=\"119\"",
  "sec_ch_ua_platform": "\"Windows\"",
  "sec_ch_ua_mobile": "?0",
  "variant": "MANUAL",
  "created_at": "2025-11-26T12:00:00.000Z"
}
```

**Características:**
- ✅ **Assíncrono**: Não bloqueia a resposta ao usuário
- ✅ **Falha Segura**: Se o webhook falhar, o cadastro continua válido
- ✅ **Dados Completos**: Inclui todos os campos + metadados de rastreabilidade
- ✅ **Retry**: Implementado na aplicação (não afeta o fluxo principal)

**Configuração no N8N:**
1. Criar workflow com trigger **Webhook**
2. Configurar **HTTP Method**: `POST`
3. Usar **Production URL**: `https://v1teste.app.n8n.cloud/webhook/kriscia-comunidade`
4. **Ativar o workflow** para que a URL de produção funcione
5. O payload JSON estará disponível em `$json` nos próximos nós

**Teste do Webhook:**
```bash
# Executar teste local
node scripts/test-webhook.js
```

**Nota:** O webhook retorna 404 até que o workflow seja criado e ativado no N8N.

### GET `/api/convite/:token`

Redireciona para o grupo WhatsApp usando token único.

**Resposta:** HTTP 302 Redirect para `whatsapp_group_url`

---

## 🔐 Segurança e Validações

### Validações Implementadas

1. **CPF**: Validação completa com cálculo de dígitos verificadores
2. **E-mail**: Formato válido
3. **Arquivos**: Tipo (JPG, PNG, PDF) e tamanho (máx. 10MB)
4. **Termos**: Verificação de versão ativa antes de aceitar

### Registro Jurídico

Cada inscrição registra:
- **Timestamp do servidor** (`terms_accepted_at`)
- **IP do cliente** (`terms_accepted_ip`)
- **User-Agent** (`terms_user_agent`)
- **Versão dos termos** (`terms_id` → `terms_of_use`)
- **Hash do conteúdo** (para integridade)

---

## 📦 Upload de Arquivos (S3)

### Configuração

1. Crie um bucket S3 na AWS
2. Configure credenciais IAM com permissões:
   - `s3:PutObject`
   - `s3:GetObject`
3. Configure variáveis de ambiente (ver `env.example`)

### Estrutura de Armazenamento

```
s3://innovanation-documents/
  └── documents/
      └── {timestamp}-{hash}.{ext}
```

---

## 🚀 Deploy

### Build Docker (ARM64)

```bash
# Build para ARM64
docker buildx build --platform linux/arm64 -t innovanation-backend:latest .

# Ou usando buildx
docker buildx create --use
docker buildx build --platform linux/arm64 -t innovanation-backend:latest --load .
```

### Deploy em EC2 (t4g)

1. **Criar instância EC2 ARM64** (t4g.micro ou superior)
2. **Instalar Docker:**
   ```bash
   sudo yum update -y
   sudo yum install docker -y
   sudo systemctl start docker
   sudo usermod -a -G docker ec2-user
   ```

3. **Fazer pull/build da imagem:**
   ```bash
   docker pull innovanation-backend:latest
   # ou
   docker build -t innovanation-backend .
   ```

4. **Executar container:**
   ```bash
   docker run -d \
     --name innovanation-app \
     -p 3000:3000 \
     --env-file .env \
     innovanation-backend:latest
   ```

5. **Configurar Nginx (opcional):**
   ```nginx
   server {
       listen 80;
       server_name comunidade.innovatis.com.br;

       location / {
           proxy_pass http://localhost:3000;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
       }
   }
   ```

### DNS (cPanel)

Configure registros DNS no cPanel apontando para o IP do servidor:

- `comunidade.innovatis.com.br` → IP do servidor
- `comunidade-auto.innovatis.com.br` → IP do servidor (variante WHATSAPP)

---

## 🔧 Configuração

### Variáveis de Ambiente

Copie `env.example` para `.env` e configure:

```bash
# Banco de Dados
DB_HOST=your-rds-endpoint.region.rds.amazonaws.com
DB_PORT=5432
DB_NAME=innovanation
DB_USER=postgres
DB_PASSWORD=your-password
DB_SSL=true

# AWS S3
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-key
AWS_SECRET_ACCESS_KEY=your-secret
AWS_S3_BUCKET_NAME=innovanation-documents

# URLs
PUBLIC_BASE_URL=https://comunidade.innovatis.com.br
WHATSAPP_GROUP_INVITE_URL=https://chat.whatsapp.com/...

# Variante
NEXT_PUBLIC_LANDING_VARIANT=MANUAL  # ou WHATSAPP
```

---

## 📝 Gestão de Termos

### Inserir Nova Versão

```bash
# Criar arquivo HTML com o conteúdo dos termos
echo "<h1>Termos...</h1>" > database/terms/v2.0.html

# Inserir no banco
npx tsx scripts/insert-term.ts database/terms/v2.0.html v2.0 "Título dos Termos"
```

O script:
1. Calcula hash SHA-256 do conteúdo
2. Desativa versões anteriores
3. Insere nova versão como ativa

---

## 🧪 Testes

### Testar Endpoints

```bash
# Buscar termos ativos
curl http://localhost:3000/api/terms/active

# Enviar inscrição (exemplo)
curl -X POST http://localhost:3000/api/inscricoes \
  -F "fullName=João Silva" \
  -F "cpf=12345678901" \
  -F "email=joao@example.com" \
  -F "termsId=1" \
  -F "termsVersion=v1.0" \
  -F "variant=MANUAL" \
  -F "idDocumentFile=@documento.pdf"
```

---

## 📊 Monitoramento

### Logs

Os logs incluem:
- Conexões com banco de dados
- Queries executadas (com tempo)
- Erros de validação
- Uploads de arquivos

### Métricas Importantes

- Taxa de inscrições por dia
- Taxa de uso de convites
- Erros de validação
- Performance de queries

---

## 🐛 Troubleshooting

### Erro de Conexão com Banco

- Verifique credenciais em `.env`
- Verifique Security Groups do RDS
- Teste conexão: `psql -h $DB_HOST -U $DB_USER -d $DB_NAME`

### Erro de Upload S3

- Verifique credenciais AWS
- Verifique permissões IAM
- Verifique se o bucket existe

### Erro de Build Docker

- Certifique-se de usar `--platform linux/arm64`
- Verifique se Node.js 20 está disponível para ARM64

---

## 📞 Suporte

Para dúvidas ou problemas, consulte:
- Documentação do Next.js: https://nextjs.org/docs
- Documentação AWS S3: https://docs.aws.amazon.com/s3/
- Documentação PostgreSQL: https://www.postgresql.org/docs/

---

---

## ⚠️ Limitações Conhecidas

### Links Únicos do WhatsApp

O sistema implementa o máximo possível dentro das limitações do WhatsApp:

**✅ Implementado:**
- Link único interno por inscrição (`/convite/{token}`)
- Rastreamento completo (IP, data, user-agent)
- Expiração após primeiro uso
- Auditoria total

**❌ Limitação do WhatsApp:**
- WhatsApp não oferece API oficial para links únicos que expiram automaticamente
- O link oficial do grupo é o mesmo para todos
- Após entrar, pessoa pode copiar e compartilhar o link do grupo

**Solução recomendada**: Configurar grupo para exigir aprovação do admin.

---

**Última atualização**: 24 de Novembro de 2025

