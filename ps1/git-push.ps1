# Script para fazer commit e push para GitHub
# Repositorio: https://github.com/evituinnovatis/landing-page-innovatis

Write-Host "Preparando commit e push para GitHub..." -ForegroundColor Cyan
Write-Host ""

# Verificar se .env existe e avisar
if (Test-Path ".env") {
    Write-Host "AVISO: Arquivo .env encontrado!" -ForegroundColor Yellow
    Write-Host "Certifique-se de que .gitignore esta protegendo este arquivo." -ForegroundColor Yellow
    Write-Host ""
    $confirm = Read-Host "Deseja continuar? (S/N)"
    if ($confirm -ne "S" -and $confirm -ne "s") {
        Write-Host "Operacao cancelada." -ForegroundColor Red
        exit 1
    }
}

# Verificar status
Write-Host "Verificando status do Git..." -ForegroundColor Gray
git status --short

Write-Host ""
Write-Host "Adicionando todos os arquivos..." -ForegroundColor Gray
git add .

Write-Host ""
Write-Host "Verificando o que sera commitado..." -ForegroundColor Gray
git status --short

Write-Host ""
Write-Host "IMPORTANTE: Verifique se nenhum arquivo sensivel sera commitado!" -ForegroundColor Yellow
Write-Host "Especialmente: .env, *.pem, chaves SSH, etc." -ForegroundColor Yellow
Write-Host ""
$confirm = Read-Host "Deseja fazer commit? (S/N)"

if ($confirm -ne "S" -and $confirm -ne "s") {
    Write-Host "Operacao cancelada. Use 'git reset' para desfazer o git add." -ForegroundColor Yellow
    exit 1
}

# Fazer commit
Write-Host ""
Write-Host "Fazendo commit..." -ForegroundColor Gray
$commitMessage = "feat: Deploy completo - Landing Page Comunidade InnovaNation

- Build Docker ARM64 configurado
- Deploy no EC2 (porta 3002)
- Integracao PostgreSQL + Google Sheets
- Nginx + SSL configurados
- Documentacao consolidada
- Scripts de deploy organizados
- Projeto em producao: https://comunidade.innovatismc.com"

git commit -m $commitMessage

if ($LASTEXITCODE -ne 0) {
    Write-Host "ERRO: Commit falhou!" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Fazendo push para GitHub..." -ForegroundColor Gray
Write-Host "Repositorio: https://github.com/evituinnovatis/landing-page-innovatis" -ForegroundColor Cyan
Write-Host ""

git push origin main

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "ERRO: Push falhou!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Possiveis causas:" -ForegroundColor Yellow
    Write-Host "1. Sem permissao de escrita no repositorio" -ForegroundColor Yellow
    Write-Host "2. Precisa fazer autenticacao (token GitHub)" -ForegroundColor Yellow
    Write-Host "3. Branch protegida (precisa de PR)" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Solucao: Verifique suas permissoes no GitHub ou use um token de acesso pessoal." -ForegroundColor Cyan
    exit 1
}

Write-Host ""
Write-Host "Push concluido com sucesso!" -ForegroundColor Green
Write-Host "Repositorio: https://github.com/evituinnovatis/landing-page-innovatis" -ForegroundColor Cyan
Write-Host ""

