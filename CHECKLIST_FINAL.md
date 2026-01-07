# ✅ Checklist Final - Visualização de Documentos

## 🔍 Revisão Completa

### ✅ 1. Código de Inscrição (`app/api/inscricoes/route.ts`)
- [x] Remove dependências de S3 (uploadFile, getSignedFileUrl)
- [x] Gera URL permanente usando `PUBLIC_BASE_URL`
- [x] URL formatada como: `${baseUrl}/api/documents/${registrationId}`
- [x] Passa `document_view_url` para Google Sheets

### ✅ 2. Endpoint de Documentos (`app/api/documents/[id]/route.ts`)
- [x] Busca documento do PostgreSQL
- [x] Verifica integridade via hash SHA-256
- [x] Retorna com `Content-Disposition: inline` (abre no navegador)
- [x] Headers corretos para visualização (Content-Type, Content-Length)

### ✅ 3. Google Sheets (`lib/google-sheets.ts`)
- [x] Recebe `document_view_url` no `RegistrationData`
- [x] Cria fórmula `HYPERLINK` correta (vírgula como separador)
- [x] Fallback para texto se URL não disponível

### ✅ 4. Variáveis de Ambiente
- [x] `PUBLIC_BASE_URL` configurado no `.env`
- [x] Fallback para produção se não configurado

---

## 🧪 Teste Local

### Configuração
```bash
# No .env local, configure:
PUBLIC_BASE_URL=http://localhost:3000
```

### Passos
1. ✅ Rodar `npm run dev`
2. ✅ Fazer inscrição de teste
3. ✅ Verificar na planilha se aparece link "Ver Documento"
4. ✅ Clicar no link → deve abrir documento no navegador

**Nota**: Link local (`http://localhost:3000/api/documents/{id}`) só funciona na mesma máquina. Isso é esperado para teste local.

---

## 🚀 Deploy EC2 ARM64

### Configuração
```bash
# No .env do EC2:
PUBLIC_BASE_URL=https://comunidade.innovatismc.com
```

### Funcionamento
- ✅ URL na planilha: `https://comunidade.innovatismc.com/api/documents/{id}`
- ✅ Link funciona em qualquer navegador
- ✅ Link nunca expira
- ✅ Documento abre diretamente no navegador (não baixa)

---

## 🔐 Segurança

- ✅ Documento armazenado no PostgreSQL (BYTEA)
- ✅ Hash SHA-256 verificado a cada acesso
- ✅ Endpoint público mas com verificação de integridade
- ✅ Headers de segurança configurados

---

## 📋 Pontos de Atenção

1. **Teste Local**: Link `localhost` só funciona na mesma máquina
2. **Deploy**: Certifique-se de que `PUBLIC_BASE_URL` está correto no `.env` do EC2
3. **Google Sheets**: Fórmula `HYPERLINK` precisa de aspas duplas na URL
4. **Content-Disposition**: `inline` faz abrir no navegador, não baixar

---

**Status**: ✅ Pronto para teste e deploy!

