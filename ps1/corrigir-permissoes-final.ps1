# Script para corrigir permissões da chave SSH - Versão Agressiva
# Remove TODAS as permissões exceto do usuário atual

$keyPath = "hub-innovatis-keypair.pem"

if (-not (Test-Path $keyPath)) {
    Write-Host "Arquivo nao encontrado: $keyPath" -ForegroundColor Red
    exit 1
}

Write-Host "Corrigindo permissoes da chave SSH (versao agressiva)..." -ForegroundColor Yellow
Write-Host ""

# Obter usuário atual no formato correto
$currentUser = [System.Security.Principal.WindowsIdentity]::GetCurrent().Name
$currentUserSid = [System.Security.Principal.WindowsIdentity]::GetCurrent().User

Write-Host "Usuario atual: $currentUser" -ForegroundColor Gray
Write-Host "SID: $currentUserSid" -ForegroundColor Gray
Write-Host ""

# Obter ACL atual
$acl = Get-Acl $keyPath

# Criar nova ACL vazia
$newAcl = New-Object System.Security.AccessControl.FileSecurity

# Adicionar APENAS o usuário atual com permissão de leitura
$fileAccessRule = New-Object System.Security.AccessControl.FileSystemAccessRule(
    $currentUserSid,
    "Read",
    "Allow"
)
$newAcl.SetAccessRule($fileAccessRule)

# Aplicar nova ACL
Set-Acl -Path $keyPath -AclObject $newAcl

# Verificar permissões finais
Write-Host "Permissoes finais:" -ForegroundColor Cyan
icacls $keyPath

Write-Host ""
Write-Host "Chave configurada!" -ForegroundColor Green
Write-Host ""
Write-Host "Teste a conexao:" -ForegroundColor Cyan
Write-Host "ssh -i hub-innovatis-keypair.pem -o StrictHostKeyChecking=no ec2-user@44.214.214.210" -ForegroundColor White
Write-Host ""

