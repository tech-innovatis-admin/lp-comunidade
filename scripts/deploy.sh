#!/bin/bash
# Script de Deploy - Landing Page Comunidade InnovaNation
# Execute este script no EC2 para fazer deploy

set -e

echo "🚀 Deploy Landing Page Comunidade InnovaNation"
echo "================================================"

# Variáveis
# Detectar registry ID automaticamente da conta AWS
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text | tr -d '\r\n')
ECR_REGISTRY="${AWS_ACCOUNT_ID}.dkr.ecr.us-east-1.amazonaws.com"
IMAGE_NAME="landing-comunidade-innovatis"
CONTAINER_NAME="landing-comunidade"
PORT=3001

echo "Conta AWS: $AWS_ACCOUNT_ID"
echo "ECR Registry: $ECR_REGISTRY"
echo ""

# 1. Login no ECR
echo "📦 Fazendo login no ECR..."
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin $ECR_REGISTRY

# 2. Pull da imagem mais recente
echo "⬇️ Baixando imagem mais recente..."
docker pull $ECR_REGISTRY/$IMAGE_NAME:latest

# 3. Parar container antigo
echo "🛑 Parando container antigo (se existir)..."
docker stop $CONTAINER_NAME 2>/dev/null || true
docker rm $CONTAINER_NAME 2>/dev/null || true

# 4. Verificar se arquivo de env existe
if [ ! -f "/home/ec2-user/landing-comunidade.env" ]; then
    echo "❌ Arquivo /home/ec2-user/landing-comunidade.env não encontrado!"
    echo "   Crie o arquivo com as variáveis de ambiente antes de continuar."
    exit 1
fi

# 5. Rodar novo container
echo "🐳 Iniciando novo container na porta $PORT..."
docker run -d \
    --name $CONTAINER_NAME \
    --restart unless-stopped \
    --env-file /home/ec2-user/landing-comunidade.env \
    -p $PORT:$PORT \
    $ECR_REGISTRY/$IMAGE_NAME:latest

# 6. Aguardar inicialização
echo "⏳ Aguardando inicialização (30s)..."
sleep 30

# 7. Health check
echo "🏥 Verificando saúde da aplicação..."
if curl -s http://localhost:$PORT/api/health | grep -q "ok"; then
    echo "✅ Aplicação rodando com sucesso na porta $PORT!"
else
    echo "⚠️ Health check falhou. Verificando logs..."
    docker logs --tail 50 $CONTAINER_NAME
fi

# 8. Status final
echo ""
echo "📊 Status dos containers:"
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

echo ""
echo "🎉 Deploy concluído!"
echo "   Acesse: http://44.214.214.210:$PORT"
echo "   Após configurar DNS: https://comunidade.innovatismc.com"

