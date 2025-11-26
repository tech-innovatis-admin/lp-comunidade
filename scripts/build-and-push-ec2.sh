#!/bin/bash
# Script para Build e Push da Imagem Docker ARM64
# Execute este script DENTRO da instância EC2 (44.214.214.210)
# Não precisa fazer build no seu PC local!

set -e

echo "🚀 Build e Push da Imagem Docker ARM64"
echo "========================================"

# Variáveis
ECR_REGISTRY="381491838120.dkr.ecr.us-east-1.amazonaws.com"
IMAGE_NAME="landing-comunidade-innovatis"
REGION="us-east-1"

# 1. Verificar se Docker está instalado
if ! command -v docker &> /dev/null; then
    echo "❌ Docker não está instalado. Instalando..."
    sudo yum update -y
    sudo yum install -y docker
    sudo systemctl start docker
    sudo systemctl enable docker
    sudo usermod -aG docker ec2-user
    echo "✅ Docker instalado. Faça logout e login novamente, depois execute este script novamente."
    exit 1
fi

# 2. Verificar se AWS CLI está instalado
if ! command -v aws &> /dev/null; then
    echo "❌ AWS CLI não está instalado. Instalando..."
    curl "https://awscli.amazonaws.com/awscli-bundle.zip" -o "awscli-bundle.zip"
    unzip awscli-bundle.zip
    sudo ./awscli-bundle/install -i /usr/local/aws -b /usr/local/bin/aws
    rm -rf awscli-bundle awscli-bundle.zip
    echo "✅ AWS CLI instalado"
fi

# 3. Login no ECR
echo "📦 Fazendo login no ECR..."
aws ecr get-login-password --region $REGION | docker login --username AWS --password-stdin $ECR_REGISTRY

# 4. Criar repositório ECR (se não existir)
echo "📋 Verificando repositório ECR..."
aws ecr describe-repositories --repository-names $IMAGE_NAME --region $REGION 2>/dev/null || \
aws ecr create-repository --repository-name $IMAGE_NAME --region $REGION --image-scanning-configuration scanOnPush=true

# 5. Navegar para o diretório do projeto
# Assumindo que o código está em /home/ec2-user/landing-page-innovatis
PROJECT_DIR="/home/ec2-user/landing-page-innovatis"

if [ ! -d "$PROJECT_DIR" ]; then
    echo "❌ Diretório do projeto não encontrado: $PROJECT_DIR"
    echo "   Por favor, clone o repositório ou faça upload do código para este diretório."
    exit 1
fi

cd $PROJECT_DIR

# 6. Verificar se Dockerfile existe
if [ ! -f "Dockerfile" ]; then
    echo "❌ Dockerfile não encontrado no diretório do projeto!"
    exit 1
fi

# 7. Build da imagem ARM64 (nativo, já estamos em ARM64)
echo "🔨 Fazendo build da imagem ARM64..."
docker build \
    --platform linux/arm64 \
    -t $ECR_REGISTRY/$IMAGE_NAME:latest \
    -t $ECR_REGISTRY/$IMAGE_NAME:$(date +%Y%m%d-%H%M%S) \
    .

# 8. Push para ECR
echo "⬆️ Fazendo push para ECR..."
docker push $ECR_REGISTRY/$IMAGE_NAME:latest

# 9. Push da tag com timestamp também
LATEST_TAG=$(docker images $ECR_REGISTRY/$IMAGE_NAME --format "{{.Tag}}" | grep -v latest | head -1)
if [ ! -z "$LATEST_TAG" ]; then
    docker push $ECR_REGISTRY/$IMAGE_NAME:$LATEST_TAG
fi

echo ""
echo "✅ Build e Push concluídos com sucesso!"
echo "   Imagem: $ECR_REGISTRY/$IMAGE_NAME:latest"
echo ""
echo "📋 Próximos passos:"
echo "   1. Execute o script de deploy: ./scripts/deploy.sh"
echo "   2. Ou rode manualmente: docker pull $ECR_REGISTRY/$IMAGE_NAME:latest"

