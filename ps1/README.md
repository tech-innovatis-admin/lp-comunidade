# Scripts PowerShell

Scripts para automação de deploy e manutenção.

## Scripts Principais

- **`build-e-push-local.ps1`** - Build local da imagem Docker ARM64 e push para ECR (RECOMENDADO)
- **`upload-para-ec2.ps1`** - Upload do código para EC2 (se necessário fazer build no EC2)

## Scripts de Manutenção

- **`corrigir-permissoes-final.ps1`** - Corrige permissões da chave SSH no Windows
- **`limpar-imagens-parciais.ps1`** - Limpa imagens Docker parciais/intermediárias

## Uso

Execute os scripts diretamente no PowerShell:

```powershell
.\build-e-push-local.ps1
```

