# ---- deps ----
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

# ---- build ----
FROM node:20-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# ---- runtime ----
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# Next usa 3000 por padrão
EXPOSE 3000

# Copia o necessário pra rodar
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/.next ./.next
COPY --from=build /app/public ./public
# Se você usa next.config.js, copie também:
COPY --from=build /app/next.config.* ./ 2>/dev/null || true

CMD ["npm", "run", "start", "--", "-p", "3000"]
