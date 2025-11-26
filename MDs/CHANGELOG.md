# 📝 Changelog - Landing Page InnovaNation

Todas as mudanças notáveis neste projeto serão documentadas neste arquivo.

---

## [2025-11-24] - Melhorias de Compliance Jurídico

### 🔒 Melhorias de Compliance Jurídico

#### Adicionado
- **Hash dos termos no aceite**: `terms_content_hash_at_acceptance` - Prova independente do texto aceito
- **Aceite explícito**: `terms_accepted` (boolean) - Campo obrigatório TRUE
- **Versão dos termos no aceite**: `terms_version_at_acceptance` - Redundância intencional
- **View de auditoria**: `vw_audit_registrations` - Para consultas jurídicas
- **Migration**: `006_improve_legal_compliance.sql`

#### Impacto
- ✅ **Prova independente**: Hash dos termos registrado no momento exato do aceite
- ✅ **Aceite explícito**: Campo booleano obrigatório
- ✅ **Auditoria facilitada**: View para consultas jurídicas

---

## [2025-11-24] - Correção Crítica: Armazenamento de Documentos no PostgreSQL

### 🔒 Correção Crítica de Segurança Jurídica

#### Modificado
- **Armazenamento de documentos**: Movido de S3 para PostgreSQL (BYTEA)
- **Hash SHA-256**: Adicionado para verificação de integridade
- **Endpoint de download**: `/api/documents/:id` com verificação de integridade
- **Constraints**: Adicionadas para garantir integridade de dados

#### Adicionado
- Colunas na tabela `registrations`:
  - `id_document_data` (BYTEA) - Documento armazenado diretamente
  - `id_document_hash` (CHAR(64)) - Hash SHA-256
  - `id_document_size_bytes` (INTEGER) - Tamanho em bytes
  - `id_document_original_filename` (VARCHAR) - Nome original
- Migration `004_store_documents_in_postgres.sql`
- Migration `005_add_document_integrity_check.sql`
- View `vw_registrations_with_documents`
- Função `verify_document_integrity()`
- Documentação `SEGURANCA_JURIDICA.md`

#### Impacto
- ✅ **Validade jurídica garantida**: Documentos e registros na mesma transação
- ✅ **Integridade verificável**: Hash SHA-256 detecta corrupção/alteração
- ✅ **Backup automático**: Documentos incluídos no backup do PostgreSQL
- ✅ **Rastreabilidade completa**: Impossível perder documento sem perder registro

---

## [2025-11-24] - Implementação Completa do Backend

### ✅ Adicionado

#### Backend e API
- **API Routes implementadas**:
  - `GET /api/terms/active` - Busca termos de uso ativos
  - `POST /api/inscricoes` - Recebe e processa inscrições
  - `GET /api/convite/:token` - Redireciona para WhatsApp com token único
  - `GET /api/health` - Verificação de saúde do sistema

#### Banco de Dados
- **Banco criado**: `landing_page_comunidade` (PostgreSQL RDS AWS)
- **Tabelas implementadas**:
  - `terms_of_use` - Versionamento de termos com hash SHA-256
  - `registrations` - Inscrições com registro jurídico completo
  - `registration_invites` - Links únicos rastreáveis
- **Migrations SQL** criadas e executadas
- **Termo inicial** (v1.0) inserido no banco
- **Triggers** para atualização automática de timestamps

#### Integração AWS S3
- **Bucket criado**: `innovanation-documents`
- **Upload de documentos** funcionando
- **Validações**: Tipo (JPG, PNG, PDF) e tamanho (máx. 10MB)
- **Estrutura**: `documents/{timestamp}-{hash}.{ext}`

#### Sistema de Links Únicos
- **Token único** por inscrição (64 caracteres)
- **Rastreamento completo**: IP, data/hora, user-agent
- **One-time use**: Link expira após primeiro uso
- **Redirecionamento** para link oficial do grupo WhatsApp

#### Registro Jurídico
- **Versionamento imutável** de termos
- **Hash SHA-256** para integridade
- **Dados registrados**: Nome, CPF, e-mail, documento, IP, timestamp, user-agent, versão dos termos
- **Validade jurídica**: Sistema robusto para comprovação legal

#### Frontend Integrado
- **Formulário conectado** à API (`POST /api/inscricoes`)
- **Carregamento dinâmico** de termos (`GET /api/terms/active`)
- **Upload de documentos** integrado
- **Validações em tempo real** com feedback visual
- **Suporte a duas variantes**: MANUAL e WHATSAPP
- **UX completa**: Confete, modais, loading states

#### Infraestrutura
- **Dockerfile ARM64** criado para deploy em EC2
- **Scripts de setup** automatizados
- **Variáveis de ambiente** configuradas
- **Documentação completa** criada

### 🔧 Modificado

- `RegistrationFormSection.tsx` - Integrado com API backend
- `TermsModal.tsx` - Carrega termos dinamicamente da API
- `IdentityUploadSection.tsx` - Envia arquivos para API
- Estrutura de pastas - Adicionadas pastas `app/api/`, `lib/`, `database/`, `scripts/`

### 📚 Documentação

- `README.md` - Atualizado com estrutura completa do projeto
- `BACKEND.md` - Documentação técnica completa
- `STATUS_DESENVOLVIMENTO.md` - Status atual e gaps pendentes
- `STATUS_SETUP.md` - Status de configuração
- `PROXIMOS_PASSOS.md` - Próximos passos
- `INSTRUCOES_BANCO.md` - Instruções de banco de dados
- `EXECUTAR_MIGRATION.md` - Guia de migrations

### ⚠️ Limitações Conhecidas

- **WhatsApp**: Não oferece API oficial para links únicos que expiram automaticamente
- **Gap Pendente**: Sistema de análise/aprovação de inscrições não implementado
- **Gap Pendente**: Fluxo de aprovação WhatsApp não definido

### 📋 Próximos Passos

1. Definir fluxo de aprovação WhatsApp
2. Implementar sistema de análise de inscrições
3. Configurar link real do grupo WhatsApp
4. Testes finais completos
5. Deploy em produção
6. Configurar DNS no cPanel

---

## [2024-12] - Versão Inicial

### ✅ Adicionado

- Landing page frontend completa
- Componentes React responsivos
- Design mobile-first
- Integração básica com WhatsApp
- Efeitos visuais (partículas, animações)

---

**Mantido por**: Data Science Team - Innovatis MC

