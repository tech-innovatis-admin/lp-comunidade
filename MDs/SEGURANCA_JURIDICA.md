# 🔒 Segurança Jurídica - Armazenamento de Documentos

## ⚠️ Problema Identificado

**Situação Anterior (GAP CRÍTICO)**:
- Documentos armazenados no S3 (AWS)
- Apenas caminho (`file_path`) salvo no PostgreSQL
- **Riscos jurídicos**:
  - Arquivo pode ser deletado do S3 sem perder registro no banco
  - Não há garantia de integridade (sem hash)
  - Backup separado (S3 vs PostgreSQL)
  - Risco de desvinculação entre documento e registro
  - Impossível comprovar que documento não foi alterado

## ✅ Solução Implementada

### Armazenamento no PostgreSQL (BYTEA)

**Documentos agora são armazenados diretamente no PostgreSQL** com as seguintes garantias:

#### 1. **Integridade Transacional (ACID)**
- Documento e registro na **mesma transação**
- Impossível ter registro sem documento ou vice-versa
- Rollback automático em caso de erro

#### 2. **Hash SHA-256 para Verificação**
- Cada documento tem hash SHA-256 calculado no upload
- Hash armazenado junto com o documento
- Verificação de integridade em qualquer momento
- Detecta corrupção ou alteração do arquivo

#### 3. **Backup Automático**
- Documentos incluídos automaticamente no backup do PostgreSQL
- Backup único e consistente
- RTO/RPO garantidos pelo RDS AWS

#### 4. **Rastreabilidade Completa**
- Documento vinculado diretamente ao registro (`id`)
- Impossível perder documento sem perder registro
- Histórico completo no banco de dados

#### 5. **Metadados Completos**
- Nome original do arquivo
- Tipo MIME (image/jpeg, application/pdf, etc)
- Tamanho em bytes
- Hash SHA-256
- Data/hora de upload

---

## 📊 Estrutura do Banco de Dados

### Colunas de Documento na Tabela `registrations`:

```sql
id_document_data BYTEA                    -- Documento armazenado como binário
id_document_hash CHAR(64)                -- Hash SHA-256 para verificação
id_document_size_bytes INTEGER           -- Tamanho em bytes
id_document_original_filename VARCHAR(255) -- Nome original do arquivo
id_document_mime_type VARCHAR(100)       -- Tipo MIME (mantido)
```

### Colunas de Aceite de Termos:

```sql
terms_id BIGINT                          -- FK para tabela de termos
terms_accepted BOOLEAN                   -- Aceite explícito (sempre TRUE)
terms_accepted_at TIMESTAMPTZ            -- Timestamp do servidor (UTC)
terms_accepted_ip VARCHAR(45)            -- IP do cliente
terms_user_agent TEXT                    -- User-Agent (navegador/dispositivo)
terms_content_hash_at_acceptance CHAR(64) -- Hash SHA-256 dos termos no aceite
terms_version_at_acceptance VARCHAR(50)  -- Versão dos termos (ex: v1.0)
```

### Constraints de Integridade:

```sql
-- Garante que se há dados, há hash (e vice-versa)
CHECK (
  (id_document_data IS NULL AND id_document_hash IS NULL) OR
  (id_document_data IS NOT NULL AND id_document_hash IS NOT NULL)
)
```

### Índices:

```sql
-- Índice para busca por hash (detectar duplicatas)
CREATE INDEX idx_registrations_document_hash 
ON registrations(id_document_hash) 
WHERE id_document_hash IS NOT NULL;
```

---

## 🔍 Verificação de Integridade

### Endpoint de Download Seguro

**GET `/api/documents/:id`**

- Retorna documento armazenado no PostgreSQL
- **Verifica integridade** calculando hash SHA-256
- Compara com hash armazenado
- Retorna erro se documento estiver corrompido
- Headers de segurança incluídos

### Exemplo de Uso:

```bash
# Download de documento da inscrição #123
curl https://comunidade.innovatis.com/api/documents/123 \
  -H "Authorization: Bearer TOKEN" \
  --output documento.pdf
```

### Headers Retornados:

```
Content-Type: application/pdf
Content-Disposition: inline; filename="documento.pdf"
Content-Length: 245678
X-Document-Hash: abc123def456...
X-Document-Integrity: verified
Cache-Control: private, no-cache, no-store, must-revalidate
```

---

## 🛡️ Garantias Jurídicas

### 1. **Imutabilidade**
- Documento armazenado como BYTEA (binário)
- Hash SHA-256 garante que não foi alterado
- Verificação pode ser feita a qualquer momento

### 2. **Rastreabilidade**
- Documento vinculado diretamente ao registro
- Metadados completos (nome, tipo, tamanho, hash)
- Timestamp de upload automático

### 3. **Integridade**
- Transação ACID garante consistência
- Hash SHA-256 detecta corrupção
- Verificação automática no download

