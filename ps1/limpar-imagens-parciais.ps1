# Script para limpar imagens Docker parciais/intermediarias
# Execute se cancelou o build no meio do processo

Write-Host "Limpando imagens Docker parciais..." -ForegroundColor Yellow
Write-Host ""

# Ver imagens relacionadas ao projeto
Write-Host "Imagens relacionadas ao projeto:" -ForegroundColor Cyan
docker images | Select-String "landing-comunidade"

Write-Host ""
Write-Host "Imagens intermediarias (buildx):" -ForegroundColor Cyan
docker images --filter "dangling=true"

Write-Host ""
$confirm = Read-Host "Deseja remover imagens intermediarias e relacionadas ao projeto? (S/N)"

if ($confirm -eq "S" -or $confirm -eq "s") {
    Write-Host "Removendo imagens intermediarias..." -ForegroundColor Gray
    docker image prune -f
    
    Write-Host "Removendo imagens do projeto..." -ForegroundColor Gray
    docker images | Select-String "landing-comunidade" | ForEach-Object {
        $imageId = ($_ -split '\s+')[2]
        if ($imageId -ne "IMAGE") {
            docker rmi $imageId -f 2>&1 | Out-Null
        }
    }
    
    Write-Host "Limpeza concluida!" -ForegroundColor Green
} else {
    Write-Host "Limpeza cancelada." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Voce pode executar o build novamente:" -ForegroundColor Cyan
Write-Host ".\build-e-push-local.ps1" -ForegroundColor White
Write-Host ""

