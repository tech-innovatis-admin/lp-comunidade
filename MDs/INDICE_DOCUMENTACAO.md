# 📚 Índice de Documentação - Landing Page InnovaNation

**Status**: ✅ Em Produção  
**URL**: https://comunidade.innovatismc.com

---

## 📋 Documentação Principal

| Arquivo | Descrição |
|---------|-----------|
| [README.md](./README.md) | Visão geral do projeto |
| [DEPLOY.md](./DEPLOY.md) | **⭐ Guia completo de deploy (EM PRODUÇÃO)** |
| [BACKEND.md](./BACKEND.md) | Documentação técnica + Webhook N8N |
| [SEGURANCA_JURIDICA.md](./SEGURANCA_JURIDICA.md) | Garantias jurídicas do sistema |
| [VISUALIZACAO_DOCUMENTOS.md](./VISUALIZACAO_DOCUMENTOS.md) | Visualização de documentos na Google Sheets |

---

## 🔧 Configuração e Setup

| Arquivo | Descrição |
|---------|-----------|
| [CONFIGURACAO.md](./CONFIGURACAO.md) | Configuração do projeto |
| [INSTRUCOES_BANCO.md](./INSTRUCOES_BANCO.md) | Instruções do banco de dados |
| [EXECUTAR_MIGRATION.md](./EXECUTAR_MIGRATION.md) | Como executar migrations |

---

## 📝 Histórico e Testes

| Arquivo | Descrição |
|---------|-----------|
| [CHANGELOG.md](./CHANGELOG.md) | Registro de mudanças |
| [CHECKLIST_FINAL.md](../MDs/CHECKLIST_FINAL.md) | Checklist final de implementação |
| [TESTE_DUPLICATAS.md](../MDs/TESTE_DUPLICATAS.md) | Testes de validação de duplicatas |

---

## 🚀 Deploy Rápido

```powershell
# Build e push local
.\ps1\build-e-push-local.ps1

# Deploy no EC2
ssh -i "hub-innovatis-keypair.pem" ec2-user@44.214.214.210
# Depois: docker pull ... && docker run ...
```

Consulte [DEPLOY.md](./DEPLOY.md) para instruções completas.

---

**Última atualização**: 26 de Novembro de 2025
