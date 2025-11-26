# Script para Build Local e Push para ECR
# Build multiplataforma ARM64 e push direto para ECR
# Nao precisa fazer upload do codigo para EC2!

$IMAGE_NAME = "landing-comunidade-innovatis"
$REGION = "us-east-1"

Write-Host "Build e Push da Imagem Docker ARM64" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

# Detectar registry ID automaticamente da conta AWS atual
Write-Host "Detectando conta AWS..." -ForegroundColor Gray
$AWS_ACCOUNT_ID = (aws sts get-caller-identity --query Account --output text).Trim()
if (-not $AWS_ACCOUNT_ID) {
    Write-Host "ERRO: Nao foi possivel detectar a conta AWS!" -ForegroundColor Red
    Write-Host "Verifique se o AWS CLI esta configurado corretamente." -ForegroundColor Yellow
    exit 1
}

$ECR_REGISTRY = "${AWS_ACCOUNT_ID}.dkr.ecr.us-east-1.amazonaws.com"
$FULL_IMAGE_NAME = "${ECR_REGISTRY}/${IMAGE_NAME}:latest"

Write-Host "Conta AWS: $AWS_ACCOUNT_ID" -ForegroundColor Green
Write-Host "ECR Registry: $ECR_REGISTRY" -ForegroundColor Green
Write-Host ""

# 1. Verificar se Docker esta instalado
if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    Write-Host "ERRO: Docker nao esta instalado!" -ForegroundColor Red
    exit 1
}

Write-Host "Docker encontrado: $(docker --version)" -ForegroundColor Green
Write-Host ""

# 2. Verificar se AWS CLI esta instalado
if (-not (Get-Command aws -ErrorAction SilentlyContinue)) {
    Write-Host "ERRO: AWS CLI nao esta instalado!" -ForegroundColor Red
    Write-Host "Instale: https://aws.amazon.com/cli/" -ForegroundColor Yellow
    exit 1
}

Write-Host "AWS CLI encontrado: $(aws --version)" -ForegroundColor Green
Write-Host ""

# 3. Verificar se Docker Buildx esta disponivel
Write-Host "Verificando Docker Buildx..." -ForegroundColor Gray
docker buildx version 2>&1 | Out-Null
if ($LASTEXITCODE -ne 0) {
    Write-Host "Docker Buildx nao encontrado. Criando builder..." -ForegroundColor Yellow
    docker buildx create --name multiplatform --use 2>&1 | Out-Null
    docker buildx inspect --bootstrap 2>&1 | Out-Null
}

Write-Host "Docker Buildx OK" -ForegroundColor Green
Write-Host ""

# 4. Login no ECR
Write-Host "Fazendo login no ECR..." -ForegroundColor Gray
$loginPassword = aws ecr get-login-password --region $REGION
$loginPassword | docker login --username AWS --password-stdin $ECR_REGISTRY

if ($LASTEXITCODE -ne 0) {
    Write-Host "ERRO: Falha ao fazer login no ECR!" -ForegroundColor Red
    exit 1
}

Write-Host "Login no ECR OK" -ForegroundColor Green
Write-Host ""

# 5. Criar repositorio ECR (se nao existir)
Write-Host "Verificando repositorio ECR..." -ForegroundColor Gray
$repoExists = aws ecr describe-repositories --repository-names $IMAGE_NAME --region $REGION 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "Criando repositorio ECR..." -ForegroundColor Yellow
    aws ecr create-repository --repository-name $IMAGE_NAME --region $REGION --image-scanning-configuration scanOnPush=true
    Write-Host "Repositorio criado!" -ForegroundColor Green
} else {
    Write-Host "Repositorio ja existe" -ForegroundColor Green
}
Write-Host ""

# 6. Verificar se Dockerfile existe
if (-not (Test-Path "Dockerfile")) {
    Write-Host "ERRO: Dockerfile nao encontrado!" -ForegroundColor Red
    exit 1
}

# 7. Build multiplataforma ARM64 e push direto para ECR
Write-Host "Fazendo build ARM64 e push para ECR..." -ForegroundColor Cyan
Write-Host "   (Isso pode levar 5-10 minutos...)" -ForegroundColor Yellow
Write-Host ""

docker buildx build `
    --platform linux/arm64 `
    --tag $FULL_IMAGE_NAME `
    --tag "${ECR_REGISTRY}/${IMAGE_NAME}:$(Get-Date -Format 'yyyyMMdd-HHmmss')" `
    --push `
    --progress=plain `
    .

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "ERRO: Build ou push falhou!" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Build e Push concluidos com sucesso!" -ForegroundColor Green
Write-Host "   Imagem: $FULL_IMAGE_NAME" -ForegroundColor Cyan
Write-Host ""
Write-Host "Proximos passos:" -ForegroundColor Yellow
Write-Host "   1. Conecte no EC2: ssh -i hub-innovatis-keypair.pem ec2-user@44.214.214.210" -ForegroundColor White
Write-Host "   2. Execute o script de deploy: ./scripts/deploy.sh" -ForegroundColor White
Write-Host "   OU rode manualmente no EC2:" -ForegroundColor White
Write-Host "      docker pull $FULL_IMAGE_NAME" -ForegroundColor Gray
Write-Host "      docker run -d --name landing-comunidade --restart unless-stopped --env-file /home/ec2-user/landing-comunidade.env -p 3001:3001 $FULL_IMAGE_NAME" -ForegroundColor Gray
Write-Host ""

