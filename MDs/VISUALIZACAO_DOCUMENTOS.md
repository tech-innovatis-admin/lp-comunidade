# 📄 Visualização de Documentos no Google Sheets

## 🎯 Objetivo

Permitir que os revisores visualizem os documentos de identidade anexados diretamente na planilha do Google Sheets, facilitando a conferência manual das inscrições.

---

## 🔧 Implementação

### Fluxo

1. **Armazenamento**:
   - Documento é salvo no **PostgreSQL** (BYTEA) com hash SHA-256 para garantia jurídica

2. **URL Permanente**:
   - Gera URL permanente usando endpoint da própria API: `/api/documents/{id}`
   - Link **nunca expira** e funciona em **qualquer navegador**
   - Documento é servido diretamente do PostgreSQL com verificação de integridade

3. **Google Sheets**:
   - Insere link clicável na coluna "Documento" usando fórmula `HYPERLINK`
   - Revisor clica no link e visualiza o documento diretamente no navegador

---

## 📊 Estrutura na Planilha

| Coluna | Conteúdo |
|--------|----------|
| Documento | `=HYPERLINK("https://comunidade.innovatismc.com/api/documents/7","Ver Documento")` |

---

## 🔐 Segurança e Características

- **Link Permanente**: URL nunca expira
- **Público**: Funciona em qualquer navegador sem autenticação
- **Verificação de Integridade**: Hash SHA-256 verificado a cada acesso
- **Backup Jurídico**: Documento armazenado no PostgreSQL com metadados completos
- **Infra (Nginx)**: Para evitar truncamento de PDFs, manter `proxy_buffering off`, `proxy_request_buffering off`, `proxy_max_temp_file_size 0` e timeouts ampliados no bloco `location /` (ver `MDs/DEPLOY.md`).

---

## 🛠️ Arquivos Envolvidos

1. **`app/api/inscricoes/route.ts`**:
   - Gera URL permanente baseada no ID da inscrição
   - Passa URL para Google Sheets

2. **`app/api/documents/[id]/route.ts`**:
   - Serve o documento diretamente do PostgreSQL
   - Verifica integridade via hash SHA-256
   - Retorna com `Content-Disposition: inline` (abre no navegador)

3. **`lib/google-sheets.ts`**:
   - Aceita `document_view_url` no `RegistrationData`
   - Cria link clicável usando fórmula `HYPERLINK`

---

## ✅ Teste Local

```bash
# Rodar localmente
npm run dev

# Fazer uma inscrição de teste
# Verificar na planilha se aparece link "Ver Documento"
# Clicar e confirmar que abre o documento

# Testar endpoint diretamente (substitua o ID)
curl http://localhost:3000/api/documents/1
```

---

## 🔄 Inscrições Existentes

Para inscrições já feitas antes desta atualização:
- O documento está no PostgreSQL
- Basta acessar: `https://comunidade.innovatismc.com/api/documents/{id}`
- Pode-se atualizar a planilha manualmente ou criar script de migração

---

**Última atualização**: 26 de Novembro de 2025

