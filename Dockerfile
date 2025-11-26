# Dockerfile para ARM64 (EC2 t4g)
# Build multi-stage para otimizar tamanho da imagem
# Landing Page Comunidade InnovaNation

# Stage 1: Build
FROM --platform=linux/arm64 node:20-alpine AS builder

WORKDIR /app

# Copia arquivos de dependências
COPY package*.json ./

# Instala dependências
RUN npm ci

# Copia código fonte
COPY . .

# Build da aplicação Next.js
RUN npm run build

# Stage 2: Runtime
FROM --platform=linux/arm64 node:20-alpine

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Porta configurável via variável de ambiente (padrão: 3001 para não conflitar com app existente)
ENV PORT=3001

# Instala dependências de produção + TypeScript (necessário para next.config.ts)
COPY package*.json ./
RUN npm ci --omit=dev && npm install typescript --save-prod

# Copia arquivos buildados do stage anterior
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/next.config.ts ./
COPY --from=builder /app/lib ./lib

# Expõe porta (será definida via ENV no runtime)
EXPOSE 3001

# Comando para iniciar a aplicação na porta definida
CMD ["sh", "-c", "npm start -- -p $PORT"]

