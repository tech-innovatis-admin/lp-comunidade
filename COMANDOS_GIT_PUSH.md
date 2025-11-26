# 📤 Comandos para Push no GitHub

Repositório: https://github.com/evituinnovatis/landing-page-innovatis

---

## ⚠️ IMPORTANTE - Antes de Fazer Push

### 1. Verificar Arquivos Sensíveis

Certifique-se de que **NÃO** vai commitar:
- `.env` (variáveis de ambiente)
- `*.pem` (chaves SSH)
- `hub-innovatis-keypair.pem` (chave SSH)
- Qualquer arquivo com credenciais

O `.gitignore` já está configurado para proteger esses arquivos.

---

## 🚀 Opção 1: Script Automatizado (Recomendado)

```powershell
.\ps1\git-push.ps1
```

O script vai:
1. Verificar arquivos sensíveis
2. Adicionar todos os arquivos
3. Mostrar o que será commitado
4. Pedir confirmação
5. Fazer commit e push

---

## 🚀 Opção 2: Comandos Manuais

### Passo 1: Verificar Status

```powershell
git status
```

### Passo 2: Verificar o que será commitado

```powershell
# Ver arquivos modificados/novos
git status --short

# Verificar se .env está sendo ignorado
git check-ignore .env
# Deve retornar: .env
```

### Passo 3: Adicionar Arquivos

```powershell
# Adicionar todos os arquivos (exceto os ignorados pelo .gitignore)
git add .
```

### Passo 4: Verificar o que será commitado

```powershell
git status
```

**VERIFIQUE** se nenhum arquivo sensível aparece!

### Passo 5: Fazer Commit

```powershell
git commit -m "feat: Deploy completo - Landing Page Comunidade InnovaNation

- Build Docker ARM64 configurado
- Deploy no EC2 (porta 3002)
- Integração PostgreSQL + Google Sheets
- Nginx + SSL configurados
- Documentação consolidada
- Scripts de deploy organizados
- Projeto em produção: https://comunidade.innovatismc.com"
```

### Passo 6: Fazer Push

```powershell
git push origin main
```

---

## 🔐 Autenticação no GitHub

Se o push falhar com erro de autenticação:

### Opção A: Token de Acesso Pessoal (Recomendado)

1. Acesse: https://github.com/settings/tokens
2. Crie um token com permissão `repo`
3. Use o token como senha ao fazer push

### Opção B: SSH Key

```powershell
# Verificar se tem SSH key configurada
ssh -T git@github.com

# Se não tiver, configurar:
# https://docs.github.com/en/authentication/connecting-to-github-with-ssh
```

### Opção C: GitHub CLI

```powershell
# Instalar GitHub CLI
winget install GitHub.cli

# Autenticar
gh auth login

# Fazer push
git push origin main
```

---

## ⚠️ Se Não Tiver Permissão de Escrita

Se o repositório está na conta do **vitu** e você não tem permissão de escrita:

### Opção 1: Pedir Permissão de Escrita
Peça ao vitu para adicionar você como **Collaborator** com permissão de escrita.

### Opção 2: Fork + Pull Request
1. Fazer fork do repositório para sua conta
2. Fazer push no seu fork
3. Criar Pull Request para o repositório original

### Opção 3: Branch Separada
```powershell
# Criar branch
git checkout -b campp/deploy-completo

# Fazer commit
git commit -m "..."

# Fazer push na sua branch
git push origin campp/deploy-completo

# Depois criar PR no GitHub
```

---

## ✅ Verificação Final

Após o push, verifique no GitHub:
- https://github.com/evituinnovatis/landing-page-innovatis

Todos os arquivos devem estar lá (exceto os ignorados pelo .gitignore).

