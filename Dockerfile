# syntax=docker/dockerfile:1.7

############################
# 1) deps (instala deps com cache)
############################
FROM node:20-alpine AS deps
WORKDIR /app

RUN apk add --no-cache libc6-compat

COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm \
    npm ci

############################
# 2) builder (build Next standalone)
############################
FROM node:20-alpine AS builder
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN apk add --no-cache libc6-compat

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN --mount=type=cache,target=/root/.npm \
    npm run build

############################
# 3) runner (mínimo, seguro)
############################
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3001

# Usuário não-root
RUN addgroup -S nodejs -g 1001 && adduser -S nextjs -u 1001 -G nodejs

# Copia SOMENTE o necessário do standalone
# - .next/standalone contém o servidor e node_modules mínimos
# - .next/static e public são assets
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# Permissões
RUN chown -R nextjs:nodejs /app
USER nextjs

EXPOSE 3001

# Healthcheck sem curl/wget (node fetch)
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3001)+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

# Standalone gera server.js na raiz do bundle
CMD ["node", "server.js"]