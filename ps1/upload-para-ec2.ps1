# Script para fazer upload do codigo para EC2
# Execute este script no PowerShell do seu PC

$EC2Host = "44.214.214.210"
$EC2User = "ec2-user"
$KeyName = "hub-innovatis-keypair.pem"
$RemotePath = "/home/ec2-user/landing-page-innovatis"

Write-Host "Fazendo upload do codigo para EC2..." -ForegroundColor Cyan
Write-Host ""

# Procurar a chave SSH em locais comuns
$KeyPath = $null
$searchPaths = @(
    ".\$KeyName",
    "..\$KeyName",
    "..\..\$KeyName",
    "$env:USERPROFILE\.ssh\$KeyName",
    "$env:USERPROFILE\Downloads\$KeyName",
    "$env:USERPROFILE\Desktop\$KeyName"
)

foreach ($path in $searchPaths) {
    if (Test-Path $path) {
        $KeyPath = (Resolve-Path $path).Path
        Write-Host "Chave SSH encontrada em: $KeyPath" -ForegroundColor Green
        break
    }
}

# Se nao encontrou, pedir ao usuario
if (-not $KeyPath) {
    Write-Host "Chave SSH nao encontrada automaticamente." -ForegroundColor Yellow
    Write-Host "Por favor, informe o caminho completo da chave SSH:" -ForegroundColor Yellow
    $KeyPath = Read-Host "Caminho da chave (.pem)"
    
    if (-not (Test-Path $KeyPath)) {
        Write-Host "ERRO: Chave SSH nao encontrada: $KeyPath" -ForegroundColor Red
        exit 1
    }
    $KeyPath = (Resolve-Path $KeyPath).Path
}

# Criar diretorio remoto primeiro
Write-Host "Criando diretorio remoto..." -ForegroundColor Gray
ssh -i $KeyPath -o StrictHostKeyChecking=no "${EC2User}@${EC2Host}" "mkdir -p $RemotePath"

# Fazer upload dos arquivos
Write-Host "Fazendo upload dos arquivos..." -ForegroundColor Gray
Write-Host "   (Isso pode levar alguns minutos...)" -ForegroundColor Yellow
Write-Host ""

# Usar scp simples
Write-Host "   Enviando arquivos..." -ForegroundColor Gray
scp -i $KeyPath -o StrictHostKeyChecking=no -r * "${EC2User}@${EC2Host}:${RemotePath}/"

Write-Host ""
Write-Host "   Removendo arquivos desnecessarios no servidor..." -ForegroundColor Gray
ssh -i $KeyPath -o StrictHostKeyChecking=no "${EC2User}@${EC2Host}" "cd $RemotePath && rm -rf node_modules .next .git *.log .env.local 2>/dev/null || true"

Write-Host ""
Write-Host "Upload concluido!" -ForegroundColor Green
Write-Host ""
Write-Host "Proximos passos:" -ForegroundColor Cyan
Write-Host "   1. Conecte no EC2: ssh -i $KeyPath ${EC2User}@${EC2Host}" -ForegroundColor White
Write-Host "   2. Execute: cd $RemotePath" -ForegroundColor White
Write-Host "   3. Execute: ls -la" -ForegroundColor White
Write-Host "   4. Continue com os proximos passos do deploy" -ForegroundColor White
Write-Host ""