### 4. **Backup e Recuperação**
- Backup automático do PostgreSQL (RDS AWS)
- Documentos incluídos no backup
- RTO/RPO garantidos pela AWS

### 5. **Auditoria**
- Logs de acesso podem ser implementados
- Histórico de alterações no banco
- Verificação de integridade registrada

---

## 📝 Consultas Úteis

### Verificar Integridade de um Documento:

```sql
-- Buscar documento e verificar hash
SELECT 
  id,
  full_name,
  cpf,
  id_document_hash,
  id_document_size_bytes,
  id_document_original_filename,
  created_at
FROM registrations
WHERE id = 123;
```

### Listar Todos os Documentos:

```sql
-- Usar view criada
SELECT * FROM vw_registrations_with_documents
ORDER BY created_at DESC;
```

### Detectar Possíveis Duplicatas:

```sql
-- Encontrar documentos com mesmo hash (possíveis duplicatas)
SELECT 
  id_document_hash,
  COUNT(*) as count,
  array_agg(id ORDER BY created_at) as registration_ids
FROM registrations
WHERE id_document_hash IS NOT NULL
GROUP BY id_document_hash
HAVING COUNT(*) > 1;
```

### Estatísticas de Documentos:

```sql
-- Estatísticas gerais
SELECT 
  COUNT(*) as total_registrations,
  COUNT(id_document_data) as total_with_documents,
  SUM(id_document_size_bytes) as total_size_bytes,
  AVG(id_document_size_bytes) as avg_size_bytes,
  MAX(id_document_size_bytes) as max_size_bytes
FROM registrations;
```

---

## ⚙️ Migração de Dados Existentes

Se houver documentos antigos no S3 que precisam ser migrados:

1. **Script de migração** (a ser criado se necessário):
   - Buscar registros com `id_document_file_path` mas sem `id_document_data`
   - Download do S3
   - Upload para PostgreSQL
   - Calcular hash
   - Atualizar registro

2. **Validação**:
   - Verificar integridade de todos os documentos migrados
   - Comparar hash antes/depois
   - Manter backup do S3 até validação completa

---

## 🔐 Segurança Adicional

### Recomendações:

1. **Acesso Restrito**:
   - Endpoint `/api/documents/:id` deve ter autenticação
   - Apenas admins podem acessar documentos
   - Logs de acesso devem ser mantidos

2. **Criptografia**:
   - PostgreSQL pode usar criptografia em repouso (RDS AWS)
   - Conexões SSL/TLS obrigatórias
   - Credenciais seguras no `.env`

3. **Backup**:
   - Backup automático do RDS configurado
   - Backup de teste de restauração periódico
   - Backup off-site (opcional)

4. **Monitoramento**:
   - Alertas para falhas de integridade
   - Monitoramento de tamanho do banco
   - Logs de acesso a documentos

---

## ✅ Validação Jurídica

### O Sistema Agora Garante:

✅ **Identificação**: Nome, CPF, e-mail vinculados ao documento  
✅ **Integridade do Documento**: Hash SHA-256 garante que documento não foi alterado  
✅ **Integridade dos Termos**: Hash SHA-256 dos termos registrado no momento do aceite  
✅ **Rastreabilidade**: Documento vinculado diretamente ao registro  
✅ **Imutabilidade**: Documento armazenado como binário (BYTEA)  
✅ **Timestamp**: Data/hora gerada pelo servidor (UTC)  
✅ **IP e Dispositivo**: IP e User-Agent registrados  
✅ **Aceite Explícito**: Campo booleano `terms_accepted = TRUE`  
✅ **Versão dos Termos**: Versão exata registrada no aceite  
✅ **Backup**: Backup automático incluindo documentos  
✅ **Verificação**: Integridade pode ser verificada a qualquer momento  
✅ **Auditoria**: View `vw_audit_registrations` para consultas jurídicas  

### Dados Registrados em Cada Aceite:

| Campo | Descrição | Finalidade Jurídica |
|-------|-----------|---------------------|
| `full_name` | Nome completo | Identificação |
| `cpf` | CPF | Identificação única |
| `email` | E-mail | Contato e identificação |
| `phone` | Telefone | Contato |
| `id_document_data` | Documento de identidade (BYTEA) | Prova de identidade |
| `id_document_hash` | Hash SHA-256 do documento | Integridade |
| `terms_id` | FK para termos aceitos | Vínculo com termos |
| `terms_accepted` | TRUE | Aceite explícito |
| `terms_accepted_at` | Timestamp (servidor) | Momento do aceite |
| `terms_accepted_ip` | IP do cliente | Rastreabilidade |
| `terms_user_agent` | User-Agent | Identificação de dispositivo |
| `terms_content_hash_at_acceptance` | Hash dos termos | Prova do texto aceito |
| `terms_version_at_acceptance` | Versão (ex: v1.0) | Versionamento |

**Status**: ✅ **Sistema juridicamente robusto e válido**

---

**Última atualização**: 24 de Novembro de 2025  
**Implementado por**: Data Science Team - Innovatis MC

