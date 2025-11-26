#!/bin/bash
# Script de Setup Inicial para Build no EC2
# Execute este script UMA VEZ para configurar o ambiente

set -e

echo "🔧 Setup do Ambiente de Build no EC2"
echo "====================================="

# 1. Atualizar sistema
echo "📦 Atualizando sistema..."
sudo yum update -y

# 2. Instalar Docker
echo "🐳 Instalando Docker..."
sudo yum install -y docker
sudo systemctl start docker
sudo systemctl enable docker
sudo usermod -aG docker ec2-user

# 3. Instalar Git (para clonar repositório)
echo "📥 Instalando Git..."
sudo yum install -y git

# 4. Instalar AWS CLI v2
echo "☁️ Instalando AWS CLI..."
if ! command -v aws &> /dev/null; then
    cd /tmp
    curl "https://awscli.amazonaws.com/awscli-exe-linux-aarch64.zip" -o "awscliv2.zip"
    unzip awscliv2.zip
    sudo ./aws/install
    rm -rf aws awscliv2.zip
fi

# 5. Instalar unzip (necessário para alguns pacotes)
echo "📦 Instalando unzip..."
sudo yum install -y unzip

# 6. Criar diretório do projeto
PROJECT_DIR="/home/ec2-user/landing-page-innovatis"
if [ ! -d "$PROJECT_DIR" ]; then
    echo "📁 Criando diretório do projeto..."
    mkdir -p $PROJECT_DIR
fi

echo ""
echo "✅ Setup concluído!"
echo ""
echo "📋 Próximos passos:"
echo "   1. Faça LOGOUT e LOGIN novamente (para aplicar grupo docker)"
echo "   2. Clone o repositório ou faça upload do código para: $PROJECT_DIR"
echo "   3. Execute: cd $PROJECT_DIR && chmod +x scripts/*.sh"
echo "   4. Execute: ./scripts/build-and-push-ec2.sh"

